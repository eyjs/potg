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

@Entity('follows')
@Unique(['followerId', 'followingId'])
export class Follow extends BaseEntity {
  @Column()
  @Index()
  followerId: string; // 팔로우 하는 사람

  @Column()
  @Index()
  followingId: string; // 팔로우 당하는 사람

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'followerId' })
  follower: ClanMember;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'followingId' })
  following: ClanMember;
}
