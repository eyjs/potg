import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BlindDateListing } from './blind-date-listing.entity';
import { Gender } from './blind-date-listing.entity';

export enum MinEducation {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  COLLEGE = 'COLLEGE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

@Entity('blind_date_preferences')
export class BlindDatePreference extends BaseEntity {
  @Column({ unique: true })
  listingId: string;

  @OneToOne(() => BlindDateListing)
  @JoinColumn({ name: 'listingId' })
  listing: BlindDateListing;

  @Column({ nullable: true })
  minAge: number;

  @Column({ nullable: true })
  maxAge: number;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  preferredGender: Gender;

  @Column({ type: 'jsonb', nullable: true })
  preferredLocations: string[];

  @Column({ type: 'jsonb', nullable: true })
  preferredJobs: string[];

  @Column({ type: 'enum', enum: MinEducation, nullable: true })
  minEducation: MinEducation;

  @Column({ nullable: true })
  minHeight: number;

  @Column({ nullable: true })
  maxHeight: number;
}
