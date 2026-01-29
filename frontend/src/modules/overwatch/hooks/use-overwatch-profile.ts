'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { handleApiError } from '@/lib/api-error'
import { toast } from 'sonner'
import type { OverwatchProfile, ClanRanking } from '../types'

export function useOverwatchProfile(userId?: string) {
  const [profile, setProfile] = useState<OverwatchProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    try {
      setIsLoading(true)
      const endpoint = userId === 'me' ? '/overwatch/profile/me' : `/overwatch/profile/${userId}`
      const res = await api.get<OverwatchProfile>(endpoint)
      setProfile(res.data)
    } catch (error) {
      handleApiError(error, '프로필 조회 실패')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const syncProfile = useCallback(async () => {
    try {
      setIsSyncing(true)
      const res = await api.post<OverwatchProfile>('/overwatch/profile/me/sync')
      setProfile(res.data)
      if (res.data.lastSyncStatus === 'success') {
        toast.success('프로필이 동기화되었습니다.')
      } else if (res.data.lastSyncStatus === 'not_found') {
        toast.warning('플레이어를 찾을 수 없습니다.')
      } else {
        toast.error(res.data.lastSyncError || '동기화에 실패했습니다.')
      }
    } catch (error) {
      handleApiError(error, '동기화 실패')
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    isSyncing,
    syncProfile,
    refetch: fetchProfile,
  }
}

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
