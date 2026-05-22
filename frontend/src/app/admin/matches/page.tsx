'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { matchesApi, type AdminMatch, type MatchStatus } from '@/modules/admin/api/matches'
import { matchCreateSchema, type MatchCreateFormValues } from '@/modules/admin/schemas/match-create.schema'
import { DataTable, type ColumnDef } from '@/modules/admin/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

const STATUS_LABEL: Record<MatchStatus, string> = {
  DRAFT: '준비',
  BETTING_OPEN: '배팅중',
  LOCKED: '잠금',
  SETTLED: '정산완료',
  CANCELLED: '취소',
}

const STATUS_CLASS: Record<MatchStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  BETTING_OPEN: 'bg-[var(--ow-blue)]/20 text-[var(--ow-blue)]',
  LOCKED: 'bg-primary/20 text-primary',
  SETTLED: 'bg-green-900/30 text-green-400',
  CANCELLED: 'bg-destructive/20 text-destructive',
}

const ALL_STATUSES: Array<MatchStatus | 'ALL'> = [
  'ALL',
  'DRAFT',
  'BETTING_OPEN',
  'LOCKED',
  'SETTLED',
  'CANCELLED',
]

const columns: ColumnDef<AdminMatch>[] = [
  { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span> },
  {
    key: 'title',
    header: '제목',
    render: (r) => <span className="font-medium">{r.title}</span>,
  },
  {
    key: 'status',
    header: '상태',
    render: (r) => (
      <span className={cn('px-2 py-0.5 rounded-sm text-xs font-bold', STATUS_CLASS[r.status])}>
        {STATUS_LABEL[r.status]}
      </span>
    ),
  },
  {
    key: 'scheduledAt',
    header: '예정일',
    render: (r) => (
      <span className="text-muted-foreground text-xs">
        {new Date(r.scheduledAt).toLocaleString('ko-KR')}
      </span>
    ),
  },
  {
    key: 'teams',
    header: '팀',
    render: (r) => (
      <span className="text-muted-foreground">{r.teams?.length ?? 0}팀</span>
    ),
  },
]

export default function AdminMatchesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'ALL'>('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['admin', 'matches', statusFilter],
    queryFn: () =>
      matchesApi.list(statusFilter !== 'ALL' ? { status: statusFilter } : undefined),
  })

  const form = useForm<MatchCreateFormValues>({
    resolver: zodResolver(matchCreateSchema),
    defaultValues: { title: '', scheduledAt: '', teamCount: 2 },
  })

  const handleCreate = form.handleSubmit(async (values) => {
    try {
      await matchesApi.create(values)
      toast.success('내전이 생성되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'matches'] })
      setCreateOpen(false)
      form.reset()
    } catch {
      toast.error('내전 생성에 실패했습니다.')
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic uppercase text-foreground">
          내전 관리
        </h1>
        <Button
          onClick={() => setCreateOpen(true)}
          className="skew-x-[-8deg]"
          aria-label="내전 생성"
        >
          <span className="skew-x-[8deg] flex items-center gap-2">
            <Plus className="size-4" />
            내전 생성
          </span>
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap" role="group" aria-label="상태 필터">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-sm text-xs font-semibold border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50',
            )}
            aria-pressed={statusFilter === s}
          >
            {s === 'ALL' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={matches}
        loading={isLoading}
        emptyMessage="내전이 없습니다."
        onRowClick={(row) => {
          router.push(`/admin/matches/${row.id}`)
        }}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">내전 생성</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="match-title">제목</Label>
              <Input
                id="match-title"
                {...form.register('title')}
                placeholder="내전 제목을 입력하세요"
                aria-invalid={!!form.formState.errors.title}
              />
              {form.formState.errors.title && (
                <p className="text-destructive text-xs">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-date">예정일</Label>
              <Input
                id="match-date"
                type="datetime-local"
                {...form.register('scheduledAt')}
                aria-invalid={!!form.formState.errors.scheduledAt}
              />
              {form.formState.errors.scheduledAt && (
                <p className="text-destructive text-xs">{form.formState.errors.scheduledAt.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-count">팀 수</Label>
              <Input
                id="team-count"
                type="number"
                min={2}
                max={8}
                {...form.register('teamCount', { valueAsNumber: true })}
                aria-invalid={!!form.formState.errors.teamCount}
              />
              {form.formState.errors.teamCount && (
                <p className="text-destructive text-xs">{form.formState.errors.teamCount.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} type="button">취소</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '생성 중...' : '생성'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
