import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto, PurchaseDto } from './dto/shop.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('products')
  createProduct(@Body() createProductDto: CreateProductDto) {
    // Should verify if user is Clan Master/Manager
    return this.shopService.createProduct(
      createProductDto,
      createProductDto.clanId,
    );
  }

  @Get('products')
  findAll(@Query('clanId') clanId: string) {
    return this.shopService.findAll(clanId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('purchase')
  purchase(
    @Body() purchaseDto: PurchaseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.shopService.purchase(
      req.user.userId,
      purchaseDto.productId,
      purchaseDto.quantity ?? 1,
    );
  }
}
