import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 복식부기 원장 (append-only).
 *
 * - 모든 포인트 이동은 한 row로 기록됨.
 * - `from_account` null = 발행 (mint) | `SINK_ACCOUNT_ID` = 시스템 계정에서 차감
 * - `to_account` null = 소각 (burn) | `SINK_ACCOUNT_ID` = 시스템 계정으로 적립
 * - 보통은 `from` / `to` 둘 다 채워진 형태 (시스템↔사용자 또는 사용자↔SINK)
 *
 * 회계 무결성:
 *   user.pointsBalance == SUM(amount WHERE to_account = user.id)
 *                       - SUM(amount WHERE from_account = user.id)
 */
@Entity('point_tx')
@Index(['fromAccount'])
@Index(['toAccount'])
@Index(['refType', 'refId'])
@Index(['createdAt'])
export class PointTx {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_account', type: 'uuid', nullable: true })
  fromAccount: string | null;

  @Column({ name: 'to_account', type: 'uuid', nullable: true })
  toAccount: string | null;

  /** 정수 포인트. bigint로 저장 (TypeORM → string). */
  @Column({ type: 'bigint' })
  amount: string;

  /** ex) "BET_STAKE", "MARKET_BUY", "SEED" */
  @Column({ length: 64 })
  reason: string;

  /** 참조 도메인 (선택). ex) "BettingMarket", "MarketOrder", "Match" */
  @Column({ name: 'ref_type', length: 32, nullable: true })
  refType: string | null;

  /** 참조 row id (선택). */
  @Column({ name: 'ref_id', type: 'uuid', nullable: true })
  refId: string | null;

  /** 메모/디스코드 메시지 ID 등 (선택). */
  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
