import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { QuizCategory, QuizDifficulty } from '../entities/quiz-question.entity';

// ==================== 문제 관리 ====================

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @IsString({ each: true })
  options: string[]; // 4개

  @IsInt()
  @Min(0)
  @Max(3)
  correctIndex: number;

  @IsEnum(QuizCategory)
  category: QuizCategory;

  @IsEnum(QuizDifficulty)
  @IsOptional()
  difficulty?: QuizDifficulty = QuizDifficulty.NORMAL;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  explanation?: string;
}

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  question?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  @IsOptional()
  correctIndex?: number;

  @IsEnum(QuizCategory)
  @IsOptional()
  category?: QuizCategory;

  @IsEnum(QuizDifficulty)
  @IsOptional()
  difficulty?: QuizDifficulty;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==================== 매치 ====================

export class CreateMatchDto {
  @IsString()
  clanId: string;

  @IsInt()
  @Min(3)
  @Max(10)
  @IsOptional()
  totalRounds?: number = 5;
}

export class JoinMatchDto {
  @IsString()
  matchId: string;
}

export class SubmitAnswerDto {
  @IsString()
  matchId: string;

  @IsInt()
  round: number;

  @IsInt()
  @Min(0)
  @Max(3)
  answerIndex: number;

  @IsInt()
  @Min(0)
  timeMs: number; // 응답 시간 (ms)
}

// ==================== WebSocket 이벤트 ====================

export interface QuizMatchedEvent {
  matchId: string;
  opponent: {
    memberId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  totalRounds: number;
}

export interface QuizRoundStartEvent {
  round: number;
  question: {
    id: string;
    question: string;
    options: string[];
    category: QuizCategory;
    difficulty: QuizDifficulty;
    imageUrl?: string;
  };
  timeLimit: number; // ms
}

export interface QuizAnswerResultEvent {
  round: number;
  correctIndex: number;
  explanation?: string;
  player1: {
    answer: number | null;
    time: number | null;
    correct: boolean;
    pointsGained: number;
  };
  player2: {
    answer: number | null;
    time: number | null;
    correct: boolean;
    pointsGained: number;
  };
  scores: {
    player1Score: number;
    player2Score: number;
  };
}

export interface QuizMatchEndEvent {
  winnerId: string | null; // null이면 무승부
  winnerDisplayName?: string;
  finalScores: {
    player1Score: number;
    player2Score: number;
  };
  pointsEarned: number; // 획득 포인트
}

// ==================== 응답 ====================

export class QuizQuestionResponse {
  id: string;
  question: string;
  options: string[];
  category: QuizCategory;
  difficulty: QuizDifficulty;
  imageUrl?: string;
  // correctIndex는 제외 (정답 노출 방지)
}

export class QuizMatchResponse {
  id: string;
  clanId: string;
  status: string;
  player1: {
    memberId: string;
    displayName: string;
    avatarUrl?: string;
  } | null;
  player2: {
    memberId: string;
    displayName: string;
    avatarUrl?: string;
  } | null;
  player1Score: number;
  player2Score: number;
  currentRound: number;
  totalRounds: number;
  winnerId?: string;
  createdAt: Date;
}
