import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Clan } from './clan.entity';

export enum ClanRole {
  MASTER = 'MASTER', // Added MASTER based on descriptions (though ERD said MANAGER, usually MASTER exists)
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
}

@Entity('clan_members')
export class ClanMember extends BaseEntity {
  @Column()
  clanId: string;

  @Column()
  userId: string;

  @ManyToOne(() => Clan, (clan) => clan.members)
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @ManyToOne(() => User, (user) => user.clanMembers)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ClanRole, default: ClanRole.MEMBER })
  role: ClanRole;

  @Column({ default: 0 })
  totalPoints: number;

  @Column({ default: 0 })
  lockedPoints: number;

  @Column({ default: 0 })
  penaltyCount: number;
}
