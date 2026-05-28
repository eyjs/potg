/**
 * Mirror of backend RoomState DTO.
 * Source: backend/src/modules/auctions/services/auctions-room-state.service.ts
 *
 * 백엔드 enum 을 직접 import 하지 않고 string-literal union 으로 재선언한다 — 모듈 경계 보존.
 */

export type AuctionStatus =
  | 'PENDING'
  | 'ONGOING'
  | 'PAUSED'
  | 'ASSIGNING'
  | 'COMPLETED'
  | 'CANCELLED'

export type BiddingPhase = 'WAITING' | 'BIDDING' | 'SOLD'

export type AuctionRole = 'CAPTAIN' | 'PLAYER' | 'SPECTATOR'

export interface RoomStateAuction {
  id: string
  title: string
  status: AuctionStatus
  biddingPhase: BiddingPhase
  startingPoints: number
  turnTimeLimit: number
  teamCount: number
  currentBiddingPlayerId: string | null
  currentBiddingEndTime: string | null // serialized
  timerPaused: boolean
  pausedTimeRemaining: number | null
  creatorId: string
}

export interface RoomStateParticipant {
  id: string
  userId: string
  role: AuctionRole
  currentPoints: number
  assignedTeamCaptainId: string | null
  wasUnsold: boolean
  biddingOrder: number
  user: {
    id: string
    battleTag: string | null
    mainRole: string | null
    avatarUrl: string | null
  } | null
}

export interface RoomStateBid {
  bidderId: string
  bidderName: string
  amount: number
}

export interface RoomStatePlayer {
  id: string
  name: string
  role: string
  avatarUrl: string | null
}

export interface RoomStateQueuePlayer extends RoomStatePlayer {
  wasUnsold: boolean
}

export interface RoomStateTeam {
  captainId: string
  captainName: string
  points: number
  members: {
    id: string
    name: string
    role: string
    price: number
    wasUnsold: boolean
  }[]
}

export interface RoomState {
  auction: RoomStateAuction
  participants: RoomStateParticipant[]
  currentBid: RoomStateBid | null
  currentPlayer: RoomStatePlayer | null
  teams: RoomStateTeam[]
  unsoldPlayers: RoomStateQueuePlayer[] // 미할당 PLAYER 풀 (대기 + 유찰 포함)
}

/** GET /auctions 목록 응답 */
export interface AuctionListItem {
  id: string
  title: string
  status: AuctionStatus
  creatorId: string
  startingPoints: number
  teamCount: number
  turnTimeLimit: number
  createdAt: string
}

/** GET /users 응답 — 디스코드 가입 회원 풀 */
export interface UserSummary {
  id: string
  username: string
  battleTag: string | null
  avatarUrl: string | null
  mainRole: string | null
  role: 'USER' | 'CAPTAIN' | 'ADMIN'
}

/** POST /auctions 요청 */
export interface CreateAuctionDto {
  title: string
  startingPoints: number
  teamCount: number
  turnTimeLimit: number
}

/**
 * useAuctionRole 반환 — 페이지 view 분기에 사용.
 * - master: auction.creatorId === user.id
 * - captain: participants 에 role=CAPTAIN 으로 등록된 본인
 * - spectator: 그 외 로그인 유저
 */
export type AuctionRoleView = 'master' | 'captain' | 'spectator'
