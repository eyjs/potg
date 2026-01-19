import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PlayerRole {
  TANK = 'TANK',
  DPS = 'DPS',
  SUPPORT = 'SUPPORT',
  FLEX = 'FLEX',
}

export enum SystemRole {
  OWNER = 'OWNER', // Super Admin, accesses all sub-groups
  ADMIN = 'ADMIN', // Group Admin
  MEMBER = 'MEMBER', // Regular User
  GUEST = 'GUEST', // External/Limited User
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  battleTag: string; // Overwatch BattleTag (Name#1234)

  @Column({ nullable: true })
  password?: string; // Optional for OAuth integration later

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.GUEST,
  })
  systemRole: SystemRole;

  @Column({
    type: 'enum',
    enum: PlayerRole,
    default: PlayerRole.FLEX,
  })
  mainRole: PlayerRole;

  @Column({ default: 0 })
  rating: number; // SR (Skill Rating) or Tier Score

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: 0 })
  auctionPoints: number; // Points available for auction captains

  @Column({ default: 0 })
  penaltyCount: number; // Track penalties for voting context

  // TODO: Add relationships
  // @OneToMany(() => Auction, auction => auction.creator)
  // hostedAuctions: Auction[];
}
