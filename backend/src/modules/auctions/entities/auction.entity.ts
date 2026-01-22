import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuctionParticipant } from './auction-participant.entity';
import { AuctionBid } from './auction-bid.entity';

export enum AuctionStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  PAUSED = 'PAUSED',
  ASSIGNING = 'ASSIGNING', // Manual assignment phase for unsold players
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum BiddingPhase {
  WAITING = 'WAITING', // Waiting for master to select next player
  BIDDING = 'BIDDING', // Active bidding
  SOLD = 'SOLD', // Just sold, waiting for master to click "Next"
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

  @Column({ default: 20 })
  maxParticipants: number;

  @Column({ default: 2 })
  teamCount: number;

  @Column({ nullable: true })
  currentBiddingPlayerId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  currentBiddingEndTime: Date | null;

  @Column({ type: 'enum', enum: BiddingPhase, default: BiddingPhase.WAITING })
  biddingPhase: BiddingPhase;

  @Column({ default: false })
  timerPaused: boolean;

  @Column({ nullable: true })
  pausedTimeRemaining: number | null; // seconds remaining when paused

  @Column({ nullable: true })
  linkedScrimId: string;

  @OneToMany(() => AuctionParticipant, (participant) => participant.auction)
  participants: AuctionParticipant[];

  @OneToMany(() => AuctionBid, (bid) => bid.auction)
  bids: AuctionBid[];
}
