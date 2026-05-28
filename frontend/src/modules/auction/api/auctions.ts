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

  removeParticipant: (id: string, userId: string): Promise<void> =>
    api
      .post(`/auctions/${id}/participants/${userId}/remove`)
      .then(() => undefined),

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
