import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ScrimParticipant } from './scrim-participant.entity';
import { ScrimMatch } from './scrim-match.entity';

export enum ScrimStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum RecruitmentType {
  AUCTION = 'AUCTION',
  MANUAL = 'MANUAL',
  OPEN = 'OPEN',
}

@Entity('scrims')
export class Scrim extends BaseEntity {
  @Column({ nullable: true })
  clanId: string;

  @Column({ nullable: true })
  auctionId: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: ScrimStatus, default: ScrimStatus.DRAFT })
  status: ScrimStatus;

  @Column({
    type: 'enum',
    enum: RecruitmentType,
    default: RecruitmentType.MANUAL,
  })
  recruitmentType: RecruitmentType;

  @Column()
  hostId: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  signupDeadline: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkInStart: Date;

  @Column({ default: 6 })
  minPlayers: number;

  @Column({ default: 12 })
  maxPlayers: number;

  @Column({ type: 'jsonb', nullable: true })
  roleSlots: {
    tank: { min: number; max: number };
    dps: { min: number; max: number };
    support: { min: number; max: number };
  };

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  teamSnapshot: Record<string, unknown>;

  @Column({ default: 0 })
  teamAScore: number;

  @Column({ default: 0 })
  teamBScore: number;

  @OneToMany(() => ScrimParticipant, (participant) => participant.scrim)
  participants: ScrimParticipant[];

  @OneToMany(() => ScrimMatch, (match) => match.scrim)
  matches: ScrimMatch[];
}
