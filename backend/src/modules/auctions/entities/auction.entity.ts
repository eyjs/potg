import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { AuctionParticipant } from './auction-participant.entity';
import { AuctionBid } from './auction-bid.entity';

export enum AuctionStatus {
  PENDING = 'PENDING',   // Waiting for players
  ONGOING = 'ONGOING',   // Bidding in progress
  COMPLETED = 'COMPLETED', // Teams finalized
  CANCELLED = 'CANCELLED',
}

@Entity('auctions')
export class Auction extends BaseEntity {
  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    default: AuctionStatus.PENDING,
  })
  status: AuctionStatus;

  @Column({ nullable: true })
  accessCode: string; // Private room code

  @ManyToOne(() => User)
  creator: User;

  @Column()
  creatorId: string;

  // Configuration for the auction
  @Column({ default: 1000 })
  startingPoints: number;

  @Column({ default: 60 })
  turnTimeLimit: number; // Seconds per turn

  @OneToMany(() => AuctionParticipant, (participant) => participant.auction)
  participants: AuctionParticipant[];

  @OneToMany(() => AuctionBid, (bid) => bid.auction)
  bids: AuctionBid[];
}
