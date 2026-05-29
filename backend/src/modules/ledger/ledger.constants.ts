/**
 * 가상 시스템 계정(SINK) ID.
 *
 * - `to_account = SINK_ACCOUNT_ID` : 소각 (마켓 구매, Rake)
 * - `from_account = SINK_ACCOUNT_ID` : 발행 (가입 시드, 적립)
 *
 * 마이그레이션에서 이 ID로 시스템 사용자 row를 별도로 만들지 않는다.
 * PointTx의 from/to는 외래키 제약 없이 string으로 저장 (User FK 미적용).
 */
export const SINK_ACCOUNT_ID = '00000000-0000-0000-0000-000000000000';

export const POINT_TX_REASON = {
  SEED: 'SEED',
  ATTENDANCE: 'ATTENDANCE',
  MONTHLY_CAP_ADJUST: 'MONTHLY_CAP_ADJUST',
  BET_STAKE: 'BET_STAKE',
  BET_PAYOUT: 'BET_PAYOUT',
  BET_RAKE: 'BET_RAKE',
  /** 마켓 취소 시 스테이크 전액 환불 (정산 payout 과 구분). */
  BET_REFUND: 'BET_REFUND',
  MARKET_BUY: 'MARKET_BUY',
  MARKET_REFUND: 'MARKET_REFUND',
  ADMIN_ADJUST: 'ADMIN_ADJUST',
  /** 사용자 ↔ 사용자 송금 (P2P). */
  P2P_SEND: 'P2P_SEND',
  /** 연속 출석 보너스 (STREAK_3 / STREAK_5 / STREAK_10). */
  STREAK_BONUS: 'STREAK_BONUS',
} as const;
