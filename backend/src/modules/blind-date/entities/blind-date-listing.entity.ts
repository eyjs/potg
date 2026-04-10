import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum ListingStatus {
  OPEN = 'OPEN',
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
  registerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'registerId' })
  register: User;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.OPEN })
  status: ListingStatus;

  @Column()
  name: string;

  @Column()
  age: number;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column()
  location: string;

  @Column({ nullable: true })
  desiredLocation: string;

  @Column({ nullable: true })
  height: number;

  @Column()
  job: string;

  @Column({ nullable: true })
  education: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  idealType: string;

  @Column({ nullable: true })
  mbti: string;

  @Column({ default: false })
  smoking: boolean;

  @Column({ type: 'jsonb', nullable: true })
  photos: string[];

  @Column({ nullable: true })
  contactInfo: string;
}
