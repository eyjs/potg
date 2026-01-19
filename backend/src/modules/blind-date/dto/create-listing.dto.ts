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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];
}
