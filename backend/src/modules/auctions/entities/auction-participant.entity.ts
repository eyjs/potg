import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
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
  @Column()
  auctionId: string;

  @Column()
  userId: string;

  @ManyToOne(() => Auction, (auction) => auction.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: AuctionRole, default: AuctionRole.SPECTATOR })
  role: AuctionRole;

  @Column({ default: 0 })
  currentPoints: number;

  @Column({ nullable: true })
  assignedTeamCaptainId: string | null;

  @Column({ default: 0 })
  soldPrice: number;

  @Column({ default: false })
  wasUnsold: boolean; // True if manually assigned after being unsold

  @Column({ default: 0 })
  biddingOrder: number; // Order in which this player was put up for auction
}
