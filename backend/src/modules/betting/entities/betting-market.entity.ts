import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Match } from '../../matches/entities/match.entity';

export enum BettingMarketType {
  /** 승패 베팅 (winner_team_id 기준 정산) */
  WIN = 'WIN',
  /** 등수 베팅 (placement 1~4 기준 정산) */
  RANK = 'RANK',
}

export enum BettingMarketStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

/**
 * 패리뮤추얼 베팅 마켓.
 *
 * 한 Match에 여러 마켓이 붙음 (WIN 1개 + RANK 1개 등).
 * 개별 stake/티켓은 Phase 2에서 신규 엔티티(`BettingStake`)로 추가 예정.
 *
 * 정산 공식 (Phase 2):
 *   pool_after_rake = totalPool * (1 - rakeBps/10000)
 *   payout(user) = stake * pool_after_rake / sum_of_winning_stakes
 */
@Entity('betting_markets')
@Index(['matchId'])
@Index(['status'])
export class BettingMarket extends BaseEntity {
  @Column({ name: 'match_id', type: 'uuid' })
  matchId: string;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ type: 'enum', enum: BettingMarketType })
  type: BettingMarketType;

  @Column({
    type: 'enum',
    enum: BettingMarketStatus,
    default: BettingMarketStatus.OPEN,
  })
  status: BettingMarketStatus;

  /** 누적 베팅 풀 (서비스에서 갱신). */
  @Column({ name: 'total_pool', type: 'bigint', default: 0 })
  totalPool: string;

  /** Rake 비율 (basis points). 5% = 500. SystemConfig에서 기본값 시드. */
  @Column({ name: 'rake_bps', type: 'int', default: 500 })
  rakeBps: number;

  /** SETTLED 시 당첨 옵션. WIN: teamId, RANK: placement(string) */
  @Column({
    name: 'winning_option',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  winningOption: string | null;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @Column({ name: 'settled_at', type: 'timestamp', nullable: true })
  settledAt: Date | null;
}
