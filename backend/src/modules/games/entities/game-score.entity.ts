import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Game } from './game.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

@Entity('game_scores')
@Index(['gameId', 'memberId'])
@Index(['gameId', 'score'])
export class GameScore extends BaseEntity {
  @Column()
  @Index()
  gameId: string;

  @Column()
  @Index()
  memberId: string;

  @Column()
  clanId: string;

  @Column({ type: 'int' })
  score: number; // 점수 (높을수록 좋음)

  @Column({ type: 'int', nullable: true })
  time: number; // 밀리초 (반응속도 등, 낮을수록 좋음)

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;
  // 게임별 추가 데이터:
  // AIM_TRAINER: { accuracy, hits, misses }
  // REACTION: { attempts, bestTime }
  // QUIZ_BATTLE: { correctCount, totalQuestions, opponentId }

  @Column({ type: 'int', default: 0 })
  pointsEarned: number; // 획득 포인트

  @ManyToOne(() => Game, (g) => g.scores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'memberId' })
  member: ClanMember;
}
