'use client'

import { useQuery } from '@tanstack/react-query'
import { auctionsApi } from '../api/auctions'
import type { AuctionListItem } from '../types'

const ACTIVE_STATES: Array<AuctionListItem['status']> = [
  'PENDING',
  'ONGOING',
  'PAUSED',
  'ASSIGNING',
]

/**
 * "현재 진행 중" 경매 1건을 자동 추적.
 *
 * 우선순위:
 *   1. ACTIVE (PENDING/ONGOING/PAUSED/ASSIGNING) 중 가장 최근 1건
 *   2. 없으면 최근 COMPLETED 1건 (= 직전 결과 화면 유지)
 *   3. 그것도 없으면 null
 *
 * 이유: COMPLETED 화면을 새로고침/refetch 후에도 유지해야 마스터가 결과 이미지
 * 다운로드 / 새 경매 / 결과 버리기 액션에 도달할 수 있다. CANCELLED 는 결과
 * 의미가 없으므로 표시하지 않음.
 *
 * 새 PENDING 이 생기면 ACTIVE 가 우선되어 자동으로 PENDING 화면으로 전환,
 * COMPLETED 가 삭제되면 다음 most-recent COMPLETED 또는 null 로 전환된다.
 */
export function useCurrentAuction() {
  const query = useQuery({
    queryKey: ['auction', 'current'],
    queryFn: () => auctionsApi.list(),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })

  const byCreatedDesc = (a: AuctionListItem, b: AuctionListItem) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

  const all = query.data ?? []
  const activeOne = all
    .filter((a) => ACTIVE_STATES.includes(a.status))
    .sort(byCreatedDesc)[0]
  const completedOne = all
    .filter((a) => a.status === 'COMPLETED')
    .sort(byCreatedDesc)[0]
  const auction = activeOne ?? completedOne ?? null

  return {
    auction,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
