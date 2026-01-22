import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Clan } from './clan.entity';
import { User } from '../../users/entities/user.entity';

export enum HallOfFameType {
  MVP = 'MVP',           // 명예의 전당 (MVP)
  DONOR = 'DONOR',       // 기부자
  WANTED = 'WANTED',     // 현상수배
}

@Entity('hall_of_fame')
export class HallOfFame extends BaseEntity {
  @Column()
  clanId: string;

  @ManyToOne(() => Clan)
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: HallOfFameType })
  type: HallOfFameType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  amount: number; // 포인트, 기부금액, 현상금 등

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  displayOrder: number;
}
