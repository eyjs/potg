import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsPositive,
  Min,
} from 'class-validator';
import { ProductStatus } from '../entities/shop-product.entity';

export class CreateProductDto {
  @IsUUID()
  clanId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class PurchaseDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;
}
