import {
  Entity,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GameScore } from './game-score.entity';

export enum GameType {
  SOLO = 'SOLO',      // 혼자 하는 게임 (에임 트레이너, 반응속도)
  PVP = 'PVP',        // 1:1 대결 (퀴즈 배틀)
  PARTY = 'PARTY',    // 파티 게임 (라이어, 끝말잇기)
}

@Entity('games')
export class Game extends BaseEntity {
  @Column({ unique: true })
  code: string; // 'AIM_TRAINER', 'REACTION', 'QUIZ_BATTLE' 등

  @Column()
  name: string; // 표시 이름

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: GameType })
  type: GameType;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'int', default: 0 })
  minPlayers: number; // 최소 인원 (SOLO=1, PVP=2)

  @Column({ type: 'int', default: 1 })
  maxPlayers: number; // 최대 인원

  @Column({ type: 'int', default: 0 })
  pointReward: number; // 기본 포인트 보상

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  playCount: number; // 총 플레이 횟수

  @OneToMany(() => GameScore, (s) => s.game)
  scores: GameScore[];
}
