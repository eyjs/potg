'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { membersApi, type AdminMember } from '@/modules/admin/api/members'
import { DataTable, type ColumnDef } from '@/modules/admin/components/data-table'
import { MemberFormDialog } from '@/modules/admin/components/member-form-dialog'
import { useHeroes } from '@/modules/auction/hooks/use-heroes'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/lib/utils'

const TAKE = 50

const ROLE_LABEL: Record<string, string> = {
  USER: '일반',
  CAPTAIN: '캡틴',
  ADMIN: '관리자',
}

const ROLE_CLASS: Record<string, string> = {
  USER: 'text-muted-foreground',
  CAPTAIN: 'text-[var(--ow-blue)]',
  ADMIN: 'text-primary font-bold',
}

/** 대표 영웅 초상화 셀 — OverFast 초상화 조회. */
function HeroCell({ heroKey }: { heroKey?: string | null }) {
  const { portraitByKey } = useHeroes()
  const portrait = heroKey ? portraitByKey.get(heroKey) : undefined
  if (!heroKey) {
    return <span className="text-xs text-muted-foreground">-</span>
  }
  return portrait ? (
    <Image
      src={portrait}
      alt={heroKey}
      width={28}
      height={28}
      unoptimized
      className="rounded-sm"
    />
  ) : (
    <span className="text-xs">{heroKey}</span>
  )
}

const columns: ColumnDef<AdminMember>[] = [
  { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
  { key: 'username', header: '아이디', render: (r) => <span className="font-medium">{r.username}</span> },
  { key: 'battleTag', header: '배틀태그', render: (r) => <span>{r.battleTag ?? '-'}</span> },
  {
    key: 'representativeHero',
    header: '대표영웅',
    render: (r) => <HeroCell heroKey={r.representativeHero} />,
  },
  {
    key: 'mainRole',
    header: '포지션',
    render: (r) =>
      r.mainRole ? (
        <span
          className={cn(
            'text-xs font-bold',
            r.mainRole === 'TANK' && 'text-blue-400',
            r.mainRole === 'DPS' && 'text-red-400',
            r.mainRole === 'SUPPORT' && 'text-green-400',
            r.mainRole === 'FLEX' && 'text-purple-400',
          )}
        >
          {r.mainRole}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      ),
  },
  {
    key: 'role',
    header: '권한',
    render: (r) => (
      <span className={cn('text-sm font-semibold', ROLE_CLASS[r.role])}>
        {ROLE_LABEL[r.role] ?? r.role}
      </span>
    ),
  },
  {
    key: 'totalPoints',
    header: '잔액',
    render: (r) => (
      <span className="tabular-nums text-primary font-bold">
        {(r.totalPoints ?? 0).toLocaleString()}P
      </span>
    ),
  },
]

export default function AdminMembersPage() {
  const [skip, setSkip] = useState(0)
  const [open, setOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin', 'members', skip],
    queryFn: () => membersApi.list({ skip, take: TAKE }),
  })

  const openEdit = (member: AdminMember) => {
    setSelectedMember(member)
    setOpen(true)
  }

  const openCreate = () => {
    setSelectedMember(null)
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic uppercase text-foreground">
          회원 관리
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {members.length > 0 ? `${skip + 1}–${skip + members.length}` : '0'}
          </span>
          <Button onClick={openCreate}>+ 회원 추가</Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={members}
        loading={isLoading}
        emptyMessage="회원이 없습니다."
        pagination={{
          skip,
          take: TAKE,
          total: skip + members.length + (members.length === TAKE ? 1 : 0),
          onChange: setSkip,
        }}
        onRowClick={openEdit}
      />

      <MemberFormDialog
        open={open}
        onOpenChange={setOpen}
        member={selectedMember}
      />
    </div>
  )
}
