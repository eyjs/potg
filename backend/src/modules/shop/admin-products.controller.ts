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
  constructor(private readonly shopService: ShopService) {}

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
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.shopService.updateProduct(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '상품 소프트 삭제 (INACTIVE)' })
  remove(@Param('id') id: string) {
    return this.shopService.softDeleteProduct(id);
  }
}
