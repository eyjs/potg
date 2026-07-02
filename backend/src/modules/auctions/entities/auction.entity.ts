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

/**
 * 로스터 구성 모드 — 팀 정원(감독/팀장 제외 확보 가능 선수 수)을 결정한다.
 * - CAPTAIN: 팀장이 로스터의 일원(플레이어). 팀장 포함 5명 → 확보 선수 4명.
 * - COACH: 팀장이 감독(코치)으로 로스터 외부. 팀당 선수 5명 정원.
 */
export enum RosterMode {
  CAPTAIN = 'CAPTAIN',
  COACH = 'COACH',
}

@Entity('auctions')
export class Auction extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.PENDING })
  status: AuctionStatus;

  @Column({ type: 'varchar', nullable: true })
  accessCode: string | null;

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

  @Column({
    name: 'roster_mode',
    type: 'enum',
    enum: RosterMode,
    default: RosterMode.CAPTAIN,
  })
  rosterMode: RosterMode;

  @Column({ type: 'varchar', nullable: true })
  currentBiddingPlayerId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  currentBiddingEndTime: Date | null;

  @Column({ type: 'enum', enum: BiddingPhase, default: BiddingPhase.WAITING })
  biddingPhase: BiddingPhase;

  @Column({ default: false })
  timerPaused: boolean;

  @Column({ type: 'int', nullable: true })
  pausedTimeRemaining: number | null; // seconds remaining when paused

  @Column({ type: 'varchar', nullable: true })
  linkedScrimId: string | null;

  @OneToMany(() => AuctionParticipant, (participant) => participant.auction)
  participants: AuctionParticipant[];

  @OneToMany(() => AuctionBid, (bid) => bid.auction)
  bids: AuctionBid[];
}
