/**
 * 내전(Match) 상태머신.
 *
 *  DRAFT  →  BETTING_OPEN  →  LOCKED  →  SETTLED
 *    │            │             │
 *    └────────────┴─────────────┴──────► CANCELLED
 *
 * LOCKED 이후 베팅/결과 모두 불가 (서비스 레이어 가드).
 */
export enum MatchStatus {
  DRAFT = 'DRAFT',
  BETTING_OPEN = 'BETTING_OPEN',
  LOCKED = 'LOCKED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export const MATCH_STATUS_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  [MatchStatus.DRAFT]: [MatchStatus.BETTING_OPEN, MatchStatus.CANCELLED],
  [MatchStatus.BETTING_OPEN]: [MatchStatus.LOCKED, MatchStatus.CANCELLED],
  [MatchStatus.LOCKED]: [MatchStatus.SETTLED, MatchStatus.CANCELLED],
  [MatchStatus.SETTLED]: [],
  [MatchStatus.CANCELLED]: [],
};
