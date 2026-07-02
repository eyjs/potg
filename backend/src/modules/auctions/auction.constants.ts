/**
 * 오버워치 내전 경매 도메인 상수.
 *
 * 한 팀은 5명으로 구성된다. 팀장을 어떻게 취급하느냐에 따라 팀당 확보 가능한
 * 선수 수(정원)가 달라진다 — {@link RosterMode} 참조.
 */
import { RosterMode } from './entities/auction.entity';

/** 팀장 모드: 팀장이 5인 로스터의 일원 → 팀장 제외 확보 가능 선수 4명. */
export const MAX_PLAYERS_CAPTAIN_MODE = 4;

/** 감독 모드: 팀장이 감독(코치)으로 로스터 외부 → 팀당 선수 5명 정원. */
export const MAX_PLAYERS_COACH_MODE = 5;

/** 로스터 모드에 따른 팀당 최대 확보 선수 수. */
export function maxPlayersPerTeam(mode: RosterMode): number {
  return mode === RosterMode.COACH
    ? MAX_PLAYERS_COACH_MODE
    : MAX_PLAYERS_CAPTAIN_MODE;
}

/**
 * 입찰 타이머 안티-스나이프 설정.
 * 마감 {@link BID_URGENT_WINDOW_MS} 이내(긴급 구간)에서 들어온 입찰만
 * {@link BID_EXTEND_MS} 만큼 연장한다. 그 외 구간의 입찰은 타이머를 리셋하지 않는다.
 */
export const BID_URGENT_WINDOW_MS = 5000;
export const BID_EXTEND_MS = 5000;
