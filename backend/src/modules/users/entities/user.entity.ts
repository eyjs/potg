import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

export enum UserRole {
  USER = 'USER',
  CAPTAIN = 'CAPTAIN',
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
  nickname: string | null;

  @Column({ unique: true, nullable: true })
  battleTag?: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true, select: false }) // Password should not be selected by default
  password?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: MainRole, nullable: true })
  mainRole?: MainRole;

  @Column({ nullable: true }) // OverFastAPI 연동 후 실제 랭크 사용
  rating?: number;

  @Column({ nullable: true })
  avatarUrl: string | null;

  @Column({ default: false })
  bettingFloatingEnabled: boolean;

  // === Phase 1 (Discord refactor) 확장 ===

  /** Discord 사용자 ID — OAuth/봇 연동 유일 식별자. UNIQUE 제약. */
  @Column({ name: 'discord_id', unique: true, nullable: true })
  discordId?: string;

  /** PointTx 합의 캐시. 단일 클랜 전환 후 ClanMember.totalPoints를 대체할 전역 잔액. */
  @Column({ name: 'points_balance', type: 'bigint', default: 0 })
  pointsBalance: string;

  /** 마켓 게이트 통과 여부 (출석 7일 + 내전 2회 충족 시 true) */
  @Column({ name: 'market_gate_passed', default: false })
  marketGatePassed: boolean;

  @OneToMany(() => ClanMember, (clanMember) => clanMember.user)
  clanMembers: ClanMember[];
}
