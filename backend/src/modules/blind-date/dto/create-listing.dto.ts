import { IsString, IsInt, IsEnum, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { Gender } from '../entities/blind-date-listing.entity';

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
}
