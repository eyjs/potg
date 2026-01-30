import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WordChainDict } from './entities/word-chain-dict.entity';
import { GameRoom, GameRoomStatus } from './entities/game-room.entity';
import { GameRoomPlayer, PlayerStatus } from './entities/game-room-player.entity';

interface WordChainState {
  currentWord: string;
  currentPlayerIdx: number;
  usedWords: string[];
  turnStartTime: number;
  turnTimeout?: NodeJS.Timeout;
}

@Injectable()
export class WordChainService {
  private readonly logger = new Logger(WordChainService.name);
  private gameStates = new Map<string, WordChainState>();

  constructor(
    @InjectRepository(WordChainDict)
    private wordChainDictRepo: Repository<WordChainDict>,
    @InjectRepository(GameRoom)
    private gameRoomRepo: Repository<GameRoom>,
    @InjectRepository(GameRoomPlayer)
    private gameRoomPlayerRepo: Repository<GameRoomPlayer>,
  ) {}

  async initGame(roomId: string): Promise<{ startWord: string; firstPlayerId: string }> {
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

    // 시작 단어 선정
    const startWord = await this.getRandomStartWord();

    const state: WordChainState = {
      currentWord: startWord.word,
      currentPlayerIdx: 0,
      usedWords: [startWord.word],
      turnStartTime: Date.now(),
    };
    this.gameStates.set(roomId, state);

    // 게임 상태 저장
    await this.gameRoomRepo.update(roomId, {
      status: GameRoomStatus.PLAYING,
      currentRound: 1,
      gameState: {
        currentWord: startWord.word,
        currentPlayerIdx: 0,
        usedWords: [startWord.word],
      },
    });

    // 플레이어 상태 업데이트
    await this.gameRoomPlayerRepo.update(
      { roomId },
      { status: PlayerStatus.PLAYING },
    );

    return {
      startWord: startWord.word,
      firstPlayerId: players[0].memberId,
    };
  }

  async submitWord(
    roomId: string,
    memberId: string,
    word: string,
  ): Promise<{
    valid: boolean;
    reason?: string;
    nextPlayerId?: string;
    word?: string;
  }> {
    const state = this.gameStates.get(roomId);
    if (!state) {
      return { valid: false, reason: 'Game not started' };
    }

    const room = await this.gameRoomRepo.findOne({
      where: { id: roomId },
      relations: ['players'],
    });

    if (!room) {
      return { valid: false, reason: 'Room not found' };
    }

    const players = room.players
      .filter((p) => p.status === PlayerStatus.PLAYING)
      .sort((a, b) => a.order - b.order);

    const currentPlayer = players[state.currentPlayerIdx];
    if (currentPlayer.memberId !== memberId) {
      return { valid: false, reason: 'Not your turn' };
    }

    // 단어 유효성 검사
    const validation = await this.validateWord(word, state);
    if (!validation.valid) {
      return validation;
    }

    // 단어 사용 기록
    state.usedWords.push(word);
    state.currentWord = word;
    state.currentPlayerIdx = (state.currentPlayerIdx + 1) % players.length;
    state.turnStartTime = Date.now();

    // DB 업데이트
    await this.gameRoomRepo.update(roomId, {
      gameState: {
        currentWord: word,
        currentPlayerIdx: state.currentPlayerIdx,
        usedWords: state.usedWords,
      },
    });

    // 사용 횟수 증가
    await this.wordChainDictRepo.increment({ word }, 'usageCount', 1);

    const nextPlayer = players[state.currentPlayerIdx];
    return {
      valid: true,
      word,
      nextPlayerId: nextPlayer.memberId,
    };
  }

  async validateWord(
    word: string,
    state: WordChainState,
  ): Promise<{ valid: boolean; reason?: string }> {
    const normalizedWord = word.trim().toLowerCase();

    // 끝글자 일치 검사 (두음법칙 적용)
    const lastChar = this.getLastChar(state.currentWord);
    const firstChar = this.getFirstChar(normalizedWord);
    const normalizedLastChar = this.normalizeFirstChar(lastChar);
    const normalizedFirstChar = this.normalizeFirstChar(firstChar);

    if (lastChar !== firstChar && normalizedLastChar !== normalizedFirstChar) {
      return {
        valid: false,
        reason: `'${lastChar}'(으)로 시작하는 단어를 입력해주세요`,
      };
    }

    // 중복 검사
    if (state.usedWords.includes(normalizedWord)) {
      return { valid: false, reason: '이미 사용된 단어입니다' };
    }

    // 사전 검사
    const exists = await this.wordChainDictRepo.findOne({
      where: { word: normalizedWord, isActive: true },
    });

    if (!exists) {
      return { valid: false, reason: '사전에 없는 단어입니다' };
    }

    return { valid: true };
  }

  async handleTimeout(roomId: string): Promise<{
    loserId: string;
    reason: string;
  } | null> {
    const state = this.gameStates.get(roomId);
    if (!state) return null;

    const room = await this.gameRoomRepo.findOne({
      where: { id: roomId },
      relations: ['players'],
    });

    if (!room) return null;

    const players = room.players
      .filter((p) => p.status === PlayerStatus.PLAYING)
      .sort((a, b) => a.order - b.order);

    const loser = players[state.currentPlayerIdx];

    return {
      loserId: loser.memberId,
      reason: '시간 초과',
    };
  }

  async endGame(roomId: string, loserId: string): Promise<void> {
    this.gameStates.delete(roomId);

    await this.gameRoomRepo.update(roomId, {
      status: GameRoomStatus.FINISHED,
    });

    await this.gameRoomPlayerRepo.update(
      { roomId },
      { status: PlayerStatus.WAITING },
    );
  }

  getState(roomId: string): WordChainState | undefined {
    return this.gameStates.get(roomId);
  }

  setTurnTimeout(roomId: string, timeout: NodeJS.Timeout): void {
    const state = this.gameStates.get(roomId);
    if (state) {
      state.turnTimeout = timeout;
    }
  }

  clearTurnTimeout(roomId: string): void {
    const state = this.gameStates.get(roomId);
    if (state?.turnTimeout) {
      clearTimeout(state.turnTimeout);
      state.turnTimeout = undefined;
    }
  }

  private async getRandomStartWord(): Promise<WordChainDict> {
    const words = await this.wordChainDictRepo
      .createQueryBuilder('w')
      .where('w.isActive = true')
      .orderBy('RANDOM()')
      .limit(1)
      .getOne();

    if (!words) {
      // 기본 시작 단어
      return {
        word: '오버워치',
        firstChar: '오',
        lastChar: '치',
      } as WordChainDict;
    }

    return words;
  }

  private getLastChar(word: string): string {
    return word.charAt(word.length - 1);
  }

  private getFirstChar(word: string): string {
    return word.charAt(0);
  }

  /**
   * 두음법칙 적용 - 첫 글자 정규화
   * 녀→여, 뇨→요, 뉴→유, 니→이, 랴→야, 려→여, 례→예, 료→요, 류→유, 리→이, 라→나, 래→내
   */
  private normalizeFirstChar(char: string): string {
    const duumMap: Record<string, string> = {
      '녀': '여',
      '뇨': '요',
      '뉴': '유',
      '니': '이',
      '랴': '야',
      '려': '여',
      '례': '예',
      '료': '요',
      '류': '유',
      '리': '이',
      '라': '나',
      '래': '내',
    };

    return duumMap[char] || char;
  }
}
