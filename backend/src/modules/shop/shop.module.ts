import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShopProduct } from './entities/shop-product.entity';
import { ShopPurchase } from './entities/shop-purchase.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import { ProfileItem } from './entities/profile-item.entity';
import { MemberItem } from './entities/member-item.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopProduct,
      ShopPurchase,
      ShopCoupon,
      ProfileItem,
      MemberItem,
      ClanMember,
    ]),
  ],
  controllers: [ShopController],
  providers: [ShopService, ClanRolesGuard],
  exports: [ShopService],
})
export class ShopModule {}
