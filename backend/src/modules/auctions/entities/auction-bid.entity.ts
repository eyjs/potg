import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Auction } from './auction.entity';

@Entity('auction_bids')
export class AuctionBid extends BaseEntity {
  @Column()
  auctionId: string;

  @Column()
  bidderId: string;

  @Column()
  targetPlayerId: string;

  @ManyToOne(() => Auction, (auction) => auction.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;

  @Column()
  amount: number;

  @Column({ default: true })
  isActive: boolean;
}
