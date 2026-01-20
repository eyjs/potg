import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ShopCoupon } from './shop-coupon.entity';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum ProductCategory {
  VOUCHER = 'VOUCHER',
  GOODS = 'GOODS',
  GAME_ITEM = 'GAME_ITEM',
  ETC = 'ETC',
}

@Entity('shop_products')
export class ShopProduct extends BaseEntity {
  @Column()
  clanId: string;

  @Column({ type: 'enum', enum: ProductCategory, default: ProductCategory.ETC })
  category: ProductCategory;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  price: number;

  @Column()
  stock: number;

  @Column({ default: 0 })
  purchaseLimit: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Column({ default: 0 })
  totalSold: number;

  @OneToMany(() => ShopCoupon, (coupon) => coupon.product)
  coupons: ShopCoupon[];
}
