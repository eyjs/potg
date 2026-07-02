import api from '@/lib/api'
import type {
  AuctionListItem,
  CreateAuctionDto,
  RoomState,
  UserSummary,
} from '../types'

/**
 * /auctions REST wrapper.
 *
 * 백엔드 controller: backend/src/modules/auctions/auctions.controller.ts
 * 모든 endpoint 는 JWT 쿠키 인증 필요 (api.ts 가 withCredentials 처리).
 */
export const auctionsApi = {
  list: (): Promise<AuctionListItem[]> =>
    api.get<AuctionListItem[]>('/auctions').then((r) => r.data),

  findOne: (id: string): Promise<RoomState['auction']> =>
    api.get<RoomState['auction']>(`/auctions/${id}`).then((r) => r.data),

  create: (dto: CreateAuctionDto): Promise<{ id: string }> =>
    api.post<{ id: string }>('/auctions', dto).then((r) => r.data),

  addCaptain: (id: string, userId: string): Promise<void> =>
    api.post(`/auctions/${id}/captains`, { userId }).then(() => undefined),

  removeCaptain: (id: string, userId: string): Promise<void> =>
    api
      .post(`/auctions/${id}/captains/${userId}/remove`)
      .then(() => undefined),

  addPlayersBulk: (id: string, userIds: string[]): Promise<void> =>
    api
      .post(`/auctions/${id}/players/bulk`, { userIds })
      .then(() => undefined),

  /** 게스트(비회원) 매물 수기 등록 — 이름 명단 업로드. */
  addGuestPlayers: (id: string, names: string[]): Promise<void> =>
    api
      .post(`/auctions/${id}/players/guest`, { names })
      .then(() => undefined),

  removeParticipant: (id: string, userId: string): Promise<void> =>
    api
      .post(`/auctions/${id}/participants/${userId}/remove`)
      .then(() => undefined),

  /** 매물 대표 영웅 설정 (회원 영속, null 해제) — OverFast 영웅 key. */
  setParticipantHero: (
    id: string,
    userId: string,
    hero: string | null,
  ): Promise<void> =>
    api
      .patch(`/auctions/${id}/participants/${userId}/hero`, { hero })
      .then(() => undefined),

  /** 팀명 설정 (CAPTAIN 행, 빈 값이면 해제). */
  setTeamName: (
    id: string,
    userId: string,
    teamName: string | null,
  ): Promise<void> =>
    api
      .patch(`/auctions/${id}/captains/${userId}/team-name`, { teamName })
      .then(() => undefined),

  /** 경매 설정 변경 (PENDING 한정) — startingPoints 변경 시 팀장 포인트도 동기화됨. */
  updateSettings: (
    id: string,
    settings: {
      teamCount?: number
      startingPoints?: number
      turnTimeLimit?: number
    },
  ): Promise<void> =>
    api.patch(`/auctions/${id}/settings`, settings).then(() => undefined),

  start: (id: string): Promise<void> =>
    api.patch(`/auctions/${id}/start`).then(() => undefined),

  complete: (id: string): Promise<void> =>
    api.patch(`/auctions/${id}/complete`).then(() => undefined),

  delete: (id: string): Promise<void> =>
    api.post(`/auctions/${id}/delete`).then(() => undefined),
}

/**
 * /users — 회원 풀 조회. 디스코드 OAuth 가 유일한 가입 경로이므로
 * 모든 user 는 Discord 가입자이다.
 */
export const usersApi = {
  list: (): Promise<UserSummary[]> =>
    api.get<UserSummary[]>('/users').then((r) => r.data),
}
