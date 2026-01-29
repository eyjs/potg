import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  statusMessage?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  pinnedAchievements?: string[];
}

export class EquipItemsDto {
  @IsOptional()
  @IsString()
  themeId?: string;

  @IsOptional()
  @IsString()
  frameId?: string;

  @IsOptional()
  @IsString()
  petId?: string;

  @IsOptional()
  @IsString()
  bgmUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bgmTitle?: string;
}

export class CreateGuestbookDto {
  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}
