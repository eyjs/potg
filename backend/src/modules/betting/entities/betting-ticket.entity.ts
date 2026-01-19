import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BettingQuestion } from './betting-question.entity';
import { User } from '../../users/entities/user.entity';
import { BettingAnswer, TicketStatus } from '../enums/betting.enum';

@Entity('betting_tickets')
export class BettingTicket extends BaseEntity {
  @Column()
  questionId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  clanId: string;

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
