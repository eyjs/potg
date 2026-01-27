import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ScrimStatus, RecruitmentType } from '../entities/scrim.entity';
import { ParticipantSource } from '../entities/scrim-participant.entity';

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
  @IsUUID()
  voteId?: string;

  @IsOptional()
  @IsEnum(RecruitmentType)
  recruitmentType?: RecruitmentType;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  signupDeadline?: string;
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
  teamSnapshot?: any;

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
