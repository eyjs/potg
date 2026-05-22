import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ShopProduct } from './shop-product.entity';
import { User } from '../../users/entities/user.entity';

/**
 * 마켓 주문 상태.
 *
 *  COMPLETED  → DELIVERED   (관리자가 실물 전달 마킹)
 *      │
 *      └─────► CANCELLED    (환불 + 재고 복구)
 *
 * 한글 라벨 (requirement.md §6.3):
 *   COMPLETED = 구매완료
 *   DELIVERED = 전달완료
 *   CANCELLED = 취소
 */
export enum MarketOrderStatus {
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Entity('market_orders')
@Index(['buyerId'])
@Index(['status'])
@Index(['productId'])
export class MarketOrder extends BaseEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ShopProduct)
  @JoinColumn({ name: 'product_id' })
  product: ShopProduct;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ type: 'int' })
  quantity: number;

  /** 주문 시점 단가. */
  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: string;

  /** unitPrice * quantity. */
  @Column({ name: 'total_price', type: 'bigint' })
  totalPrice: string;

  @Column({
    type: 'enum',
    enum: MarketOrderStatus,
    default: MarketOrderStatus.COMPLETED,
  })
  status: MarketOrderStatus;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;
}
