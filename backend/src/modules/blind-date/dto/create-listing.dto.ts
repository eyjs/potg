import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../entities/blind-date-listing.entity';
import { CreatePreferenceDto } from './create-preference.dto';

export class CreateListingDto {
  @IsString()
  clanId: string;

  @IsString()
  name: string;

  @IsInt()
  age: number;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  location: string;

  @IsString()
  job: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  idealType?: string;

  @IsString()
  @IsOptional()
  education?: string;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  mbti?: string;

  @IsBoolean()
  @IsOptional()
  smoking?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  contactInfo?: string;

  @ValidateNested()
  @Type(() => CreatePreferenceDto)
  @IsOptional()
  preference?: CreatePreferenceDto;
}

export class UpdateListingDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  job?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  idealType?: string;

  @IsString()
  @IsOptional()
  education?: string;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  mbti?: string;

  @IsBoolean()
  @IsOptional()
  smoking?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  contactInfo?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @ValidateNested()
  @Type(() => CreatePreferenceDto)
  @IsOptional()
  preference?: CreatePreferenceDto;
}
