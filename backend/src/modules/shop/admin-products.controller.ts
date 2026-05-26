import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ShopService } from './shop.service';
import { CreateProductDto } from './dto/shop.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopProduct, ProductStatus } from './entities/shop-product.entity';
import { NotFoundException } from '@nestjs/common';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('admin-products')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly shopService: ShopService,
    @InjectRepository(ShopProduct)
    private readonly productsRepo: Repository<ShopProduct>,
  ) {}

  @Get()
  @ApiOperation({ summary: '상품 전체 조회' })
  findAll() {
    return this.shopService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '상품 생성' })
  create(@Body() dto: CreateProductDto) {
    return this.shopService.createProduct(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '상품 부분 수정 (가격/재고/활성 등)' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.imageUrl !== undefined) product.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) {
      product.status = dto.isActive
        ? ProductStatus.ACTIVE
        : ProductStatus.INACTIVE;
    }

    return this.productsRepo.save(product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '상품 소프트 삭제 (INACTIVE)' })
  async remove(@Param('id') id: string) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    // Soft delete: INACTIVE 처리
    product.status = ProductStatus.INACTIVE;
    await this.productsRepo.save(product);
  }
}
