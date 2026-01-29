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
  BadRequestException,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto, PurchaseDto, PurchaseProfileItemDto } from './dto/shop.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';
import { ClanRoles } from '../../common/decorators/clan-roles.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ProfileItemCategory } from './entities/profile-item.entity';

import { UserRole } from '../users/entities/user.entity';
import { ClanRole } from '../clans/entities/clan-member.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @UseGuards(AuthGuard('jwt'), ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  @Post('products')
  createProduct(@Body() createProductDto: CreateProductDto) {
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
  @Roles(UserRole.ADMIN) // Or use ClanRoles.MASTER with clan-specific guard
  @Patch('purchases/:id/approve')
  approvePurchase(
    @Param('id') purchaseId: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.shopService.approvePurchase(purchaseId, adminNote);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
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

  // ==================== 프로필 아이템 ====================

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
  async getMyItems(
    @Request() req: AuthenticatedRequest,
    @Query('clanId') clanId: string,
  ) {
    const member = await this.getMemberByUserId(req.user.userId, clanId);
    if (!member) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.shopService.getMemberItems(member.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile-items/purchase')
  async purchaseProfileItem(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PurchaseProfileItemDto,
  ) {
    const member = await this.getMemberByUserId(req.user.userId, dto.clanId);
    if (!member) throw new BadRequestException('클랜 멤버가 아닙니다.');
    return this.shopService.purchaseProfileItem(member.id, dto.clanId, dto.itemId);
  }

  // 헬퍼: userId로 ClanMember 조회
  private async getMemberByUserId(userId: string, clanId: string): Promise<ClanMember | null> {
    // ShopService에 DataSource가 있으므로 직접 쿼리
    const result = await this.shopService['dataSource'].manager.findOne(ClanMember, {
      where: { userId, clanId },
    });
    return result;
  }
}
