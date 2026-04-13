import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Auction } from '../../auctions/entities/auction.entity';
import { ScrimResultEntry } from './scrim-result-entry.entity';

export enum ScrimResultStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

@Entity('scrim_results')
export class ScrimResult extends BaseEntity {
  @Column({ unique: true })
  @Index()
  auctionId: string;

  @Column({
    type: 'enum',
    enum: ScrimResultStatus,
    default: ScrimResultStatus.DRAFT,
  })
  status: ScrimResultStatus;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  confirmedById: string | null;

  @ManyToOne(() => Auction)
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;

  @OneToMany(() => ScrimResultEntry, (entry) => entry.scrimResult, {
    cascade: true,
  })
  entries: ScrimResultEntry[];
}
