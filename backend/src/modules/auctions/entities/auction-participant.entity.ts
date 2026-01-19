import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Auction } from './auction.entity';
import { User } from '../../users/entities/user.entity';

export enum AuctionRole {
  CAPTAIN = 'CAPTAIN',
  PLAYER = 'PLAYER',
  SPECTATOR = 'SPECTATOR',
}

@Entity('auction_participants')
export class AuctionParticipant extends BaseEntity {
  @ManyToOne(() => Auction, (auction) => auction.participants)
  auction: Auction;

  @Column()
  auctionId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: AuctionRole,
    default: AuctionRole.PLAYER,
  })
  role: AuctionRole;

  @Column({ default: 0 })
  currentPoints: number; // For captains
}
