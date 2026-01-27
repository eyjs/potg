import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Scrim } from './scrim.entity';
import { User } from '../../users/entities/user.entity';

export enum ParticipantSource {
  VOTE = 'VOTE',
  AUCTION = 'AUCTION',
  MANUAL = 'MANUAL',
  SIGNUP = 'SIGNUP',
}

export enum ParticipantStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  BENCH = 'BENCH',
  DECLINED = 'DECLINED',
  REMOVED = 'REMOVED',
}

export enum AssignedTeam {
  TEAM_A = 'TEAM_A',
  TEAM_B = 'TEAM_B',
  BENCH = 'BENCH',
  UNASSIGNED = 'UNASSIGNED',
}

@Entity('scrim_participants')
export class ScrimParticipant extends BaseEntity {
  @Column()
  scrimId: string;

  @Column()
  userId: string;

  @ManyToOne(() => Scrim, (scrim) => scrim.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scrimId' })
  scrim: Scrim;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ParticipantSource,
    default: ParticipantSource.MANUAL,
  })
  source: ParticipantSource;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  @Column({
    type: 'enum',
    enum: AssignedTeam,
    default: AssignedTeam.UNASSIGNED,
  })
  assignedTeam: AssignedTeam;
}
