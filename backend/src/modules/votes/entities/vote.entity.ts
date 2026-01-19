import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { VoteOption } from './vote-option.entity';

export enum VoteStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum ScrimType {
  NORMAL = 'NORMAL',
  AUCTION = 'AUCTION',
}

@Entity('votes')
export class Vote extends BaseEntity {
  @Column()
  clanId: string;

  @Column()
  creatorId: string;

  @Column()
  title: string;

  @Column()
  deadline: Date;

  @Column({ type: 'enum', enum: VoteStatus, default: VoteStatus.OPEN })
  status: VoteStatus;

  @Column({ type: 'enum', enum: ScrimType, default: ScrimType.NORMAL })
  scrimType: ScrimType;

  @Column({ default: false })
  multipleChoice: boolean;

  @Column({ default: false })
  anonymous: boolean;

  @OneToMany(() => VoteOption, (option) => option.vote, { cascade: true })
  options: VoteOption[];
}
