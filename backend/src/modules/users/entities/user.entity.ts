import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum MainRole {
  TANK = 'TANK',
  DPS = 'DPS',
  SUPPORT = 'SUPPORT',
  FLEX = 'FLEX',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ unique: true }) // BattleTag should likely still be unique per Blizzard rules, or at least in our system
  battleTag: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true, select: false }) // Password should not be selected by default
  password?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: MainRole, default: MainRole.FLEX })
  mainRole: MainRole;

  @Column({ default: 1000 }) // Default rating
  rating: number;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: false })
  bettingFloatingEnabled: boolean;

  @OneToMany(() => ClanMember, (clanMember) => clanMember.user)
  clanMembers: ClanMember[];
}
