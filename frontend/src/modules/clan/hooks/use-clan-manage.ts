'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/context/auth-context'
import { useConfirm } from '@/common/components/confirm-dialog'
import api from '@/lib/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api-error'
import type { ClanRole, ClanMember, JoinRequest, ClanInfo, GroupedMembers } from '../types'

export function useClanManage() {
  const { user } = useAuth()
  const confirm = useConfirm()

  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [members, setMembers] = useState<ClanMember[]>([])
  const [myMembership, setMyMembership] = useState<ClanMember | null>(null)
  const [clanInfo, setClanInfo] = useState<ClanInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('members')

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchData = useCallback(async () => {
    if (!user?.clanId) return
    setIsLoading(true)
    try {
      const [requestsRes, membersRes, membershipRes, clanRes] = await Promise.all([
        api.get(`/clans/${user.clanId}/requests`),
        api.get(`/clans/${user.clanId}/members`),
        api.get('/clans/membership/me'),
        api.get(`/clans/${user.clanId}`),
      ])
      if (!mountedRef.current) return
      setRequests(requestsRes.data)
      setMembers(membersRes.data)
      setMyMembership(membershipRes.data)
      setClanInfo(clanRes.data)
      setEditName(clanRes.data.name || '')
      setEditDescription(clanRes.data.description || '')
    } catch (error) {
      if (mountedRef.current) handleApiError(error)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [user?.clanId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRequestAction = useCallback(
    async (requestId: string, action: 'approve' | 'reject') => {
      try {
        await api.post(`/clans/requests/${requestId}/${action}`)
        toast.success(action === 'approve' ? '승인되었습니다.' : '거절되었습니다.')
        fetchData()
      } catch (error) {
        handleApiError(error, '처리 실패')
      }
    },
    [fetchData],
  )

  const handleRoleChange = useCallback(
    async (userId: string, newRole: ClanRole) => {
      if (!user?.clanId) return
      try {
        await api.patch(`/clans/${user.clanId}/members/${userId}/role`, { role: newRole })
        toast.success('역할이 변경되었습니다.')
        fetchData()
      } catch (error) {
        handleApiError(error, '역할 변경 실패')
      }
    },
    [user?.clanId, fetchData],
  )

  const handleKick = useCallback(
    async (userId: string, battleTag: string) => {
      if (!user?.clanId) return
      const ok = await confirm({
        title: `정말 ${battleTag}님을 추방하시겠습니까?`,
        variant: 'destructive',
        confirmText: '추방',
      })
      if (!ok) return
      try {
        await api.post(`/clans/${user.clanId}/members/${userId}/kick`)
        toast.success('추방되었습니다.')
        fetchData()
      } catch (error) {
        handleApiError(error, '추방 실패')
      }
    },
    [user?.clanId, confirm, fetchData],
  )

  const handleTransferMaster = useCallback(
    async (newMasterId: string, battleTag: string) => {
      if (!user?.clanId) return
      const ok = await confirm({
        title: `정말 ${battleTag}님에게 마스터 권한을 양도하시겠습니까?`,
        description: '이 작업은 되돌릴 수 없습니다.',
        variant: 'destructive',
        confirmText: '양도',
      })
      if (!ok) return
      try {
        await api.post(`/clans/${user.clanId}/transfer-master`, { newMasterId })
        toast.success('마스터 권한이 양도되었습니다.')
        fetchData()
      } catch (error) {
        handleApiError(error, '권한 양도 실패')
      }
    },
    [user?.clanId, confirm, fetchData],
  )

  const handleUpdateClanInfo = useCallback(async () => {
    if (!user?.clanId || !editName.trim()) {
      toast.error('클랜명을 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      await api.patch(`/clans/${user.clanId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
      })
      toast.success('클랜 정보가 수정되었습니다.')
      fetchData()
    } catch (error) {
      handleApiError(error, '수정 실패')
    } finally {
      setIsSaving(false)
    }
  }, [user?.clanId, editName, editDescription, fetchData])

  const canManageMembers = myMembership?.role === 'MASTER' || myMembership?.role === 'MANAGER'
  const isMaster = myMembership?.role === 'MASTER'

  const groupedMembers: GroupedMembers = useMemo(
    () => ({
      MASTER: members.filter((m) => m.role === 'MASTER'),
      MANAGER: members.filter((m) => m.role === 'MANAGER'),
      MEMBER: members.filter((m) => m.role === 'MEMBER'),
    }),
    [members],
  )

  const totalPoints = useMemo(() => members.reduce((sum, m) => sum + m.totalPoints, 0), [members])

  return {
    user,
    requests,
    members,
    myMembership,
    clanInfo,
    isLoading,
    activeTab,
    setActiveTab,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    isSaving,
    canManageMembers,
    isMaster,
    groupedMembers,
    totalPoints,
    handleRequestAction,
    handleRoleChange,
    handleKick,
    handleTransferMaster,
    handleUpdateClanInfo,
    fetchData,
  }
}
