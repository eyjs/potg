import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { WordCategory } from './word-chain-dict.entity';

export enum CatchMindDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

@Entity('catch_mind_words')
export class CatchMindWord extends BaseEntity {
  @Column()
  @Index()
  word: string;

  @Column({ type: 'enum', enum: WordCategory, default: WordCategory.GENERAL })
  category: WordCategory;

  @Column({
    type: 'enum',
    enum: CatchMindDifficulty,
    default: CatchMindDifficulty.NORMAL,
  })
  difficulty: CatchMindDifficulty;

  @Column({ type: 'varchar', nullable: true })
  hint: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;
}
