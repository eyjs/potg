import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShopProduct } from './entities/shop-product.entity';
import { ShopPurchase } from './entities/shop-purchase.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShopProduct, ShopPurchase, ShopCoupon])],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
