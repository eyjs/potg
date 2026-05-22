import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { BettingMarket } from './betting-market.entity';

export enum BettingStakeStatus {
  PLACED = 'PLACED',
  WON = 'WON',
  LOST = 'LOST',
  REFUNDED = 'REFUNDED',
}

/**
 * 패리뮤추얼 베팅 스테이크 (사용자 1인 + 마켓 1개 + 옵션 1개당 1 row).
 *
 * 동일 사용자가 같은 마켓의 같은 옵션에 추가 베팅하면 stake가 합산되도록
 * (marketId, userId, side) UNIQUE 제약을 둔다. 다른 옵션에 베팅하려면 새 row.
 *
 * `side` 값:
 *   - WIN 마켓: teamId (uuid 문자열)
 *   - RANK 마켓: "1" | "2" | "3" | "4" (placement)
 */
@Entity('betting_stakes')
@Index(['marketId'])
@Index(['userId'])
@Index(['marketId', 'side'])
export class BettingStake extends BaseEntity {
  @Column({ name: 'market_id', type: 'uuid' })
  marketId: string;

  @ManyToOne(() => BettingMarket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'market_id' })
  market: BettingMarket;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** WIN: teamId, RANK: placement(string "1"~"4"). */
  @Column({ length: 64 })
  side: string;

  /** 누적 베팅 금액 (정수, bigint). */
  @Column({ type: 'bigint' })
  stake: string;

  /** 정산 시 payout (당첨 시에만 채워짐). */
  @Column({ type: 'bigint', nullable: true })
  payout: string | null;

  @Column({
    type: 'enum',
    enum: BettingStakeStatus,
    default: BettingStakeStatus.PLACED,
  })
  status: BettingStakeStatus;
}
