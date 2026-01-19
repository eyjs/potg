import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BettingTicket } from './betting-ticket.entity';

export enum BettingStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  SETTLED = 'SETTLED',
}

export enum BettingAnswer {
  O = 'O',
  X = 'X',
}

@Entity('betting_questions')
export class BettingQuestion extends BaseEntity {
  @Column({ nullable: true })
  scrimId: string;

  @Column()
  creatorId: string;

  @Column()
  question: string;

  @Column({ type: 'enum', enum: BettingStatus, default: BettingStatus.OPEN })
  status: BettingStatus;

  @Column({ type: 'enum', enum: BettingAnswer, nullable: true })
  correctAnswer: BettingAnswer;

  @Column({ type: 'timestamp', nullable: true })
  bettingDeadline: Date;

  @Column({ default: 100 })
  minBetAmount: number;

  @Column({ type: 'float', default: 2.0 })
  rewardMultiplier: number;

  @OneToMany(() => BettingTicket, (ticket) => ticket.question)
  tickets: BettingTicket[];
}
