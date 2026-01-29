import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { PostType, PostVisibility } from '../entities/post.entity';

export class CreatePostDto {
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @IsOptional()
  isPinned?: boolean;
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
