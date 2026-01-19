import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BlindDateRequest } from './blind-date-request.entity';

export enum ListingStatus {
  PRIVATE = 'PRIVATE',
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  CLOSED = 'CLOSED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

@Entity('blind_date_listings')
export class BlindDateListing extends BaseEntity {
  @Column()
  clanId: string;

  @Column()
  registerId: string; // User who registered this profile (Manager/Friend)

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.PRIVATE })
  status: ListingStatus;

  @Column()
  name: string;

  @Column()
  age: number;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column()
  location: string;

  @Column()
  job: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  photos: string[];

  @OneToMany(() => BlindDateRequest, (req) => req.listing)
  requests: BlindDateRequest[];
}
