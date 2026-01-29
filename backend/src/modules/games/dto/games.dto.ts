import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';

// ==================== 점수 ====================

export class SubmitScoreDto {
  @IsString()
  gameCode: string;

  @IsNumber()
  score: number;

  @IsOptional()
  @IsNumber()
  time?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ==================== 방 ====================

export class CreateRoomDto {
  @IsString()
  gameCode: string;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(16)
  maxPlayers?: number;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class JoinRoomDto {
  @IsString()
  roomCode: string;
}

export class UpdateRoomSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(16)
  maxPlayers?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  totalRounds?: number;
}

// ==================== 퀴즈 ====================

export class SubmitQuizAnswerDto {
  @IsString()
  matchId: string;

  @IsNumber()
  @Min(0)
  @Max(3)
  answerIndex: number;

  @IsNumber()
  @Min(0)
  responseTime: number; // 밀리초
}

// ==================== 끝말잇기 ====================

export class SubmitWordDto {
  @IsString()
  word: string;
}

// ==================== 라이어게임 ====================

export class VoteLiarDto {
  @IsString()
  suspectId: string; // 의심 대상 memberId
}

export class GuessWordDto {
  @IsString()
  word: string; // 라이어의 정답 추측
}
