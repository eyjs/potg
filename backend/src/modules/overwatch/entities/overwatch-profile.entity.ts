import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('overwatch_profiles')
export class OverwatchProfile extends BaseEntity {
  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  battleTag: string;

  @Column({ default: 'pc' })
  platform: string;

  // 캐싱된 프로필 데이터
  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  namecard?: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ default: 0 })
  endorsementLevel: number;

  @Column({ default: 'public' })
  privacy: string;

  // 경쟁전 랭크 (jsonb)
  @Column({ type: 'jsonb', nullable: true })
  competitiveRank: Record<string, unknown>;

  // 플레이 통계 요약 (jsonb)
  @Column({ type: 'jsonb', nullable: true })
  statsSummary: Record<string, unknown>;

  // 가장 많이 플레이한 영웅 (jsonb)
  @Column({ type: 'jsonb', nullable: true })
  topHeroes: Record<string, unknown>;

  // 동기화 설정
  @Column({ default: true })
  autoSync: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @Column({ default: 'success' })
  lastSyncStatus: string;

  @Column({ nullable: true })
  lastSyncError?: string;

  @OneToMany(() => OverwatchStatsSnapshot, (snapshot) => snapshot.profile)
  snapshots: OverwatchStatsSnapshot[];
}

@Entity('overwatch_stats_snapshots')
export class OverwatchStatsSnapshot extends BaseEntity {
  @Column()
  profileId: string;

  @ManyToOne(() => OverwatchProfile, (profile) => profile.snapshots)
  @JoinColumn({ name: 'profileId' })
  profile: OverwatchProfile;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>;

  @Column({ type: 'timestamp' })
  snapshotDate: Date;
}
