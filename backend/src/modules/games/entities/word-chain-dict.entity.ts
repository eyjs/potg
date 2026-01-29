import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum WordCategory {
  HERO = 'HERO',       // 영웅
  SKILL = 'SKILL',     // 스킬
  MAP = 'MAP',         // 맵
  TERM = 'TERM',       // 용어
  ITEM = 'ITEM',       // 아이템
  GENERAL = 'GENERAL', // 일반 단어
}

@Entity('word_chain_dict')
export class WordChainDict extends BaseEntity {
  @Column()
  @Index()
  word: string; // 단어

  @Column()
  @Index()
  firstChar: string; // 첫 글자 (검색용)

  @Column()
  @Index()
  lastChar: string; // 끝 글자 (다음 단어 검색용)

  @Column({ type: 'enum', enum: WordCategory, default: WordCategory.GENERAL })
  category: WordCategory;

  @Column({ type: 'int', default: 0 })
  usageCount: number; // 사용 횟수

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
