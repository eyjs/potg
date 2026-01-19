import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Vote } from './vote.entity';

@Entity('vote_options')
export class VoteOption extends BaseEntity {
  @Column()
  voteId: string;

  @ManyToOne(() => Vote, (vote) => vote.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voteId' })
  vote: Vote;

  @Column()
  label: string;

  @Column({ default: 0 })
  count: number;
}
