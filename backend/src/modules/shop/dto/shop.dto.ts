import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsPositive,
  Min,
} from 'class-validator';
import {
  ProductStatus,
  ProductCategory,
} from '../entities/shop-product.entity';

export class CreateProductDto {
  @IsUUID()
  clanId: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

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
  @IsNumber()
  @Min(0)
  purchaseLimit?: number;

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

export class PurchaseProfileItemDto {
  @IsUUID()
  clanId: string;

  @IsUUID()
  itemId: string;
}
