import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MemberProfile } from './member-profile.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

@Entity('guestbooks')
export class Guestbook extends BaseEntity {
  @Column()
  @Index()
  profileId: string; // MemberProfile.id

  @Column()
  writerId: string; // ClanMember.id

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isSecret: boolean; // 비밀글

  @ManyToOne(() => MemberProfile, (p) => p.guestbooks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: MemberProfile;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'writerId' })
  writer: ClanMember;
}
