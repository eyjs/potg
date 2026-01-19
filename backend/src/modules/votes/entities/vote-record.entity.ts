import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Vote } from './vote.entity';
import { VoteOption } from './vote-option.entity';

@Entity('vote_records')
export class VoteRecord extends BaseEntity {
  @Column()
  voteId: string;

  @Column()
  userId: string;

  @Column()
  optionId: string;

  @ManyToOne(() => Vote)
  @JoinColumn({ name: 'voteId' })
  vote: Vote;

  @ManyToOne(() => VoteOption)
  @JoinColumn({ name: 'optionId' })
  option: VoteOption;
}
