import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiarTopic } from './entities/liar-topic.entity';
import { GameRoom, GameRoomStatus } from './entities/game-room.entity';
import { GameRoomPlayer, PlayerStatus } from './entities/game-room-player.entity';

export enum LiarRole {
  LIAR = 'LIAR',
  CITIZEN = 'CITIZEN',
}

interface LiarGameState {
  liarId: string;
  topic: string;
  word: string;
  votes: Map<string, string>; // voterId -> targetId
  phase: 'DISCUSSION' | 'VOTING' | 'GUESSING' | 'ENDED';
  discussionEndTime?: number;
  voteEndTime?: number;
}

interface VoteResult {
  targetId: string;
  voteCount: number;
}

@Injectable()
export class LiarService {
  private readonly logger = new Logger(LiarService.name);
  private gameStates = new Map<string, LiarGameState>();

  constructor(
    @InjectRepository(LiarTopic)
    private liarTopicRepo: Repository<LiarTopic>,
    @InjectRepository(GameRoom)
    private gameRoomRepo: Repository<GameRoom>,
    @InjectRepository(GameRoomPlayer)
    private gameRoomPlayerRepo: Repository<GameRoomPlayer>,
  ) {}

  async initGame(roomId: string): Promise<{
    liarId: string;
    topic: string;
    word: string;
    roles: Array<{ memberId: string; role: LiarRole }>;
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

    if (players.length < 3) {
      throw new Error('Liar game requires at least 3 players');
    }

    // 주제/단어 선정
    const topicData = await this.getRandomTopic();

    // 라이어 선정 (랜덤)
    const liarIdx = Math.floor(Math.random() * players.length);
    const liarId = players[liarIdx].memberId;

    const state: LiarGameState = {
      liarId,
      topic: topicData.category,
      word: topicData.word,
      votes: new Map(),
      phase: 'DISCUSSION',
    };
    this.gameStates.set(roomId, state);

    // 역할 할당
    const roles = players.map((p) => ({
      memberId: p.memberId,
      role: p.memberId === liarId ? LiarRole.LIAR : LiarRole.CITIZEN,
    }));

    // DB 업데이트
    await this.gameRoomRepo.update(roomId, {
      status: GameRoomStatus.PLAYING,
      currentRound: 1,
      gameState: {
        liarId,
        topic: topicData.category,
        word: topicData.word,
        phase: 'DISCUSSION',
      },
    });

    // 플레이어 역할 저장
    for (const player of players) {
      await this.gameRoomPlayerRepo.update(
        { roomId, memberId: player.memberId },
        {
          status: PlayerStatus.PLAYING,
          role: player.memberId === liarId ? LiarRole.LIAR : LiarRole.CITIZEN,
        },
      );
    }

    // 사용 횟수 증가
    if (topicData.id) {
      await this.liarTopicRepo.increment({ id: topicData.id }, 'usageCount', 1);
    }

    return { liarId, topic: topicData.category, word: topicData.word, roles };
  }

  startDiscussion(roomId: string, durationMs: number): number {
    const state = this.gameStates.get(roomId);
    if (!state) throw new Error('Game not started');

    state.phase = 'DISCUSSION';
    state.discussionEndTime = Date.now() + durationMs;

    return state.discussionEndTime;
  }

  startVoting(roomId: string, durationMs: number): number {
    const state = this.gameStates.get(roomId);
    if (!state) throw new Error('Game not started');

    state.phase = 'VOTING';
    state.votes.clear();
    state.voteEndTime = Date.now() + durationMs;

    return state.voteEndTime;
  }

  async submitVote(
    roomId: string,
    voterId: string,
    targetId: string,
  ): Promise<{ success: boolean; allVoted: boolean }> {
    const state = this.gameStates.get(roomId);
    if (!state) {
      return { success: false, allVoted: false };
    }

    if (state.phase !== 'VOTING') {
      return { success: false, allVoted: false };
    }

    const room = await this.gameRoomRepo.findOne({
      where: { id: roomId },
      relations: ['players'],
    });

    if (!room) {
      return { success: false, allVoted: false };
    }

    const players = room.players.filter((p) => p.status === PlayerStatus.PLAYING);
    const isValidTarget = players.some((p) => p.memberId === targetId);

    if (!isValidTarget) {
      return { success: false, allVoted: false };
    }

    state.votes.set(voterId, targetId);

    const allVoted = state.votes.size >= players.length;

    return { success: true, allVoted };
  }

  async calculateVoteResult(roomId: string): Promise<{
    results: VoteResult[];
    mostVotedId: string;
    isLiar: boolean;
    liarId: string;
  }> {
    const state = this.gameStates.get(roomId);
    if (!state) {
      throw new Error('Game not started');
    }

    // 투표 집계
    const voteCount = new Map<string, number>();
    state.votes.forEach((targetId) => {
      voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
    });

    const results: VoteResult[] = Array.from(voteCount.entries())
      .map(([targetId, count]) => ({ targetId, voteCount: count }))
      .sort((a, b) => b.voteCount - a.voteCount);

    const mostVotedId = results[0]?.targetId || '';
    const isLiar = mostVotedId === state.liarId;

    return {
      results,
      mostVotedId,
      isLiar,
      liarId: state.liarId,
    };
  }

  startGuessing(roomId: string): void {
    const state = this.gameStates.get(roomId);
    if (!state) throw new Error('Game not started');

    state.phase = 'GUESSING';
  }

  async checkLiarGuess(
    roomId: string,
    guess: string,
  ): Promise<{ correct: boolean; actualWord: string }> {
    const state = this.gameStates.get(roomId);
    if (!state) {
      throw new Error('Game not started');
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = state.word.trim().toLowerCase();

    return {
      correct: normalizedGuess === normalizedWord,
      actualWord: state.word,
    };
  }

  async endGame(
    roomId: string,
    winnerId: string | null,
  ): Promise<void> {
    const state = this.gameStates.get(roomId);
    if (state) {
      state.phase = 'ENDED';
    }
    this.gameStates.delete(roomId);

    await this.gameRoomRepo.update(roomId, {
      status: GameRoomStatus.FINISHED,
    });

    await this.gameRoomPlayerRepo.update(
      { roomId },
      { status: PlayerStatus.WAITING, role: null },
    );
  }

  getState(roomId: string): LiarGameState | undefined {
    return this.gameStates.get(roomId);
  }

  private async getRandomTopic(): Promise<{ id?: string; category: string; word: string }> {
    const topic = await this.liarTopicRepo
      .createQueryBuilder('t')
      .where('t.isActive = true')
      .orderBy('RANDOM()')
      .limit(1)
      .getOne();

    if (!topic || topic.words.length === 0) {
      // 기본 주제
      return {
        category: '오버워치 영웅',
        word: '트레이서',
      };
    }

    const randomWord = topic.words[Math.floor(Math.random() * topic.words.length)];

    return {
      id: topic.id,
      category: topic.category,
      word: randomWord,
    };
  }
}
