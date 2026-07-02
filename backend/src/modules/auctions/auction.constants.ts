/**
 * 오버워치 내전 경매 도메인 상수.
 *
 * 오버워치는 5:5 팀 게임이므로 각 팀은 팀장(캡틴)을 포함해 정확히 5명으로 구성된다.
 * 따라서 한 캡틴이 입찰/배정으로 확보할 수 있는 선수는 최대 4명이다.
 */
export const TEAM_SIZE_INCLUDING_CAPTAIN = 5;

/** 캡틴 1명이 확보 가능한 최대 선수 수 (팀장 제외). */
export const MAX_PLAYERS_PER_CAPTAIN = TEAM_SIZE_INCLUDING_CAPTAIN - 1;
