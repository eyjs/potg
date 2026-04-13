import {
  IsString,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeamRankingDto {
  @IsUUID()
  teamCaptainId: string;

  @IsInt()
  @Min(1)
  @Max(4)
  rank: number;

  @IsInt()
  @Min(0)
  points: number;
}

export class CreateScrimResultDto {
  @IsUUID()
  auctionId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TeamRankingDto)
  rankings: TeamRankingDto[];
}
