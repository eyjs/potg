import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Clan } from '../../clans/entities/clan.entity';

export enum PointRuleCategory {
  ATTENDANCE = 'ATTENDANCE',
  ACTIVITY = 'ACTIVITY',
  ACHIEVEMENT = 'ACHIEVEMENT',
  PENALTY = 'PENALTY',
}

@Entity('point_rules')
export class PointRule extends BaseEntity {
  @Column()
  clanId: string;

  @ManyToOne(() => Clan)
  @JoinColumn({ name: 'clanId' })
  clan: Clan;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PointRuleCategory, default: PointRuleCategory.ATTENDANCE })
  category: PointRuleCategory;

  @Column({ type: 'int' })
  points: number;

  @Column({ default: true })
  isActive: boolean;
}
