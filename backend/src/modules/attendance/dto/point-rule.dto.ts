import { IsString, IsOptional, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { PointRuleCategory } from '../entities/point-rule.entity';

export class CreatePointRuleDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PointRuleCategory)
  category: PointRuleCategory;

  @IsInt()
  points: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePointRuleDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PointRuleCategory)
  category?: PointRuleCategory;

  @IsOptional()
  @IsInt()
  points?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
