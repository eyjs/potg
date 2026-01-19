import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ShopCoupon } from './shop-coupon.entity';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

@Entity('shop_products')
export class ShopProduct extends BaseEntity {
  @Column()
  clanId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  price: number;

  @Column()
  stock: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Column({ default: 0 })
  totalSold: number;

  @OneToMany(() => ShopCoupon, (coupon) => coupon.product)
  coupons: ShopCoupon[];
}
