'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import { handleApiError } from '@/lib/api-error'
import type { AttendanceRecord, AttendanceStats } from '../types'

export function useAttendance(clanId: string | undefined) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<AttendanceStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchHistory = useCallback(
    async (limit = 50, offset = 0) => {
      if (!clanId) return
      setIsLoading(true)
      try {
        const res = await api.get(`/clans/${clanId}/attendance`, {
          params: { limit, offset },
        })
        if (!mountedRef.current) return
        setRecords(res.data.records)
        setTotal(res.data.total)
      } catch (error) {
        if (mountedRef.current) handleApiError(error)
      } finally {
        if (mountedRef.current) setIsLoading(false)
      }
    },
    [clanId],
  )

  const fetchStats = useCallback(async () => {
    if (!clanId) return
    setIsStatsLoading(true)
    try {
      const res = await api.get(`/clans/${clanId}/attendance/stats`)
      if (!mountedRef.current) return
      setStats(res.data)
    } catch (error) {
      if (mountedRef.current) handleApiError(error)
    } finally {
      if (mountedRef.current) setIsStatsLoading(false)
    }
  }, [clanId])

  useEffect(() => {
    fetchHistory()
    fetchStats()
  }, [fetchHistory, fetchStats])

  return {
    records,
    total,
    stats,
    isLoading,
    isStatsLoading,
    fetchHistory,
    fetchStats,
  }
}
