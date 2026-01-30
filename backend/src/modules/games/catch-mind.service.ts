import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatchMindWord, CatchMindDifficulty } from './entities/catch-mind-word.entity';
import { GameRoom, GameRoomStatus } from './entities/game-room.entity';
import { GameRoomPlayer, PlayerStatus } from './entities/game-room-player.entity';

interface CatchMindRound {
  round: number;
  drawerId: string;
  word: string;
  hint: string | null;
  guessedPlayers: Set<string>;
  roundStartTime: number;
}

interface CatchMindState {
  currentRound: CatchMindRound;
  totalRounds: number;
  scores: Map<string, number>;
  drawerOrder: string[];
  roundTimeout?: NodeJS.Timeout;
}

interface DrawData {
  type: 'start' | 'draw' | 'end' | 'clear';
  x?: number;
  y?: number;
  color?: string;
  lineWidth?: number;
}

@Injectable()
export class CatchMindService {
  private readonly logger = new Logger(CatchMindService.name);
  private gameStates = new Map<string, CatchMindState>();

  constructor(
    @InjectRepository(CatchMindWord)
    private catchMindWordRepo: Repository<CatchMindWord>,
    @InjectRepository(GameRoom)
    private gameRoomRepo: Repository<GameRoom>,
    @InjectRepository(GameRoomPlayer)
    private gameRoomPlayerRepo: Repository<GameRoomPlayer>,
  ) {}

