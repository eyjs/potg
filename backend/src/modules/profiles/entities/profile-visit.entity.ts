import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MemberProfile } from './member-profile.entity';

@Entity('profile_visits')
@Unique(['profileId', 'visitorId', 'visitDate'])
export class ProfileVisit extends BaseEntity {
  @Column()
  @Index()
  profileId: string;

  @Column({ nullable: true })
  visitorId: string; // null이면 비로그인 방문

  @Column({ type: 'date' })
  visitDate: Date;

  @ManyToOne(() => MemberProfile, (p) => p.visits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: MemberProfile;
}
