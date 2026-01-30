import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { QuizQuestion, QuizCategory, QuizDifficulty } from './entities/quiz-question.entity';
import { QuizMatch, QuizMatchStatus } from './entities/quiz-match.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { GameScore } from './entities/game-score.entity';
import { Game } from './entities/game.entity';
import { CreateQuestionDto, UpdateQuestionDto, CreateMatchDto } from './dto/quiz.dto';

export interface QuizRoundResult {
  round: number;
  questionId: string;
  player1Answer: number | null;
  player2Answer: number | null;
  player1Time: number | null;
  player2Time: number | null;
  correctIndex: number;
}

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  
  // 매칭 대기열 (clanId -> Set<memberId>)
  private matchingQueue = new Map<string, Set<string>>();
  
  // 진행 중인 매치 상태 (matchId -> state)
  private activeMatches = new Map<string, {
    currentQuestion: QuizQuestion | null;
    roundStartTime: number | null;
    player1Answered: boolean;
    player2Answered: boolean;
    roundTimeout: NodeJS.Timeout | null;
  }>();

  constructor(
    @InjectRepository(QuizQuestion)
    private questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizMatch)
    private matchRepo: Repository<QuizMatch>,
    @InjectRepository(ClanMember)
    private memberRepo: Repository<ClanMember>,
    @InjectRepository(GameScore)
    private scoreRepo: Repository<GameScore>,
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
    private dataSource: DataSource,
  ) {}

  // ==================== 문제 관리 ====================

  async getQuestions(options: {
    category?: QuizCategory;
    difficulty?: QuizDifficulty;
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  } = {}): Promise<{ questions: QuizQuestion[]; total: number }> {
    const { category, difficulty, limit = 50, offset = 0, includeInactive = false } = options;

    const query = this.questionRepo.createQueryBuilder('q');

    if (!includeInactive) {
      query.where('q.isActive = true');
    }

    if (category) {
      query.andWhere('q.category = :category', { category });
    }

    if (difficulty) {
      query.andWhere('q.difficulty = :difficulty', { difficulty });
    }

    const [questions, total] = await query
      .orderBy('q.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { questions, total };
  }

  async createQuestion(dto: CreateQuestionDto): Promise<QuizQuestion> {
    if (dto.options.length !== 4) {
      throw new BadRequestException('보기는 정확히 4개여야 합니다.');
    }

    const question = this.questionRepo.create(dto);
    return this.questionRepo.save(question);
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto): Promise<QuizQuestion> {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('문제를 찾을 수 없습니다.');

    if (dto.options && dto.options.length !== 4) {
      throw new BadRequestException('보기는 정확히 4개여야 합니다.');
    }

    Object.assign(question, dto);
    return this.questionRepo.save(question);
  }

  async deleteQuestion(id: string): Promise<void> {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('문제를 찾을 수 없습니다.');

    // Soft delete (비활성화)
    question.isActive = false;
    await this.questionRepo.save(question);
  }

  // ==================== 매칭 ====================

  async findOrCreateMatch(memberId: string, clanId: string, totalRounds: number = 5): Promise<QuizMatch> {
    // 이미 대기 중인 매치가 있는지 확인
    const existingMatch = await this.matchRepo.findOne({
      where: [
        { player1Id: memberId, status: QuizMatchStatus.MATCHING },
        { player2Id: memberId, status: QuizMatchStatus.MATCHING },
      ],
    });

    if (existingMatch) {
      return existingMatch;
    }

    // 대기 중인 다른 플레이어의 매치 찾기
    const waitingMatch = await this.matchRepo.findOne({
      where: {
        clanId,
        status: QuizMatchStatus.MATCHING,
        player1Id: Not(memberId),
        player2Id: null as unknown as undefined,
      },
      order: { createdAt: 'ASC' },
    });

    if (waitingMatch) {
      // 매칭 성공
      waitingMatch.player2Id = memberId;
      return this.matchRepo.save(waitingMatch);
    }

    // 새 매치 생성 (대기 상태)
    const match = this.matchRepo.create({
      clanId,
      player1Id: memberId,
      totalRounds,
      questionIds: [],
      roundResults: [],
    });

    return this.matchRepo.save(match);
  }

  async cancelMatching(memberId: string): Promise<void> {
    const match = await this.matchRepo.findOne({
      where: {
        player1Id: memberId,
        status: QuizMatchStatus.MATCHING,
        player2Id: null as unknown as undefined,
      },
    });

    if (match) {
      match.status = QuizMatchStatus.CANCELLED;
      await this.matchRepo.save(match);
    }
  }

  async getMatch(matchId: string): Promise<QuizMatch> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['player1', 'player1.user', 'player2', 'player2.user'],
    });

    if (!match) throw new NotFoundException('매치를 찾을 수 없습니다.');
    return match;
  }

  async getMyMatches(memberId: string, options: {
    status?: QuizMatchStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ matches: QuizMatch[]; total: number }> {
    const { status, limit = 20, offset = 0 } = options;

    const query = this.matchRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.player1', 'p1')
      .leftJoinAndSelect('p1.user', 'u1')
      .leftJoinAndSelect('m.player2', 'p2')
      .leftJoinAndSelect('p2.user', 'u2')
      .where('(m.player1Id = :memberId OR m.player2Id = :memberId)', { memberId });

    if (status) {
      query.andWhere('m.status = :status', { status });
    }

    const [matches, total] = await query
      .orderBy('m.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { matches, total };
  }

  // ==================== 게임 진행 ====================

  async startMatch(matchId: string): Promise<{ match: QuizMatch; questions: QuizQuestion[] }> {
    const match = await this.getMatch(matchId);

    if (match.status !== QuizMatchStatus.MATCHING) {
      throw new BadRequestException('이미 시작되었거나 종료된 매치입니다.');
    }

    if (!match.player2Id) {
      throw new BadRequestException('상대방이 아직 매칭되지 않았습니다.');
    }

    // 문제 선택 (랜덤, 난이도 혼합)
    const questions = await this.selectQuestions(match.totalRounds);

    match.questionIds = questions.map((q) => q.id);
    match.status = QuizMatchStatus.PLAYING;
    match.startedAt = new Date();
    match.currentRound = 0;
    match.roundResults = [];

    await this.matchRepo.save(match);

    // 매치 상태 초기화
    this.activeMatches.set(matchId, {
      currentQuestion: null,
      roundStartTime: null,
      player1Answered: false,
      player2Answered: false,
      roundTimeout: null,
    });

    return { match, questions };
  }

  async startNextRound(matchId: string): Promise<{ question: QuizQuestion; round: number } | null> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match || match.status !== QuizMatchStatus.PLAYING) {
      return null;
    }

    const nextRound = match.currentRound + 1;
    if (nextRound > match.totalRounds) {
      return null; // 모든 라운드 종료
    }

    const questionId = match.questionIds[nextRound - 1];
    const question = await this.questionRepo.findOne({ where: { id: questionId } });

    if (!question) {
      this.logger.error(`Question not found: ${questionId}`);
      return null;
    }

    match.currentRound = nextRound;
    await this.matchRepo.save(match);

    // 매치 상태 업데이트
    const state = this.activeMatches.get(matchId);
    if (state) {
      state.currentQuestion = question;
      state.roundStartTime = Date.now();
      state.player1Answered = false;
      state.player2Answered = false;
    }

    // 출제 횟수 증가
    await this.questionRepo.increment({ id: questionId }, 'usageCount', 1);

    return { question, round: nextRound };
  }

  async submitAnswer(
    matchId: string,
    memberId: string,
    round: number,
    answerIndex: number,
    timeMs: number,
  ): Promise<{
    bothAnswered: boolean;
    result?: QuizRoundResult;
  }> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match || match.status !== QuizMatchStatus.PLAYING) {
      throw new BadRequestException('진행 중인 매치가 아닙니다.');
    }

    if (match.currentRound !== round) {
      throw new BadRequestException('현재 라운드가 아닙니다.');
    }

    const isPlayer1 = match.player1Id === memberId;
    const isPlayer2 = match.player2Id === memberId;

    if (!isPlayer1 && !isPlayer2) {
      throw new BadRequestException('이 매치의 참가자가 아닙니다.');
    }

    // 현재 라운드 결과 찾기 또는 생성
    let roundResult = match.roundResults?.find((r) => r.round === round);
    if (!roundResult) {
      const question = await this.questionRepo.findOne({
        where: { id: match.questionIds[round - 1] },
      });
      roundResult = {
        round,
        questionId: match.questionIds[round - 1],
        player1Answer: null,
        player2Answer: null,
        player1Time: null,
        player2Time: null,
        correctIndex: question?.correctIndex ?? 0,
      };
      match.roundResults = [...(match.roundResults || []), roundResult];
    }

    // 이미 답변했는지 확인
    if (isPlayer1 && roundResult.player1Answer !== null) {
      throw new BadRequestException('이미 답변했습니다.');
    }
    if (isPlayer2 && roundResult.player2Answer !== null) {
      throw new BadRequestException('이미 답변했습니다.');
    }

    // 답변 기록
    if (isPlayer1) {
      roundResult.player1Answer = answerIndex;
      roundResult.player1Time = timeMs;
    } else {
      roundResult.player2Answer = answerIndex;
      roundResult.player2Time = timeMs;
    }

    // 점수 계산 (정답 시)
    const question = await this.questionRepo.findOne({
      where: { id: roundResult.questionId },
    });

    if (question && answerIndex === question.correctIndex) {
      // 정답 보너스: 빠를수록 더 많은 점수 (기본 100점, 시간 보너스 최대 50점)
      const timeBonus = Math.max(0, 50 - Math.floor(timeMs / 200));
      const points = 100 + timeBonus;

      if (isPlayer1) {
        match.player1Score += points;
      } else {
        match.player2Score += points;
      }

      // 정답률 업데이트
      await this.updateQuestionStats(question.id, true);
    } else if (question) {
      await this.updateQuestionStats(question.id, false);
    }

    // roundResults 배열 업데이트
    match.roundResults = match.roundResults.map((r) =>
      r.round === round ? roundResult! : r,
    );

    await this.matchRepo.save(match);

    // 양쪽 다 답변했는지 확인
    const bothAnswered =
      roundResult.player1Answer !== null && roundResult.player2Answer !== null;

    return { bothAnswered, result: roundResult };
  }

  async endRoundByTimeout(matchId: string, round: number): Promise<QuizRoundResult | null> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match || match.currentRound !== round) return null;

    const roundResult = match.roundResults?.find((r) => r.round === round);
    if (!roundResult) return null;

    // 미응답자 처리 (0점)
    await this.matchRepo.save(match);

    return roundResult;
  }

  async finishMatch(matchId: string): Promise<QuizMatch> {
    return this.dataSource.transaction(async (manager) => {
      const match = await manager.findOne(QuizMatch, {
        where: { id: matchId },
        relations: ['player1', 'player1.user', 'player2', 'player2.user'],
      });

      if (!match) throw new NotFoundException('매치를 찾을 수 없습니다.');

      // 승자 결정
      if (match.player1Score > match.player2Score) {
        match.winnerId = match.player1Id;
      } else if (match.player2Score > match.player1Score) {
        match.winnerId = match.player2Id;
      }
      // 무승부면 winnerId = null

      match.status = QuizMatchStatus.FINISHED;
      match.finishedAt = new Date();

      await manager.save(match);

      // 퀴즈 배틀 게임 찾기
      const game = await manager.findOne(Game, { where: { code: 'QUIZ_BATTLE' } });

      if (game) {
        // 양 플레이어 점수 기록
        const scores = [
          {
            gameId: game.id,
            memberId: match.player1Id,
            clanId: match.clanId,
            score: match.player1Score,
            metadata: {
              matchId,
              opponentId: match.player2Id,
              won: match.winnerId === match.player1Id,
              totalRounds: match.totalRounds,
            },
            pointsEarned: this.calculatePointReward(match, match.player1Id),
          },
          {
            gameId: game.id,
            memberId: match.player2Id,
            clanId: match.clanId,
            score: match.player2Score,
            metadata: {
              matchId,
              opponentId: match.player1Id,
              won: match.winnerId === match.player2Id,
              totalRounds: match.totalRounds,
            },
            pointsEarned: this.calculatePointReward(match, match.player2Id),
          },
        ];

        for (const scoreData of scores) {
          const score = manager.create(GameScore, scoreData);
          await manager.save(score);

          // 포인트 지급
          if (scoreData.pointsEarned > 0) {
            await manager.increment(
              ClanMember,
              { id: scoreData.memberId },
              'totalPoints',
              scoreData.pointsEarned,
            );
          }
        }

        // 게임 플레이 횟수 증가
        await manager.increment(Game, { id: game.id }, 'playCount', 1);
      }

      // 활성 매치 상태 정리
      this.activeMatches.delete(matchId);

      return match;
    });
  }

  // ==================== 헬퍼 ====================

  private async selectQuestions(count: number): Promise<QuizQuestion[]> {
    // 난이도 배분: EASY 2, NORMAL 2, HARD 1 (5라운드 기준)
    const easyCount = Math.max(1, Math.floor(count * 0.3));
    const hardCount = Math.max(1, Math.floor(count * 0.2));
    const normalCount = count - easyCount - hardCount;

    const questions: QuizQuestion[] = [];

    // 각 난이도별로 랜덤 선택
    const difficulties: { difficulty: QuizDifficulty; count: number }[] = [
      { difficulty: QuizDifficulty.EASY, count: easyCount },
      { difficulty: QuizDifficulty.NORMAL, count: normalCount },
      { difficulty: QuizDifficulty.HARD, count: hardCount },
    ];

    for (const { difficulty, count: needCount } of difficulties) {
      const selected = await this.questionRepo
        .createQueryBuilder('q')
        .where('q.isActive = true')
        .andWhere('q.difficulty = :difficulty', { difficulty })
        .orderBy('RANDOM()')
        .take(needCount)
        .getMany();

      questions.push(...selected);
    }

    // 부족하면 아무 난이도에서 추가
    if (questions.length < count) {
      const existingIds = questions.map((q) => q.id);
      const additional = await this.questionRepo
        .createQueryBuilder('q')
        .where('q.isActive = true')
        .andWhere('q.id NOT IN (:...ids)', { ids: existingIds.length ? existingIds : [''] })
        .orderBy('RANDOM()')
        .take(count - questions.length)
        .getMany();

      questions.push(...additional);
    }

    // 순서 섞기
    return questions.sort(() => Math.random() - 0.5);
  }

  private async updateQuestionStats(questionId: string, correct: boolean): Promise<void> {
    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) return;

    const newUsage = question.usageCount + 1;
    const currentCorrect = question.correctRate * (question.usageCount || 1);
    const newCorrectRate = (currentCorrect + (correct ? 1 : 0)) / newUsage;

    await this.questionRepo.update(questionId, {
      correctRate: newCorrectRate,
    });
  }

  private calculatePointReward(match: QuizMatch, memberId: string): number {
    const isWinner = match.winnerId === memberId;
    const isDraw = !match.winnerId;

    // 기본 참가 보상 + 승리 보상
    const baseReward = 10;
    const winBonus = 20;
    const drawBonus = 5;

    if (isWinner) {
      return baseReward + winBonus;
    } else if (isDraw) {
      return baseReward + drawBonus;
    }
    return baseReward;
  }

  getActiveMatchState(matchId: string) {
    return this.activeMatches.get(matchId);
  }

  setActiveMatchState(matchId: string, state: {
    currentQuestion: QuizQuestion | null;
    roundStartTime: number | null;
    player1Answered: boolean;
    player2Answered: boolean;
    roundTimeout: NodeJS.Timeout | null;
  }) {
    this.activeMatches.set(matchId, state);
  }

  clearRoundTimeout(matchId: string) {
    const state = this.activeMatches.get(matchId);
    if (state?.roundTimeout) {
      clearTimeout(state.roundTimeout);
      state.roundTimeout = null;
    }
  }
}
