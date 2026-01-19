import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BettingQuestion, BettingAnswer } from './betting-question.entity';
import { User } from '../../users/entities/user.entity';

export enum TicketStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

@Entity('betting_tickets')
export class BettingTicket extends BaseEntity {
  @Column()
  questionId: string;

  @Column()
  userId: string;

  @ManyToOne(() => BettingQuestion, (question) => question.tickets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: BettingQuestion;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: BettingAnswer })
  prediction: BettingAnswer;

  @Column()
  betAmount: number;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.PENDING })
  status: TicketStatus;
}
