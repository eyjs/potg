import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto, PurchaseDto } from './dto/shop.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN') // Or use ClanRoles.MASTER with clan-specific guard
  @Patch('purchases/:id/approve')
  approvePurchase(
    @Param('id') purchaseId: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.shopService.approvePurchase(purchaseId, adminNote);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch('purchases/:id/reject')
  rejectPurchase(
    @Param('id') purchaseId: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.shopService.rejectPurchase(purchaseId, adminNote);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-coupons')
  getMyCoupons(@Request() req: AuthenticatedRequest) {
    return this.shopService.getMyCoupons(req.user.userId);
  }
}
