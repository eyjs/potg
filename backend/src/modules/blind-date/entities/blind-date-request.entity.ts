import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BlindDateListing } from './blind-date-listing.entity';
import { User } from '../../users/entities/user.entity';

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('blind_date_requests')
export class BlindDateRequest extends BaseEntity {
  @Column()
  listingId: string;

  @Column()
  requesterId: string;

  @ManyToOne(() => BlindDateListing, (listing) => listing.requests)
  @JoinColumn({ name: 'listingId' })
  listing: BlindDateListing;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Column({ nullable: true })
  message: string;
}
