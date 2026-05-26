import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShopService } from './shop.service';
import {
  CreateProductDto,
  PurchaseDto,
  PurchaseProfileItemDto,
} from './dto/shop.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MarketGateGuard } from '../../common/guards/market-gate.guard';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ProfileItemCategory } from './entities/profile-item.entity';
import { UserRole } from '../users/entities/user.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  // ==================== 상품 ====================

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.shopService.createProduct(dto);
  }

  @Get('products')
  findAll() {
    return this.shopService.findAll();
  }

  // ==================== 마켓 주문 ====================

  /**
   * 즉시차감 구매.
   * MarketGateGuard: 출석 7일 + 내전 2회 이상 통과한 사용자만 진입.
   */
  @UseGuards(AuthGuard('jwt'), MarketGateGuard)
  @Post('purchase')
  purchase(@Body() dto: PurchaseDto, @Request() req: AuthenticatedRequest) {
    return this.shopService.purchase(
      req.user.userId,
      dto.productId,
      dto.quantity ?? 1,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('orders/:id/deliver')
  deliver(@Param('id') orderId: string, @Body('adminNote') adminNote?: string) {
    return this.shopService.markDelivered(orderId, adminNote);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('orders/:id/cancel')
  cancel(@Param('id') orderId: string, @Body('adminNote') adminNote?: string) {
    return this.shopService.cancelOrder(orderId, adminNote);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('orders/my')
  myOrders(@Request() req: AuthenticatedRequest) {
    return this.shopService.findOrdersByUser(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('orders')
  allOrders() {
    return this.shopService.findAllOrders();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-coupons')
  getMyCoupons(@Request() req: AuthenticatedRequest) {
    return this.shopService.getMyCoupons(req.user.userId);
  }

  // ==================== 프로필 아이템 (레거시) ====================

  @Get('profile-items')
  getProfileItems(@Query('category') category?: ProfileItemCategory) {
    return this.shopService.getProfileItems(category);
  }

  @Get('profile-items/:id')
  getProfileItem(@Param('id') id: string) {
    return this.shopService.getProfileItem(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-items')
  async getMyItems(@Request() req: AuthenticatedRequest) {
    const member = await this.getMemberByUserId(req.user.userId);
    if (!member) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.shopService.getMemberItems(member.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile-items/purchase')
  async purchaseProfileItem(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PurchaseProfileItemDto,
  ) {
    const member = await this.getMemberByUserId(req.user.userId);
    if (!member) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.shopService.purchaseProfileItem(member.id, dto.itemId);
  }

  private async getMemberByUserId(userId: string): Promise<ClanMember | null> {
    return this.shopService['dataSource'].manager.findOne(ClanMember, {
      where: { userId },
    });
  }
}
