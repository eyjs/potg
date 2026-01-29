import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum QuizCategory {
  HERO = 'HERO',       // 영웅 관련
  SKILL = 'SKILL',     // 스킬/능력
  MAP = 'MAP',         // 맵/전장
  LORE = 'LORE',       // 스토리/배경
  META = 'META',       // 메타/전략
  TRIVIA = 'TRIVIA',   // 잡학/기타
}

export enum QuizDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

@Entity('quiz_questions')
export class QuizQuestion extends BaseEntity {
  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'jsonb' })
  options: string[]; // 4지선다

  @Column({ type: 'int' })
  correctIndex: number; // 정답 인덱스 (0-3)

  @Column({ type: 'enum', enum: QuizCategory })
  category: QuizCategory;

  @Column({ type: 'enum', enum: QuizDifficulty, default: QuizDifficulty.NORMAL })
  difficulty: QuizDifficulty;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string; // 이미지 문제

  @Column({ type: 'text', nullable: true })
  explanation: string; // 정답 해설

  @Column({ type: 'int', default: 0 })
  usageCount: number; // 출제 횟수

  @Column({ type: 'float', default: 0 })
  correctRate: number; // 정답률 (0-1)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
