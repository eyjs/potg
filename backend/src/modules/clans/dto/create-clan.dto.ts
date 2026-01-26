import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateClanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tag: string;

  @IsString()
  @IsOptional()
  description?: string;
}
