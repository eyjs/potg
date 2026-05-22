import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BettingMarketType } from '../entities/betting-market.entity';

export class CreateMarketDto {
  @IsUUID()
  matchId: string;

  @IsEnum(BettingMarketType)
  type: BettingMarketType;

  /** Rake basis points 오버라이드 (기본값은 SystemConfig RAKE_BPS). */
  @IsOptional()
  @IsInt()
  @Min(0)
  rakeBps?: number;
}

export class PlaceStakeDto {
  /**
   * 베팅 옵션.
   * - WIN 마켓: teamId (uuid)
   * - RANK 마켓: "1" | "2" | "3" | "4"
   */
  @IsString()
  side: string;

  /** 정수 포인트. 문자열로 받아 bigint 변환. */
  @IsInt()
  @IsPositive()
  amount: number;
}

export class SettleMarketDto {
  /** WIN: 우승 teamId. RANK: placement 1~4 (사실상 winning_option 직접 지정). */
  @IsString()
  winningOption: string;
}
