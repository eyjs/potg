'use client'

import { Crown, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { useConfirm } from '@/common/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { maxPlayersPerTeam, type RoomStateTeam, type RosterMode } from '../../types'

interface Props {
  team: RoomStateTeam | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 선수 회수 — 마스터 전용. 미지정 시 회수 버튼 숨김(열람 전용). */
  onRecall?: (playerId: string) => void
  rosterMode?: RosterMode
}

/**
 * 팀 상세 모달 — 소속 선수 목록과 회수 버튼.
 * 회수 시 백엔드가 캡틴 포인트 환불 + 선수를 대기 풀로 되돌린다(undoSoldPlayer).
 */
export function TeamDetailDialog({
  team,
  open,
  onOpenChange,
  onRecall,
  rosterMode = 'CAPTAIN',
}: Props) {
  const confirm = useConfirm()
  if (!team) return null

  const maxPlayers = maxPlayersPerTeam(rosterMode)
  const teamName = team.teamName ?? `${team.captainName} 팀`
  const totalSpent = team.members
    .filter((m) => !m.wasUnsold)
    .reduce((s, m) => s + m.price, 0)

  const handleRecall = async (playerId: string, name: string, price: number) => {
    if (!onRecall) return
    const ok = await confirm({
      title: `${name} 선수를 회수하시겠습니까?`,
      description: `팀에서 제외되고 ${price.toLocaleString()}P가 팀장에게 환불되며, 선수는 다시 경매 대기 목록으로 이동합니다.`,
      variant: 'destructive',
      confirmText: '회수',
    })
    if (!ok) return
    onRecall(playerId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            {teamName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
          <span>팀장 {team.captainName}</span>
          <span className="tabular-nums">
            선수 {team.members.length}/{maxPlayers} · 잔여{' '}
            <span className="text-primary font-bold">
              {team.points.toLocaleString()}P
            </span>{' '}
            · 사용 {totalSpent.toLocaleString()}P
          </span>
        </div>

        {team.members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            영입한 선수가 없습니다.
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {team.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-sm bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground w-12 shrink-0">
                    {m.role}
                  </span>
                  <span className="font-semibold truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      'tabular-nums text-sm',
                      m.wasUnsold ? 'text-muted-foreground' : 'text-primary',
                    )}
                  >
                    {m.wasUnsold ? '유찰배정' : `${m.price.toLocaleString()}P`}
                  </span>
                  {onRecall && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecall(m.id, m.name, m.price)}
                      className="h-7 border-ow-red text-ow-red hover:bg-ow-red/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      회수
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
