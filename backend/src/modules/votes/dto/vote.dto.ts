import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScrimType } from '../entities/vote.entity';

export class VoteOptionDto {
  @IsString()
  label: string;
}

export class CreateVoteDto {
  @IsUUID()
  clanId: string;

  @IsString()
  title: string;

  @IsDateString()
  deadline: string;

  @IsOptional()
  @IsEnum(ScrimType)
  scrimType?: ScrimType;

  @IsOptional()
  @IsBoolean()
  multipleChoice?: boolean;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoteOptionDto)
  options: VoteOptionDto[];
}

export class CastVoteDto {
  @IsUUID()
  optionId: string;
}
