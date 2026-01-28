import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  IsInt,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScrimStatus, RecruitmentType } from '../entities/scrim.entity';
import { ParticipantSource } from '../entities/scrim-participant.entity';

class RoleSlotRange {
  @IsInt()
  @Min(0)
  min: number;

  @IsInt()
  @Min(0)
  max: number;
}

class RoleSlotsDto {
  @ValidateNested()
  @Type(() => RoleSlotRange)
  tank: RoleSlotRange;

  @ValidateNested()
  @Type(() => RoleSlotRange)
  dps: RoleSlotRange;

  @ValidateNested()
  @Type(() => RoleSlotRange)
  support: RoleSlotRange;
}

export class CreateScrimDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  clanId?: string;

  @IsOptional()
  @IsUUID()
  auctionId?: string;

  @IsOptional()
  @IsEnum(RecruitmentType)
  recruitmentType?: RecruitmentType;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  signupDeadline?: string;

  @IsOptional()
  @IsDateString()
  checkInStart?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  minPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  maxPlayers?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RoleSlotsDto)
  roleSlots?: RoleSlotsDto;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateScrimDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(ScrimStatus)
  status?: ScrimStatus;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  signupDeadline?: string;

  @IsOptional()
  @IsDateString()
  checkInStart?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  minPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  maxPlayers?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RoleSlotsDto)
  roleSlots?: RoleSlotsDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  teamSnapshot?: Record<string, unknown>;

  @IsOptional()
  teamAScore?: number;

  @IsOptional()
  teamBScore?: number;
}

export class AddParticipantDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(ParticipantSource)
  source?: ParticipantSource;
}

export class SignupScrimDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRoles?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMatchDto {
  @IsOptional()
  @IsString()
  mapName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  teamAScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  teamBScore?: number;

  @IsOptional()
  @IsString()
  screenshotUrl?: string;
}
