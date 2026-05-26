import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * 경제/운영 파라미터 KV 스토어.
 *
 * 키 목록 (시드):
 *   - SEED_AMOUNT (string 숫자)           : 1000
 *   - MONTHLY_CAP (string 숫자)           : 5000
 *   - RAKE_BPS (string 숫자)              : 500 (5%)
 *   - MARKET_GATE_ATTENDANCE_DAYS         : 7
 *   - MARKET_GATE_MATCH_COUNT             : 2
 *
 * value는 항상 string. 호출 측에서 JSON.parse 또는 Number 변환.
 */
@Entity('system_config')
export class SystemConfig {
  @PrimaryColumn({ length: 64 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export const SYSTEM_CONFIG_KEYS = {
  SEED_AMOUNT: 'SEED_AMOUNT',
  MONTHLY_CAP: 'MONTHLY_CAP',
  RAKE_BPS: 'RAKE_BPS',
  MARKET_GATE_ATTENDANCE_DAYS: 'MARKET_GATE_ATTENDANCE_DAYS',
  MARKET_GATE_MATCH_COUNT: 'MARKET_GATE_MATCH_COUNT',
} as const;
