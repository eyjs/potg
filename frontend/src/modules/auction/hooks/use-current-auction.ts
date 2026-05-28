'use client'

import { useQuery } from '@tanstack/react-query'
import { auctionsApi } from '../api/auctions'
import type { AuctionListItem } from '../types'

const NON_TERMINAL: Array<AuctionListItem['status']> = [
  'PENDING',
  'ONGOING',
  'PAUSED',
  'ASSIGNING',
]

/**
 * "현재 진행 중" 경매 1건을 자동 추적.
 *
 * - GET /auctions 호출 → 비-COMPLETED/CANCELLED 중 가장 최근 1건 선택
 * - completed 후 socket 으로부터 invalidate 받으면 자동 refetch
 * - 동시에 여러 진행중 경매가 있으면 createdAt desc 의 첫 항목 사용
 *   (백엔드는 이론상 N개 지원하나 단발성 정책상 1개만 운용)
 */
export function useCurrentAuction() {
  const query = useQuery({
    queryKey: ['auction', 'current'],
    queryFn: () => auctionsApi.list(),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })

  const auction =
    query.data
      ?.filter((a) => NON_TERMINAL.includes(a.status))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null

  return {
    auction,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
