import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
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
