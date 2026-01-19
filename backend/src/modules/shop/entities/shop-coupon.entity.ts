import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ShopProduct } from './shop-product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('shop_coupons')
export class ShopCoupon extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => ShopProduct, (product) => product.coupons)
  @JoinColumn({ name: 'productId' })
  product: ShopProduct;

  @Column({ unique: true })
  code: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ nullable: true })
  assignedToUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedToUserId' })
  assignedToUser: User;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;
}
