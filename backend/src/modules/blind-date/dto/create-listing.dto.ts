import { IsString, IsInt, IsEnum, IsOptional, IsArray } from 'class-validator';
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
  mbti?: string;

  @IsString()
  @IsOptional()
  gameRole?: string;

  @IsString()
  @IsOptional()
  tier?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mostHeroes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];
}
