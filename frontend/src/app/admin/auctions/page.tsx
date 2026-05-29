'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  adminAuctionsApi,
  type AuctionHistoryRow,
  type AuctionDetailParticipant,
} from '@/modules/admin/api/auctions'
import {
  auctionPayoutSchema,
  type AuctionPayoutFormValues,
} from '@/modules/admin/schemas/auction-payout.schema'
import { DataTable, type ColumnDef } from '@/modules/admin/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { useConfirm } from '@/common/components/confirm-dialog'
import { handleApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { Crown, Gavel } from 'lucide-react'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const columns: ColumnDef<AuctionHistoryRow>[] = [
  {
    key: 'title',
    header: '제목',
    render: (r) => <span className="font-medium">{r.title}</span>,
  },
  { key: 'completedAt', header: '종료일', render: (r) => fmtDate(r.completedAt) },
  {
    key: 'teamCount',
    header: '팀 수',
    render: (r) => <span className="tabular-nums">{r.teamCount}</span>,
  },
  {
    key: 'recruited',
    header: '영입 / 매물',
    render: (r) => (
      <span className="tabular-nums">
        {r.recruitedCount} / {r.playerCount}
      </span>
    ),
  },
  { key: 'creatorName', header: '마스터' },
]

interface TeamGroup {
  captainId: string
  captainName: string
  members: AuctionDetailParticipant[]
}

export default function AdminAuctionsPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ['admin', 'auctions'],
    queryFn: () => adminAuctionsApi.list(),
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'auctions', selectedId],
    queryFn: () => adminAuctionsApi.detail(selectedId as string),
    enabled: !!selectedId,
  })

  const form = useForm<AuctionPayoutFormValues>({
    resolver: zodResolver(auctionPayoutSchema),
    defaultValues: { amountPerUser: 0 },
  })

  // 팀 그룹핑: 캡틴별 영입 선수 + 미배정 그룹
  const { teams, unassigned } = useMemo(() => {
    if (!detail) return { teams: [] as TeamGroup[], unassigned: [] }
    const captains = detail.participants.filter((p) => p.role === 'CAPTAIN')
    const players = detail.participants.filter((p) => p.role === 'PLAYER')
    const teamList: TeamGroup[] = captains.map((c) => ({
      captainId: c.userId,
      captainName: c.name,
      members: players.filter((p) => p.assignedTeamCaptainId === c.userId),
    }))
    const unassignedPlayers = players.filter((p) => !p.assignedTeamCaptainId)
    return { teams: teamList, unassigned: unassignedPlayers }
  }, [detail])

  const handlePayout = form.handleSubmit(async (values) => {
    if (!detail) return
    const ok = await confirm({
      title: '포인트 지급',
      description: `${detail.title} 의 전체 참가자 ${detail.payout.totalRecipients}명에게 1인당 ${values.amountPerUser.toLocaleString()}P를 지급합니다. (이미 지급된 인원은 자동 제외)`,
      confirmText: '지급',
    })
    if (!ok) return
    try {
      const result = await adminAuctionsApi.payout(
        detail.id,
        values.amountPerUser,
      )
      toast.success(
        `지급 완료 — ${result.paid}명 지급, ${result.skipped}명 제외(중복)`,
      )
      form.reset({ amountPerUser: 0 })
      queryClient.invalidateQueries({ queryKey: ['admin', 'auctions'] })
    } catch (e) {
      handleApiError(e, '포인트 지급에 실패했습니다.')
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic uppercase text-foreground">
          경매 이력
        </h1>
        <span className="text-sm text-muted-foreground">
          완료 {auctions.length}건
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={auctions}
        loading={isLoading}
        emptyMessage="완료된 경매가 없습니다."
        onRowClick={(row) => setSelectedId(row.id)}
      />

      <Dialog
        open={!!selectedId}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null)
            form.reset({ amountPerUser: 0 })
          }
        }}
      >
        <DialogContent className="bg-card border-border text-foreground sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold italic uppercase">
              {detail?.title ?? '경매 상세'}
            </DialogTitle>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              불러오는 중...
            </div>
          ) : (
            <div className="space-y-5">
              {/* 메타 */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>종료 {fmtDate(detail.completedAt)}</span>
                <span>마스터 {detail.creatorName}</span>
                <span>시작 포인트 {detail.startingPoints.toLocaleString()}P</span>
                <span>
                  지급 {detail.payout.paidCount}/{detail.payout.totalRecipients}명
                </span>
              </div>

              {/* 팀 로스터 */}
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((team) => (
                  <div
                    key={team.captainId}
                    className="rounded-sm border border-border bg-background/40 p-3"
                  >
                    <div className="flex items-center gap-2 border-b border-border/60 pb-2 mb-2">
                      <Crown className="size-4 text-primary" />
                      <span className="font-bold">{team.captainName}</span>
                    </div>
                    {team.members.length === 0 ? (
                      <p className="text-xs text-muted-foreground">영입 없음</p>
                    ) : (
                      <ul className="space-y-1">
                        {team.members.map((m) => (
                          <li
                            key={m.userId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="flex items-center gap-1.5">
                              {m.name}
                              {m.wasUnsold && (
                                <span className="text-[10px] text-muted-foreground">
                                  (유찰배정)
                                </span>
                              )}
                              {m.rewarded && (
                                <span className="text-[10px] text-[var(--ow-blue)]">
                                  ✓지급
                                </span>
                              )}
                            </span>
                            <span className="tabular-nums text-primary font-semibold">
                              {m.soldPrice.toLocaleString()}P
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {unassigned.length > 0 && (
                <div className="rounded-sm border border-border/60 bg-background/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    미배정 매물 {unassigned.length}명
                  </p>
                  <p className="text-sm">
                    {unassigned.map((p) => p.name).join(', ')}
                  </p>
                </div>
              )}

              {/* 정액 지급 */}
              <form
                onSubmit={handlePayout}
                className="space-y-3 rounded-sm border border-primary/30 bg-background/40 p-4"
              >
                <div className="flex items-center gap-2">
                  <Gavel className="size-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase">참가자 보상 지급</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  전체 참가자(팀장+영입선수) {detail.payout.totalRecipients}명에게
                  1인당 동일 금액을 지급합니다. 이미 지급된 인원은 자동
                  제외됩니다.
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="amountPerUser">1인당 지급 포인트</Label>
                    <Input
                      id="amountPerUser"
                      type="number"
                      min={1}
                      {...form.register('amountPerUser', {
                        valueAsNumber: true,
                      })}
                      placeholder="예: 500"
                      aria-invalid={!!form.formState.errors.amountPerUser}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className={cn('skew-x-[-10deg] bg-primary font-bold')}
                  >
                    <span className="skew-x-[10deg]">
                      {form.formState.isSubmitting ? '지급 중...' : '지급'}
                    </span>
                  </Button>
                </div>
                {form.formState.errors.amountPerUser && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.amountPerUser.message}
                  </p>
                )}
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
