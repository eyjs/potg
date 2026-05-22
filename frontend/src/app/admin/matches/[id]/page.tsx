'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { matchesApi, type MatchStatus } from '@/modules/admin/api/matches'
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
import { ArrowLeft, ExternalLink, Trophy } from 'lucide-react'
import { useConfirm } from '@/common/components/confirm-dialog'

const STATUS_LABEL: Record<MatchStatus, string> = {
  DRAFT: 'DRAFT',
  BETTING_OPEN: 'BETTING_OPEN',
  LOCKED: 'LOCKED',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED',
}

const STATUS_FLOW: MatchStatus[] = [
  'DRAFT',
  'BETTING_OPEN',
  'LOCKED',
  'SETTLED',
]

const STATUS_CLASS: Record<MatchStatus, string> = {
  DRAFT: 'border-border text-muted-foreground bg-muted',
  BETTING_OPEN: 'border-[var(--ow-blue)] text-[var(--ow-blue)] bg-[var(--ow-blue)]/10',
  LOCKED: 'border-primary text-primary bg-primary/10',
  SETTLED: 'border-green-500 text-green-400 bg-green-900/20',
  CANCELLED: 'border-destructive text-destructive bg-destructive/10',
}

interface AddTeamFormValues {
  name: string
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AdminMatchDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [addTeamOpen, setAddTeamOpen] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const { data: match, isLoading } = useQuery({
    queryKey: ['admin', 'matches', id],
    queryFn: () => matchesApi.detail(id),
  })

  const addTeamForm = useForm<AddTeamFormValues>({
    defaultValues: { name: '' },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'matches', id] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'matches'] })
  }

  const handleTransition = async (action: 'open' | 'lock' | 'cancel') => {
    const labels = { open: '베팅 오픈', lock: '베팅 잠금', cancel: '취소' }
    const confirmed = await confirm({
      title: `${labels[action]}`,
      description: `상태를 "${labels[action]}"으로 변경합니까?`,
      confirmText: '확인',
      variant: action === 'cancel' ? 'destructive' : 'default',
    })
    if (!confirmed) return

    setTransitioning(true)
    try {
      if (action === 'open') await matchesApi.open(id)
      else if (action === 'lock') await matchesApi.lock(id)
      else if (action === 'cancel') await matchesApi.cancel(id)
      toast.success('상태가 변경되었습니다.')
      invalidate()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message ?? '상태 변경에 실패했습니다.')
    } finally {
      setTransitioning(false)
    }
  }

  const handleAddTeam = addTeamForm.handleSubmit(async (values) => {
    try {
      await matchesApi.addTeam(id, { name: values.name })
      toast.success('팀이 추가되었습니다.')
      invalidate()
      setAddTeamOpen(false)
      addTeamForm.reset()
    } catch {
      toast.error('팀 추가에 실패했습니다.')
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        로딩 중...
      </div>
    )
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        내전을 찾을 수 없습니다.
      </div>
    )
  }

  const isCancelled = match.status === 'CANCELLED'
  const isSettled = match.status === 'SETTLED'
  const isFinished = isCancelled || isSettled

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/matches')}
          className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          aria-label="목록으로"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-black italic uppercase flex-1">{match.title}</h1>
      </div>

      {/* Status Machine */}
      <div className="bg-card border border-border rounded-sm p-4 space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase">상태</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-sm text-xs font-bold border',
                  match.status === s
                    ? STATUS_CLASS[s]
                    : 'border-border text-muted-foreground/40',
                )}
              >
                {STATUS_LABEL[s]}
              </span>
              {i < STATUS_FLOW.length - 1 && (
                <span className="text-muted-foreground text-xs">→</span>
              )}
            </div>
          ))}
          {isCancelled && (
            <span className={cn('px-3 py-1 rounded-sm text-xs font-bold border', STATUS_CLASS.CANCELLED)}>
              CANCELLED
            </span>
          )}
        </div>

        {/* Transition Buttons */}
        <div className="flex gap-2 flex-wrap">
          {match.status === 'DRAFT' && (
            <Button
              onClick={() => handleTransition('open')}
              disabled={transitioning}
              className="text-sm"
              aria-label="베팅 오픈"
            >
              베팅 오픈
            </Button>
          )}
          {match.status === 'BETTING_OPEN' && (
            <Button
              onClick={() => handleTransition('lock')}
              disabled={transitioning}
              className="text-sm"
              aria-label="베팅 잠금"
            >
              베팅 잠금
            </Button>
          )}
          {match.status === 'LOCKED' && (
            <Button
              onClick={() => router.push(`/admin/matches/${id}/settle`)}
              disabled={transitioning}
              className="text-sm"
              aria-label="결과 입력"
            >
              <Trophy className="size-4 mr-1" />
              결과 입력
            </Button>
          )}
          {!isFinished && (
            <Button
              variant="destructive"
              onClick={() => handleTransition('cancel')}
              disabled={transitioning}
              className="text-sm"
              aria-label="취소"
            >
              내전 취소
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/auctions/${id}`)}
            className="text-sm ml-auto"
            aria-label="경매 페이지로"
          >
            <ExternalLink className="size-4 mr-1" />
            경매 페이지
          </Button>
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground uppercase">팀 ({match.teams?.length ?? 0})</h2>
          {!isFinished && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddTeamOpen(true)}
              aria-label="팀 추가"
            >
              팀 추가
            </Button>
          )}
        </div>

        {(!match.teams || match.teams.length === 0) ? (
          <p className="text-muted-foreground text-sm">팀이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {match.teams.map((team) => (
              <div key={team.id} className="bg-card border border-border rounded-sm p-4">
                <p className="font-bold text-primary mb-2">{team.name}</p>
                {team.members && team.members.length > 0 ? (
                  <ul className="space-y-1">
                    {team.members.map((m) => (
                      <li key={m.id} className="text-sm text-muted-foreground flex items-center gap-2">
                        {m.rank != null && (
                          <span className="text-primary font-bold text-xs w-4">{m.rank}</span>
                        )}
                        {m.username}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">멤버 없음</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Team Dialog */}
      <Dialog open={addTeamOpen} onOpenChange={setAddTeamOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>팀 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTeam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">팀 이름</Label>
              <Input
                id="team-name"
                {...addTeamForm.register('name', { required: '팀 이름을 입력하세요' })}
                placeholder="팀 이름"
              />
              {addTeamForm.formState.errors.name && (
                <p className="text-destructive text-xs">
                  {addTeamForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddTeamOpen(false)} type="button">취소</Button>
              <Button type="submit">추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
