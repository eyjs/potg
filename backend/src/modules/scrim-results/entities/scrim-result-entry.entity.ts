import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ScrimResult } from './scrim-result.entity';
import { User } from '../../users/entities/user.entity';

@Entity('scrim_result_entries')
export class ScrimResultEntry extends BaseEntity {
  @Column()
  @Index()
  scrimResultId: string;

  @Column()
  userId: string;

  @Column()
  teamCaptainId: string;

  @Column({ type: 'int' })
  rank: number; // 1~4

  @Column({ type: 'int' })
  basePoints: number; // Admin-entered base points

  @Column({ type: 'int', default: 0 })
  earnedActivityPoints: number; // Actual activity points awarded

  @Column({ type: 'int', default: 0 })
  earnedScrimPoints: number; // Actual scrim points awarded

  @Column({ type: 'boolean', default: false })
  isCaptain: boolean;

  @ManyToOne(() => ScrimResult, (result) => result.entries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scrimResultId' })
  scrimResult: ScrimResult;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
