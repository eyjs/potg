'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { handleApiError } from '@/lib/api-error'
import type {
  MonthlyStats,
  PlayerStats,
  ScrimHistory,
  StatisticsFilter,
} from '../types'

interface ClanMemberResponse {
  userId: string
  user?: { battleTag: string; avatarUrl?: string }
  totalPoints: number
}

interface UseStatisticsParams {
  clanId: string | undefined
}

/**
 * /vote(통계) 페이지의 데이터 로딩 + 파생 상태를 한 번에 관리.
 *
 * - scrims / playerStats / monthlyStats 로딩
 * - filter 상태와 filteredScrims, finishedCount, totalParticipations 파생값 제공
 */
export function useStatistics({ clanId }: UseStatisticsParams) {
  const [scrims, setScrims] = useState<ScrimHistory[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<StatisticsFilter>('all')

  useEffect(() => {
    if (!clanId) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const [scrimsRes, membersRes] = await Promise.all([
          api.get<ScrimHistory[]>(`/scrims`),
          api.get<ClanMemberResponse[]>(`/clans/${clanId}/members`).catch(() => ({
            data: [] as ClanMemberResponse[],
          })),
        ])

        if (cancelled) return

        const scrimsData = scrimsRes.data || []
        setScrims(scrimsData)

        const members = membersRes.data || []
        const stats: PlayerStats[] = members.map((member, index) => ({
          rank: index + 1,
          userId: member.userId,
          battleTag: member.user?.battleTag || 'Unknown',
          avatarUrl: member.user?.avatarUrl,
          wins: 0,
          losses: 0,
          participations: 0,
          winRate: 0,
          totalPoints: member.totalPoints || 0,
        }))

        stats.sort((a, b) => b.totalPoints - a.totalPoints)
        stats.forEach((stat, index) => {
          stat.rank = index + 1
        })
        setPlayerStats(stats)

        const monthlyMap = new Map<string, { count: number; participants: number }>()
        scrimsData.forEach((scrim) => {
          const date = new Date(scrim.scheduledDate)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const existing = monthlyMap.get(monthKey) || { count: 0, participants: 0 }
          monthlyMap.set(monthKey, {
            count: existing.count + 1,
            participants: existing.participants + (scrim.participantsCount || 0),
          })
        })

        const monthly: MonthlyStats[] = Array.from(monthlyMap.entries())
          .map(([month, data]) => ({
            month,
            scrimCount: data.count,
            totalParticipants: data.participants,
            averageParticipants:
              data.count > 0 ? Math.round(data.participants / data.count) : 0,
          }))
          .sort((a, b) => b.month.localeCompare(a.month))
          .slice(0, 6)
        setMonthlyStats(monthly)
      } catch (error) {
        if (!cancelled) handleApiError(error, '통계 데이터를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [clanId])

  const filteredScrims = useMemo(
    () =>
      scrims
        .filter((scrim) => {
          if (filter === 'finished') return scrim.status === 'FINISHED'
          if (filter === 'upcoming')
            return scrim.status === 'SCHEDULED' || scrim.status === 'DRAFT'
          return true
        })
        .sort(
          (a, b) =>
            new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime(),
        ),
    [scrims, filter],
  )

  const finishedCount = useMemo(
    () => scrims.filter((s) => s.status === 'FINISHED').length,
    [scrims],
  )
  const totalParticipations = useMemo(
    () => scrims.reduce((sum, s) => sum + (s.participantsCount || 0), 0),
    [scrims],
  )

  return {
    scrims,
    playerStats,
    monthlyStats,
    isLoading,
    filter,
    setFilter,
    filteredScrims,
    finishedCount,
    totalParticipations,
  }
}
