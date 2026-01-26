import { BettingAnswer, BettingStatus } from '../enums/betting.enum';
import { IsEnum, IsNumber, IsPositive, IsString, IsOptional, IsDateString, Min, IsIn } from 'class-validator';

export class CreateQuestionDto {
  @IsOptional()
  @IsString()
  scrimId?: string;

  @IsString()
  question: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  minBetAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1.01)
  rewardMultiplier?: number;

  @IsOptional()
  @IsDateString()
  bettingDeadline?: Date;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsNumber()
  @Min(1.01)
  rewardMultiplier?: number;

  @IsOptional()
  @IsDateString()
  bettingDeadline?: Date | null;

  @IsOptional()
  @IsIn([BettingStatus.CLOSED])
  status?: BettingStatus.CLOSED;
}

export class PlaceBetDto {
  @IsEnum(BettingAnswer)
  prediction: BettingAnswer;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  clanId: string;
}
