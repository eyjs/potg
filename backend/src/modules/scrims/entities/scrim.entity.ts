import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ScrimMatch } from './scrim-match.entity';

export enum ScrimStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

@Entity('scrims')
export class Scrim extends BaseEntity {
  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: ScrimStatus,
    default: ScrimStatus.SCHEDULED,
  })
  status: ScrimStatus;

  @ManyToOne(() => User)
  host: User;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  teamSnapshot: any; // Store the final team composition (JSON for flexibility)

  @Column({ type: 'int', default: 0 })
  teamAScore: number;

  @Column({ type: 'int', default: 0 })
  teamBScore: number;

  @OneToMany(() => ScrimMatch, (match) => match.scrim)
  matches: ScrimMatch[];
}
