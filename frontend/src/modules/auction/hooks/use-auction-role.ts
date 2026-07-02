import type { AuctionRoleView, RoomState } from '../types'

interface AuthUserLike {
  id: string
  role: 'USER' | 'ADMIN'
}

/**
 * 페이지 view 분기 키 — ADMIN 이거나 auction.creatorId === user.id 면 master
 * (관리자 공동 운영 — 백엔드 loadAsCreator 도 동일 정책),
 * participants 에 role=CAPTAIN 으로 등록된 본인이면 captain,
 * 그 외 로그인 유저는 spectator.
 *
 * roomState 가 있으면 그것을 우선 사용 (live source of truth),
 * 없으면 list 의 auction creatorId 만 기준 (PENDING 초기 단계).
 */
export function getAuctionRole(
  roomState: RoomState | null,
  fallbackCreatorId: string | null,
  user: AuthUserLike | null,
): AuctionRoleView {
  if (!user) return 'spectator'

  if (user.role === 'ADMIN') return 'master'

  const creatorId = roomState?.auction.creatorId ?? fallbackCreatorId
  if (creatorId && creatorId === user.id) return 'master'

  if (roomState) {
    const me = roomState.participants.find((p) => p.userId === user.id)
    if (me?.role === 'CAPTAIN') return 'captain'
  }

  return 'spectator'
}

/**
 * 새 경매 생성 권한 — 전역 ADMIN 만.
 */
export function canCreateAuction(user: AuthUserLike | null): boolean {
  return user?.role === 'ADMIN'
}
