import {
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Gender } from '../entities/blind-date-listing.entity';
import { MinEducation } from '../entities/blind-date-preference.entity';

export class CreatePreferenceDto {
  @IsInt()
  @Min(18)
  @Max(99)
  @IsOptional()
  minAge?: number;

  @IsInt()
  @Min(18)
  @Max(99)
  @IsOptional()
  maxAge?: number;

  @IsEnum(Gender)
  @IsOptional()
  preferredGender?: Gender;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLocations?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredJobs?: string[];

  @IsEnum(MinEducation)
  @IsOptional()
  minEducation?: MinEducation;

  @IsInt()
  @Min(100)
  @Max(250)
  @IsOptional()
  minHeight?: number;

  @IsInt()
  @Min(100)
  @Max(250)
  @IsOptional()
  maxHeight?: number;
}
