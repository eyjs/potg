import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClanMember } from '../../clans/entities/clan-member.entity';

export enum QuizMatchStatus {
  MATCHING = 'MATCHING',   // 매칭 대기
  PLAYING = 'PLAYING',     // 진행 중
  FINISHED = 'FINISHED',   // 종료
  CANCELLED = 'CANCELLED', // 취소
}

@Entity('quiz_matches')
export class QuizMatch extends BaseEntity {
  @Column()
  @Index()
  clanId: string;

  @Column()
  player1Id: string; // memberId

  @Column({ nullable: true })
  player2Id: string; // memberId

  @Column({ type: 'enum', enum: QuizMatchStatus, default: QuizMatchStatus.MATCHING })
  status: QuizMatchStatus;

  @Column({ type: 'int', default: 0 })
  player1Score: number;

  @Column({ type: 'int', default: 0 })
  player2Score: number;

  @Column({ type: 'int', default: 0 })
  currentRound: number;

  @Column({ type: 'int', default: 5 })
  totalRounds: number;

  @Column({ type: 'jsonb', default: [] })
  questionIds: string[]; // 이번 매치 문제 목록

  @Column({ type: 'jsonb', nullable: true })
  roundResults: {
    round: number;
    questionId: string;
    player1Answer: number | null;
    player2Answer: number | null;
    player1Time: number | null;
    player2Time: number | null;
    correctIndex: number;
  }[];

  @Column({ nullable: true })
  winnerId: string; // 승자 memberId

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'player1Id' })
  player1: ClanMember;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'player2Id' })
  player2: ClanMember;

  @ManyToOne(() => ClanMember)
  @JoinColumn({ name: 'winnerId' })
  winner: ClanMember;
}
