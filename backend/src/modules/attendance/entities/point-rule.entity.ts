import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PointRuleCategory {
  ATTENDANCE = 'ATTENDANCE',
  ACTIVITY = 'ACTIVITY',
  ACHIEVEMENT = 'ACHIEVEMENT',
  PENALTY = 'PENALTY',
}

@Entity('point_rules')
export class PointRule extends BaseEntity {
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
