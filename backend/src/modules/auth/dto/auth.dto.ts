import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { MainRole } from '../../users/entities/user.entity';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  battleTag: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsEnum(MainRole)
  @IsOptional()
  mainRole?: MainRole;

  @IsNumber()
  @IsOptional()
  rating?: number;
}
