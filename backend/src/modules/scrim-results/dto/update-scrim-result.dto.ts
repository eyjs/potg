import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { TeamRankingDto } from './create-scrim-result.dto';

export class UpdateScrimResultDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TeamRankingDto)
  rankings: TeamRankingDto[];
}
