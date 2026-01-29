export enum GameType {
  SOLO = 'SOLO',
  PVP = 'PVP',
  PARTY = 'PARTY',
}

export interface Game {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: GameType;
  thumbnailUrl: string | null;
  minPlayers: number;
  maxPlayers: number;
  pointReward: number;
  isActive: boolean;
  playCount: number;
}

export interface GameScore {
  id: string;
  gameId: string;
  memberId: string;
  clanId: string;
  score: number;
  time: number | null;
  metadata: Record<string, unknown> | null;
  pointsEarned: number;
  createdAt: string;
  member?: {
    id: string;
    user: {
      battleTag: string;
      avatarUrl: string | null;
    };
  };
}

export interface LeaderboardEntry {
  rank: number;
  score: GameScore;
  member: {
    battleTag: string;
    avatarUrl: string | null;
  };
}

export enum GameRoomStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
}

export enum PlayerStatus {
  WAITING = 'WAITING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  SPECTATING = 'SPECTATING',
}

export interface GameRoom {
  id: string;
  gameId: string;
  clanId: string;
  hostId: string;
  code: string;
  status: GameRoomStatus;
  maxPlayers: number;
  isPrivate: boolean;
  settings: Record<string, unknown> | null;
  gameState: Record<string, unknown> | null;
  currentRound: number;
  totalRounds: number;
  game: Game;
  players: GameRoomPlayer[];
}

export interface GameRoomPlayer {
  id: string;
  roomId: string;
  memberId: string;
  status: PlayerStatus;
  score: number;
  order: number;
  role: string | null;
  isHost: boolean;
  member?: {
    id: string;
    user: {
      battleTag: string;
      avatarUrl: string | null;
    };
  };
}

// 퀴즈 관련
export enum QuizCategory {
  HERO = 'HERO',
  SKILL = 'SKILL',
  MAP = 'MAP',
  LORE = 'LORE',
  META = 'META',
  TRIVIA = 'TRIVIA',
}

export enum QuizDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

export enum QuizMatchStatus {
  MATCHING = 'MATCHING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  imageUrl: string | null;
}

export interface QuizMatch {
  id: string;
  clanId: string;
  player1Id: string;
  player2Id: string | null;
  status: QuizMatchStatus;
  player1Score: number;
  player2Score: number;
  currentRound: number;
  totalRounds: number;
  winnerId: string | null;
}
