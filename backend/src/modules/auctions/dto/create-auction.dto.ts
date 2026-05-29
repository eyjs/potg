import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AuctionRole } from '../entities/auction-participant.entity';

export class CreateAuctionDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(1)
  startingPoints: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  turnTimeLimit?: number;

  @IsOptional()
  @IsString()
  accessCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(4)
  maxParticipants?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  teamCount?: number;
}

export class JoinAuctionDto {
  @IsEnum(AuctionRole)
  role: AuctionRole;
}

export class BidDto {
  @IsString()
  targetPlayerId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

/** 완료된 경매의 전체 참가자에게 지급할 1인당 정액 포인트. */
export class AuctionPayoutDto {
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amountPerUser: number;
}
