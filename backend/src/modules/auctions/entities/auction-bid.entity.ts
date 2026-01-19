import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Auction } from './auction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('auction_bids')
export class AuctionBid extends BaseEntity {
  @ManyToOne(() => Auction, (auction) => auction.bids)
  auction: Auction;

  @Column()
  auctionId: string;

  @ManyToOne(() => User)
  bidder: User; // The captain who placed the bid

  @Column()
  bidderId: string;

  @ManyToOne(() => User)
  targetPlayer: User; // The player being bid on

  @Column()
  targetPlayerId: string;

  @Column()
  amount: number;
}
