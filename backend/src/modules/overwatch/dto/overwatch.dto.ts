import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  IsEnum,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReplayResult } from '../entities/replay.entity';

export class SyncProfileDto {
  @IsOptional()
  @IsString()
  battleTag?: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

export class UpdateSyncSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;
}

export class GetStatsHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// Replay DTOs
// ============================================

export class CreateReplayDto {
  @IsString()
  @Matches(/^[A-Z0-9]{5,6}$/, { message: '리플레이 코드는 5-6자리 영문/숫자입니다' })
  code: string;

  @IsString()
  mapName: string;

  @IsOptional()
  @IsString()
  gamemode?: string;

  @IsArray()
  @IsString({ each: true })
  heroes: string[];

  @IsEnum(ReplayResult)
  result: ReplayResult;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateReplayDto {
  @IsOptional()
  @IsString()
  mapName?: string;

  @IsOptional()
  @IsString()
  gamemode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  heroes?: string[];

  @IsOptional()
  @IsEnum(ReplayResult)
  result?: ReplayResult;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class GetReplaysQueryDto {
  @IsOptional()
  @IsString()
  mapName?: string;

  @IsOptional()
  @IsEnum(ReplayResult)
  result?: ReplayResult;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
