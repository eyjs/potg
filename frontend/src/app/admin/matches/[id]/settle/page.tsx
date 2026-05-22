'use client'

import { use, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { matchesApi, type MatchTeam } from '@/modules/admin/api/matches'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { cn } from '@/lib/utils'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useConfirm } from '@/common/components/confirm-dialog'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AdminMatchSettlePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const confirm = useConfirm()
  const [winnerTeamId, setWinnerTeamId] = useState('')
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const { data: match, isLoading } = useQuery({
    queryKey: ['admin', 'matches', id],
    queryFn: () => matchesApi.detail(id),
  })

  // LOCKED 상태가 아니면 리다이렉트
  useEffect(() => {
    if (!isLoading && match && match.status !== 'LOCKED') {
      toast.error('LOCKED 상태의 내전만 정산할 수 있습니다.')
      router.replace(`/admin/matches/${id}`)
    }
  }, [match, isLoading, id, router])

  // 팀이 로드되면 초기 placement 구조 설정
  useEffect(() => {
    if (match?.teams) {
      const initial: Record<string, string> = {}
      match.teams.forEach((t, i) => {
        initial[t.id] = String(i + 1)
      })
      setPlacements(initial)
    }
  }, [match?.teams])

  const validatePlacements = (teams: MatchTeam[]): string | null => {
    const ranks = teams.map((t) => parseInt(placements[t.id] ?? '', 10))
    const hasInvalid = ranks.some((r) => isNaN(r) || r < 1)
    if (hasInvalid) return '모든 팀의 순위를 입력하세요.'

    const hasDuplicate = new Set(ranks).size !== ranks.length
    if (hasDuplicate) return '순위가 중복되었습니다. 각 팀의 순위는 고유해야 합니다.'

    return null
  }

  const handleSubmit = async () => {
    if (!match?.teams) return

    if (!winnerTeamId) {
      toast.error('승리 팀을 선택하세요.')
      return
    }

    const validationError = validatePlacements(match.teams)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const confirmed = await confirm({
      title: '정산 확인',
      description: '정산은 되돌릴 수 없습니다. 계속하시겠습니까?',
      confirmText: '정산 실행',
      variant: 'destructive',
    })
    if (!confirmed) return

    setSubmitting(true)
    try {
      const placementsDto = match.teams.map((t) => ({
        teamId: t.id,
        rank: parseInt(placements[t.id], 10),
      }))

      await matchesApi.settle(id, {
        winnerTeamId,
        placements: placementsDto,
      })
      toast.success('정산이 완료되었습니다.')
      router.replace(`/admin/matches/${id}`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message ?? '정산에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

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

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/matches/${id}`)}
          className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          aria-label="뒤로"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-black italic uppercase flex-1">
          결과 입력 — {match.title}
        </h1>
      </div>

      <div className="bg-card border border-border rounded-sm p-6 space-y-6">
        {/* Winner Selection */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            승리 팀 선택
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {match.teams?.map((team) => (
              <label
                key={team.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-colors',
                  winnerTeamId === team.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <input
                  type="radio"
                  name="winner"
                  value={team.id}
                  checked={winnerTeamId === team.id}
                  onChange={() => setWinnerTeamId(team.id)}
                  className="accent-primary focus-visible:outline-none"
                  aria-label={`${team.name} 선택`}
                />
                <span className="font-bold">{team.name}</span>
                {winnerTeamId === team.id && (
                  <span className="ml-auto text-primary text-xs font-bold">승리</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Placement Input */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm uppercase text-muted-foreground">
            팀별 순위
          </h2>
          <div className="space-y-2">
            {match.teams?.map((team) => (
              <div key={team.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium">{team.name}</span>
                <div className="w-24">
                  <Label htmlFor={`rank-${team.id}`} className="sr-only">
                    {team.name} 순위
                  </Label>
                  <Input
                    id={`rank-${team.id}`}
                    type="number"
                    min={1}
                    max={match.teams?.length}
                    value={placements[team.id] ?? ''}
                    onChange={(e) =>
                      setPlacements((prev) => ({
                        ...prev,
                        [team.id]: e.target.value,
                      }))
                    }
                    aria-label={`${team.name} 순위 입력`}
                  />
                </div>
                <span className="text-muted-foreground text-xs w-4">위</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/matches/${id}`)}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant="destructive"
          >
            {submitting ? '정산 중...' : '정산 실행'}
          </Button>
        </div>
      </div>
    </div>
  )
}
