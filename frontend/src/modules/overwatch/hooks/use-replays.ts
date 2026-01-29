'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { handleApiError } from '@/lib/api-error'
import { toast } from 'sonner'
import type { Replay, CreateReplayDto, ReplayStats, ReplayResult } from '../types'

interface ReplaysQuery {
  mapName?: string
  result?: ReplayResult
  tag?: string
  search?: string
  limit?: number
  offset?: number
}

export function useReplays(clanId?: string, query?: ReplaysQuery) {
  const [replays, setReplays] = useState<Replay[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchReplays = useCallback(async () => {
    if (!clanId) return
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (query?.mapName) params.set('mapName', query.mapName)
      if (query?.result) params.set('result', query.result)
      if (query?.tag) params.set('tag', query.tag)
      if (query?.search) params.set('search', query.search)
      if (query?.limit) params.set('limit', String(query.limit))
      if (query?.offset) params.set('offset', String(query.offset))

      const res = await api.get<{ data: Replay[]; total: number }>(
        `/replays/clan/${clanId}?${params.toString()}`
      )
      setReplays(res.data.data)
      setTotal(res.data.total)
    } catch (error) {
      handleApiError(error, '리플레이 조회 실패')
    } finally {
      setIsLoading(false)
    }
  }, [clanId, query?.mapName, query?.result, query?.tag, query?.search, query?.limit, query?.offset])

  useEffect(() => {
    fetchReplays()
  }, [fetchReplays])

  return { replays, total, isLoading, refetch: fetchReplays }
}

export function useMyReplays() {
  const [replays, setReplays] = useState<Replay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchReplays = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await api.get<Replay[]>('/replays/mine')
      setReplays(res.data)
    } catch (error) {
      handleApiError(error, '내 리플레이 조회 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReplays()
  }, [fetchReplays])

  return { replays, isLoading, refetch: fetchReplays }
}

export function useReplayStats(clanId?: string) {
  const [stats, setStats] = useState<ReplayStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!clanId) return

    const fetchStats = async () => {
      try {
        const res = await api.get<ReplayStats>(`/replays/stats/${clanId}`)
        setStats(res.data)
      } catch (error) {
        handleApiError(error, '통계 조회 실패')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [clanId])

  return { stats, isLoading }
}

export function useReplayMutations(onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createReplay = useCallback(async (dto: CreateReplayDto) => {
    try {
      setIsSubmitting(true)
      await api.post('/replays', dto)
      toast.success('리플레이가 등록되었습니다.')
      onSuccess?.()
    } catch (error) {
      handleApiError(error, '리플레이 등록 실패')
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  const deleteReplay = useCallback(async (id: string) => {
    try {
      setIsSubmitting(true)
      await api.delete(`/replays/${id}`)
      toast.success('리플레이가 삭제되었습니다.')
      onSuccess?.()
    } catch (error) {
      handleApiError(error, '리플레이 삭제 실패')
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  const likeReplay = useCallback(async (id: string) => {
    try {
      await api.post(`/replays/${id}/like`)
    } catch (error) {
      handleApiError(error, '좋아요 실패')
    }
  }, [])

  return { createReplay, deleteReplay, likeReplay, isSubmitting }
}
