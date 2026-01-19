import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('products')
  createProduct(@Body() createProductDto: any, @Request() req) {
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
  purchase(@Body() body: any, @Request() req) {
    return this.shopService.purchase(
      req.user.userId,
      body.productId,
      body.quantity || 1,
    );
  }
}
