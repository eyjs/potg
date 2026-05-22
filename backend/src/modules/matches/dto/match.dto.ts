import {
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  captainId?: string;
}

export class SettleMatchDto {
  @IsUUID()
  winnerTeamId: string;

  /** { teamId: placement(1~4) } */
  @IsOptional()
  @IsObject()
  placements?: Record<string, number>;
}

export class PlacementDto {
  @IsInt()
  @Min(1)
  @Max(4)
  placement: number;
}
