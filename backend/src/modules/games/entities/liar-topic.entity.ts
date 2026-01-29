import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('liar_topics')
export class LiarTopic extends BaseEntity {
  @Column()
  category: string; // '영웅', '맵', '스킬', '음식' 등

  @Column({ type: 'jsonb' })
  words: string[]; // 해당 카테고리의 단어들

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
