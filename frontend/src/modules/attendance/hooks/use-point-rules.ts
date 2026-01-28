'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api-error'
import type { PointRule, PointRuleCategory } from '../types'

interface CreatePointRuleInput {
  code: string
  name: string
  description?: string
  category: PointRuleCategory
  points: number
  isActive?: boolean
}

interface UpdatePointRuleInput {
  code?: string
  name?: string
  description?: string
  category?: PointRuleCategory
  points?: number
  isActive?: boolean
}

export function usePointRules(clanId: string | undefined) {
  const [rules, setRules] = useState<PointRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchRules = useCallback(async () => {
    if (!clanId) return
    setIsLoading(true)
    try {
      const res = await api.get(`/clans/${clanId}/point-rules`)
      if (!mountedRef.current) return
      setRules(res.data)
    } catch (error) {
      if (mountedRef.current) handleApiError(error)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [clanId])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const createRule = useCallback(
    async (input: CreatePointRuleInput) => {
      if (!clanId) return
      try {
        await api.post(`/clans/${clanId}/point-rules`, input)
        toast.success('규칙이 생성되었습니다.')
        fetchRules()
      } catch (error) {
        handleApiError(error, '규칙 생성 실패')
      }
    },
    [clanId, fetchRules],
  )

  const updateRule = useCallback(
    async (id: string, input: UpdatePointRuleInput) => {
      if (!clanId) return
      try {
        await api.patch(`/clans/${clanId}/point-rules/${id}`, input)
        toast.success('규칙이 수정되었습니다.')
        fetchRules()
      } catch (error) {
        handleApiError(error, '규칙 수정 실패')
      }
    },
    [clanId, fetchRules],
  )

  const deleteRule = useCallback(
    async (id: string) => {
      if (!clanId) return
      try {
        await api.delete(`/clans/${clanId}/point-rules/${id}`)
        toast.success('규칙이 삭제되었습니다.')
        fetchRules()
      } catch (error) {
        handleApiError(error, '규칙 삭제 실패')
      }
    },
    [clanId, fetchRules],
  )

  const seedDefaults = useCallback(async () => {
    if (!clanId) return
    try {
      await api.post(`/clans/${clanId}/point-rules/seed`)
      toast.success('기본 규칙이 생성되었습니다.')
      fetchRules()
    } catch (error) {
      handleApiError(error, '기본 규칙 생성 실패')
    }
  }, [clanId, fetchRules])

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    seedDefaults,
    refetch: fetchRules,
  }
}
