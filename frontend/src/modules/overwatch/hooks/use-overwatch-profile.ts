'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { handleApiError } from '@/lib/api-error'
import type { ClanRanking } from '../types'

export function useClanLeaderboard(clanId?: string) {
  const [rankings, setRankings] = useState<ClanRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRankings = useCallback(async () => {
    if (!clanId) return
    try {
      setIsLoading(true)
      const res = await api.get<ClanRanking[]>(`/overwatch/rankings/${clanId}`)
      setRankings(res.data)
    } catch (error) {
      handleApiError(error, '랭킹 조회 실패')
    } finally {
      setIsLoading(false)
    }
  }, [clanId])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  return {
    rankings,
    isLoading,
    refetch: fetchRankings,
  }
}
