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
  VOTE = 'VOTE',
  AUCTION = 'AUCTION',
  MANUAL = 'MANUAL',
}

@Entity('scrims')
export class Scrim extends BaseEntity {
  @Column({ nullable: true })
  clanId: string;

  @Column({ nullable: true })
  auctionId: string;

  @Column({ nullable: true })
  voteId: string;

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

  @Column({ type: 'jsonb', nullable: true })
  teamSnapshot: any;

  @Column({ default: 0 })
  teamAScore: number;

  @Column({ default: 0 })
  teamBScore: number;

  @OneToMany(() => ScrimParticipant, (participant) => participant.scrim)
  participants: ScrimParticipant[];

  @OneToMany(() => ScrimMatch, (match) => match.scrim)
  matches: ScrimMatch[];
}
