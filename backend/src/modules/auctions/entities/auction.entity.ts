import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuctionParticipant } from './auction-participant.entity';
import { AuctionBid } from './auction-bid.entity';

export enum AuctionStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('auctions')
export class Auction extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.PENDING })
  status: AuctionStatus;

  @Column({ nullable: true })
  accessCode: string;

  @Column()
  creatorId: string;

  @Column()
  startingPoints: number;

  @Column({ default: 60 })
  turnTimeLimit: number; // seconds

  @Column({ nullable: true })
  currentBiddingPlayerId: string;

  @Column({ type: 'timestamp', nullable: true })
  currentBiddingEndTime: Date;

  @OneToMany(() => AuctionParticipant, (participant) => participant.auction)
  participants: AuctionParticipant[];

  @OneToMany(() => AuctionBid, (bid) => bid.auction)
  bids: AuctionBid[];
}