  async initGame(roomId: string): Promise<{
    totalRounds: number;
    drawerOrder: string[];
  }> {
    const room = await this.gameRoomRepo.findOne({
      where: { id: roomId },
      relations: ['players', 'players.member', 'players.member.user'],
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const players = room.players
      .filter((p) => p.status === PlayerStatus.READY || p.status === PlayerStatus.PLAYING)
      .sort((a, b) => a.order - b.order);

    if (players.length < 2) {
      throw new Error('Not enough players');
    }

    // 출제자 순서 섞기
    const drawerOrder = this.shuffleArray(players.map((p) => p.memberId));
    const totalRounds = room.totalRounds || drawerOrder.length;

    const state: CatchMindState = {
      currentRound: {
        round: 0,
        drawerId: '',
        word: '',
        hint: null,
        guessedPlayers: new Set(),
        roundStartTime: 0,
      },
      totalRounds,
      scores: new Map(players.map((p) => [p.memberId, 0])),
      drawerOrder,
    };
    this.gameStates.set(roomId, state);

    // 게임 상태 저장
    await this.gameRoomRepo.update(roomId, {
      status: GameRoomStatus.PLAYING,
      currentRound: 0,
      totalRounds,
      gameState: {
        drawerOrder,
        scores: Object.fromEntries(state.scores),
      },
    });

    // 플레이어 상태 업데이트
    await this.gameRoomPlayerRepo.update(
      { roomId },
      { status: PlayerStatus.PLAYING, score: 0 },
    );

    return { totalRounds, drawerOrder };
  }

  async startNextRound(roomId: string): Promise<{
    round: number;
    drawerId: string;
    word: string;
    hint: string | null;
  } | null> {
    const state = this.gameStates.get(roomId);
    if (!state) return null;

    const nextRound = state.currentRound.round + 1;

    if (nextRound > state.totalRounds) {
      return null; // 게임 종료
    }

    // 단어 선정
    const wordData = await this.getRandomWord();

    // 출제자 순환
    const drawerIdx = (nextRound - 1) % state.drawerOrder.length;
    const drawerId = state.drawerOrder[drawerIdx];

    state.currentRound = {
      round: nextRound,
      drawerId,
      word: wordData.word,
      hint: wordData.hint,
      guessedPlayers: new Set(),
      roundStartTime: Date.now(),
    };

    // DB 업데이트
    await this.gameRoomRepo.update(roomId, {
      currentRound: nextRound,
      gameState: {
        drawerOrder: state.drawerOrder,
        scores: Object.fromEntries(state.scores),
        currentDrawerId: drawerId,
      },
    });

    // 사용 횟수 증가
    if (wordData.id) {
      await this.catchMindWordRepo.increment({ id: wordData.id }, 'usageCount', 1);
    }

    return {
      round: nextRound,
      drawerId,
      word: wordData.word,
      hint: wordData.hint,
    };
  }

  async checkGuess(
    roomId: string,
    guesserId: string,
    guess: string,
  ): Promise<{
    correct: boolean;
    alreadyGuessed: boolean;
    isDrawer: boolean;
    allGuessed: boolean;
    points?: number;
  }> {
    const state = this.gameStates.get(roomId);
    if (!state) {
      return { correct: false, alreadyGuessed: false, isDrawer: false, allGuessed: false };
    }

    const { currentRound, scores } = state;

    // 출제자는 맞출 수 없음
    if (guesserId === currentRound.drawerId) {
      return { correct: false, alreadyGuessed: false, isDrawer: true, allGuessed: false };
    }

    // 이미 맞춘 경우
    if (currentRound.guessedPlayers.has(guesserId)) {
      return { correct: false, alreadyGuessed: true, isDrawer: false, allGuessed: false };
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = currentRound.word.trim().toLowerCase();

    if (normalizedGuess !== normalizedWord) {
      return { correct: false, alreadyGuessed: false, isDrawer: false, allGuessed: false };
    }

    // 정답!
    currentRound.guessedPlayers.add(guesserId);

    // 점수 계산 (빨리 맞출수록 높은 점수)
    const elapsedTime = Date.now() - currentRound.roundStartTime;
    const basePoints = 100;
    const timeBonus = Math.max(0, 50 - Math.floor(elapsedTime / 1000));
    const orderBonus = Math.max(0, 30 - currentRound.guessedPlayers.size * 10);
    const points = basePoints + timeBonus + orderBonus;

    // 맞춘 사람 점수
    scores.set(guesserId, (scores.get(guesserId) || 0) + points);

    // 출제자 점수 (맞출 때마다 보너스)
    const drawerBonus = 20;
    scores.set(currentRound.drawerId, (scores.get(currentRound.drawerId) || 0) + drawerBonus);

    // 플레이어 점수 업데이트
    await this.gameRoomPlayerRepo.update(
      { roomId, memberId: guesserId },
      { score: scores.get(guesserId) },
    );
    await this.gameRoomPlayerRepo.update(
      { roomId, memberId: currentRound.drawerId },
      { score: scores.get(currentRound.drawerId) },
    );

    // 모두 맞췄는지 확인
    const room = await this.gameRoomRepo.findOne({
      where: { id: roomId },
      relations: ['players'],
    });

    const playingPlayers = room?.players.filter(
      (p) => p.status === PlayerStatus.PLAYING && p.memberId !== currentRound.drawerId,
    ) || [];

    const allGuessed = currentRound.guessedPlayers.size >= playingPlayers.length;

    return {
      correct: true,
      alreadyGuessed: false,
      isDrawer: false,
      allGuessed,
      points,
    };
  }

  async endRound(roomId: string): Promise<{
    word: string;
    guessedCount: number;
    scores: Array<{ memberId: string; score: number }>;
  }> {
    const state = this.gameStates.get(roomId);
    if (!state) {
      throw new Error('Game not started');
    }

    const { currentRound, scores } = state;

    return {
      word: currentRound.word,
      guessedCount: currentRound.guessedPlayers.size,
      scores: Array.from(scores.entries())
        .map(([memberId, score]) => ({ memberId, score }))
        .sort((a, b) => b.score - a.score),
    };
  }

  async endGame(roomId: string): Promise<{
    winner: { memberId: string; score: number } | null;
    rankings: Array<{ memberId: string; score: number }>;
  }> {
    const state = this.gameStates.get(roomId);
    if (!state) {
      throw new Error('Game not started');
    }

    const rankings = Array.from(state.scores.entries())
      .map(([memberId, score]) => ({ memberId, score }))
      .sort((a, b) => b.score - a.score);

    const winner = rankings[0] || null;

    this.gameStates.delete(roomId);

    await this.gameRoomRepo.update(roomId, {
      status: GameRoomStatus.FINISHED,
    });

    await this.gameRoomPlayerRepo.update(
      { roomId },
      { status: PlayerStatus.WAITING },
    );

    return { winner, rankings };
  }

  getState(roomId: string): CatchMindState | undefined {
    return this.gameStates.get(roomId);
  }

  getCurrentWord(roomId: string): string | undefined {
    const state = this.gameStates.get(roomId);
    return state?.currentRound.word;
  }

  getDrawerId(roomId: string): string | undefined {
    const state = this.gameStates.get(roomId);
    return state?.currentRound.drawerId;
  }

  setRoundTimeout(roomId: string, timeout: NodeJS.Timeout): void {
    const state = this.gameStates.get(roomId);
    if (state) {
      state.roundTimeout = timeout;
    }
  }

  clearRoundTimeout(roomId: string): void {
    const state = this.gameStates.get(roomId);
    if (state?.roundTimeout) {
      clearTimeout(state.roundTimeout);
      state.roundTimeout = undefined;
    }
  }

  private async getRandomWord(): Promise<{ id?: string; word: string; hint: string | null }> {
    const wordEntity = await this.catchMindWordRepo
      .createQueryBuilder('w')
      .where('w.isActive = true')
      .orderBy('RANDOM()')
      .limit(1)
      .getOne();

    if (!wordEntity) {
      // 기본 단어
      return {
        word: '겐지',
        hint: '오버워치 영웅',
      };
    }

    return {
      id: wordEntity.id,
      word: wordEntity.word,
      hint: wordEntity.hint,
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
