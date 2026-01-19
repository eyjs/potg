import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ShopProduct } from './shop-product.entity';
import { User } from '../../users/entities/user.entity';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('shop_purchases')
export class ShopPurchase extends BaseEntity {
  @Column()
  productId: string;

  @Column()
  userId: string;

  @Column()
  clanId: string;

  @ManyToOne(() => ShopProduct)
  @JoinColumn({ name: 'productId' })
  product: ShopProduct;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  quantity: number;

  @Column()
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.PENDING,
  })
  status: PurchaseStatus;

  @Column({ nullable: true })
  adminNote: string;
}
