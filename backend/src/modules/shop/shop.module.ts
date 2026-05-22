import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShopProduct } from './entities/shop-product.entity';
import { MarketOrder } from './entities/market-order.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import { ProfileItem } from './entities/profile-item.entity';
import { MemberItem } from './entities/member-item.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { User } from '../users/entities/user.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';
import { MarketGateGuard } from '../../common/guards/market-gate.guard';
import { MarketGateModule } from '../../common/services/market-gate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopProduct,
      MarketOrder,
      ShopCoupon,
      ProfileItem,
      MemberItem,
      ClanMember,
      AttendanceRecord,
      User,
    ]),
    LedgerModule,
    SystemConfigModule,
    MarketGateModule,
  ],
  controllers: [ShopController],
  providers: [ShopService, ClanRolesGuard, MarketGateGuard],
  exports: [ShopService],
})
export class ShopModule {}
