'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Input } from '@/common/components/ui/input'
import { Crown, Shield, User, Search } from 'lucide-react'
import { MemberRow } from './member-row'
import type { ClanRole, ClanMember, GroupedMembers } from '../types'

interface MemberTableProps {
  members: ClanMember[]
  groupedMembers: GroupedMembers
  isLoading: boolean
  isMaster: boolean
  canManageMembers: boolean
  currentUserId?: string
  onRoleChange: (userId: string, role: ClanRole) => void
  onKick: (userId: string, battleTag: string) => void
  onTransferMaster: (userId: string, battleTag: string) => void
}

export function MemberTable({
  members,
  groupedMembers,
  isLoading,
  isMaster,
  canManageMembers,
  currentUserId,
  onRoleChange,
  onKick,
  onTransferMaster,
}: MemberTableProps) {
  const [search, setSearch] = useState('')

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return groupedMembers
    const q = search.toLowerCase()
    return {
      MASTER: groupedMembers.MASTER.filter((m) =>
        m.user?.battleTag?.toLowerCase().includes(q),
      ),
      MANAGER: groupedMembers.MANAGER.filter((m) =>
        m.user?.battleTag?.toLowerCase().includes(q),
      ),
      MEMBER: groupedMembers.MEMBER.filter((m) =>
        m.user?.battleTag?.toLowerCase().includes(q),
      ),
    }
  }, [groupedMembers, search])

  const filteredTotal =
    filteredGrouped.MASTER.length + filteredGrouped.MANAGER.length + filteredGrouped.MEMBER.length

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="배틀태그로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {search && filteredTotal === 0 && (
        <p className="text-center py-4 text-sm text-muted-foreground">
          &quot;{search}&quot;에 대한 검색 결과가 없습니다.
        </p>
      )}

      {/* 마스터 */}
      {filteredGrouped.MASTER.length > 0 && (
        <Card className="bg-card border-yellow-500/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" /> 마스터
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {filteredGrouped.MASTER.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isMaster={isMaster}
                canManage={false}
                isMe={member.userId === currentUserId}
                onRoleChange={onRoleChange}
                onKick={onKick}
                onTransferMaster={onTransferMaster}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 운영진 */}
      {filteredGrouped.MANAGER.length > 0 && (
        <Card className="bg-card border-blue-500/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" /> 운영진 ({filteredGrouped.MANAGER.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {filteredGrouped.MANAGER.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isMaster={isMaster}
                canManage={isMaster}
                isMe={member.userId === currentUserId}
                onRoleChange={onRoleChange}
                onKick={onKick}
                onTransferMaster={onTransferMaster}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 일반 멤버 */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" /> 멤버 ({filteredGrouped.MEMBER.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {filteredGrouped.MEMBER.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">
              {search ? '검색 결과 없음' : '일반 멤버가 없습니다.'}
            </p>
          ) : (
            filteredGrouped.MEMBER.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isMaster={isMaster}
                canManage={canManageMembers}
                isMe={member.userId === currentUserId}
                onRoleChange={onRoleChange}
                onKick={onKick}
                onTransferMaster={onTransferMaster}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
