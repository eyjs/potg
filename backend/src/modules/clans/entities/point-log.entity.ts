import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Clan } from './clan.entity';

@Entity('point_logs')
export class PointLog extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  clanId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Clan)
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Column()
  amount: number;

  @Column()
  reason: string;
}
