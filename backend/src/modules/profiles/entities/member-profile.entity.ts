import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';
import { Guestbook } from './guestbook.entity';
import { ProfileVisit } from './profile-visit.entity';

@Entity('member_profiles')
export class MemberProfile extends BaseEntity {
  @Column()
  @Index()
  memberId: string; // ClanMember.id (1:1 관계)

  @Column({ length: 50 })
  displayName: string; // 표시 이름

  @Column({ type: 'varchar', length: 140, nullable: true })
  bio: string; // 자기소개

  @Column({ type: 'varchar', length: 100, nullable: true })
  statusMessage: string; // 상태 메시지 "오늘도 용검 들고 갑니다"

  @Column({ type: 'varchar', length: 50, default: 'default' })
  themeId: string; // 적용된 테마 코드

  @Column({ type: 'varchar', nullable: true })
  bgmUrl: string; // 배경음악 URL

  @Column({ type: 'varchar', length: 100, nullable: true })
  bgmTitle: string; // BGM 제목

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string; // 아바타 이미지

  @Column({ type: 'varchar', length: 50, default: 'default' })
  frameId: string; // 프레임 코드

  @Column({ type: 'varchar', length: 50, nullable: true })
  petId: string; // 펫 코드

  @Column({ type: 'jsonb', default: [] })
  pinnedAchievements: string[]; // 고정 업적 ID 배열 (최대 5개)

  @Column({ type: 'int', default: 0 })
  todayVisitors: number;

  @Column({ type: 'int', default: 0 })
  totalVisitors: number;

  @Column({ type: 'int', default: 0 })
  followerCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  // Relations
  @OneToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;

  @OneToMany(() => Guestbook, (g) => g.profile)
  guestbooks: Guestbook[];

  @OneToMany(() => ProfileVisit, (v) => v.profile)
  visits: ProfileVisit[];
}
