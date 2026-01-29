import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';
import { ProfileItem } from './profile-item.entity';

@Entity('member_items')
@Unique(['memberId', 'itemId'])
export class MemberItem extends BaseEntity {
  @Column()
  @Index()
  memberId: string;

  @Column()
  itemId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchasedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // 기간제 아이템

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;

  @ManyToOne(() => ProfileItem)
  @JoinColumn({ name: 'itemId' })
  item: ProfileItem;
}
