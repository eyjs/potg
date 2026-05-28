'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { useConfirm } from '@/common/components/confirm-dialog'
import {
  Hammer,
  SkipForward,
  ChevronRight,
  Square,
  RotateCcw,
  Users,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamSidebar } from './parts/team-sidebar'
import { PlayerQueue } from './parts/player-queue'
import { AssignmentPanel } from './parts/assignment-panel'
import type { RoomState } from '../types'
import type { AuctionEmitFns } from '../hooks/use-auction-socket'

interface Props {
  roomState: RoomState
  timerRemaining: number | null
  emit: AuctionEmitFns
}

export function AuctionOngoingMaster({ roomState, timerRemaining, emit }: Props) {
  const confirm = useConfirm()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')

  const phase = roomState.auction.biddingPhase
  const status = roomState.auction.status

  const players = roomState.participants.filter((p) => p.role === 'PLAYER')
  const unassigned = players.filter((p) => p.assignedTeamCaptainId === null)
  const unattempted = unassigned.filter((p) => !p.wasUnsold)
  const unsoldOnly = unassigned.filter((p) => p.wasUnsold)

  const cycleComplete = unattempted.length === 0
  const allAssigned = unassigned.length === 0
  const isAssigning = status === 'ASSIGNING'

  const selectablePool = useMemo(() => {
    const hasUnattempted = roomState.unsoldPlayers.some(
      (up) => !up.wasUnsold,
    )
    return hasUnattempted
      ? roomState.unsoldPlayers.filter((up) => !up.wasUnsold)
      : roomState.unsoldPlayers
  }, [roomState.unsoldPlayers])

  const handleSelectStart = () => {
    if (!selectedPlayerId) return
    emit.selectPlayer(selectedPlayerId)
    setSelectedPlayerId('')
  }

  const handleEnterAssignment = async () => {
    const ok = await confirm({
      title: '유찰자 배정 단계로 진입하시겠습니까?',
      description: `유찰 ${unsoldOnly.length}명을 각 팀에 드래그앤드롭으로 배정합니다.`,
      confirmText: '진입',
    })
    if (!ok) return
    emit.enterAssignmentPhase()
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: '경매를 리셋하시겠습니까?',
      description:
        '모든 팀 배정과 입찰이 초기화됩니다. 팀장과 매물 등록은 유지됩니다.',
      variant: 'destructive',
      confirmText: '리셋',
    })
    if (!ok) return
    emit.resetAuction()
  }

  const handleComplete = async () => {
    if (!allAssigned) return
    const ok = await confirm({
      title: '경매를 종료하시겠습니까?',
      description: `팀 ${roomState.teams.length}개, 총 ${players.length}명 배정 완료.`,
      confirmText: '종료',
    })
    if (!ok) return
    emit.completeAuction()
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="bg-card border-primary/30">
        <CardContent className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black italic uppercase tracking-tighter truncate">
              {roomState.auction.title}
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              마스터 — {isAssigning ? '유찰자 배정' : '경매 진행'}
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-muted-foreground">
              미배정{' '}
              <span className="text-primary font-bold tabular-nums">
                {unassigned.length}
              </span>
              /<span className="tabular-nums">{players.length}</span>
            </span>
            {!isAssigning && <BidTimer remainingTime={timerRemaining} />}
          </div>
        </CardContent>
      </Card>

      {isAssigning ? (
        <>
          <Card className="bg-card border-border">
            <CardContent className="py-3 flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                유찰자를 각 팀 카드로 드래그하여 배정하세요.
              </div>
              <Button
                onClick={handleComplete}
                disabled={!allAssigned}
                className={cn(
                  'skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black',
                  'hover:bg-primary/90 disabled:opacity-40',
                )}
              >
                <span className="skew-x-[10deg] flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  {allAssigned ? '경매 종료' : `미배정 ${unassigned.length}명`}
                </span>
              </Button>
            </CardContent>
          </Card>

          <AssignmentPanel roomState={roomState} emit={emit} />
        </>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* 좌측 — 팀 카드 */}
          <aside className="col-span-12 lg:col-span-3 space-y-2">
            <TeamSidebar teams={roomState.teams} />
          </aside>

          {/* 중앙 — 매물 + 경매조작 패널 */}
          <section className="col-span-12 lg:col-span-6 space-y-3">
            <CurrentPlayerCard
              player={roomState.currentPlayer}
              currentBid={roomState.currentBid}
              biddingPhase={phase}
            />

            {/* 경매조작 패널 (마스터) */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                {/* 매물 선택 — WAITING */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                      다음 매물
                    </p>
                    <Select
                      value={selectedPlayerId}
                      onValueChange={setSelectedPlayerId}
                      disabled={phase !== 'WAITING' || selectablePool.length === 0}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="대기 풀에서 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectablePool.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.role.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleSelectStart}
                    disabled={!selectedPlayerId || phase !== 'WAITING'}
                    className={cn(
                      'skew-x-[-10deg] bg-primary px-4 text-sm font-bold text-black',
                      'hover:bg-primary/90 disabled:opacity-40',
                    )}
                  >
                    <span className="skew-x-[10deg] flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" />
                      시작
                    </span>
                  </Button>
                </div>

                {/* 입찰 처리 + 다음 — 한 행 */}
                <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
                  <Button
                    onClick={() => emit.confirmBid()}
                    disabled={phase !== 'BIDDING' || !roomState.currentBid}
                    className="bg-primary text-black font-bold hover:bg-primary/90 disabled:opacity-40"
                  >
                    <Hammer className="w-4 h-4 mr-1" />
                    낙찰
                  </Button>
                  <Button
                    onClick={() => emit.passPlayer()}
                    disabled={phase !== 'BIDDING'}
                    variant="outline"
                    className="border-ow-red text-ow-red hover:bg-ow-red/10 disabled:opacity-40"
                  >
                    <SkipForward className="w-4 h-4 mr-1" />
                    유찰
                  </Button>
                  <Button
                    onClick={() => emit.nextPlayer()}
                    disabled={phase !== 'SOLD'}
                    className="bg-ow-blue text-black font-bold hover:bg-ow-blue/90 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4 mr-1" />
                    다음
                  </Button>
                </div>

                {/* 사이클 완료 안내 → 배정 진입 */}
                {cycleComplete && unsoldOnly.length > 0 && phase === 'WAITING' && (
                  <Button
                    onClick={handleEnterAssignment}
                    className="w-full bg-primary text-black font-bold hover:bg-primary/90"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    유찰자 배정 단계로 ({unsoldOnly.length}명)
                  </Button>
                )}

                {/* 리셋 + 종료 */}
                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    size="sm"
                    className="text-ow-red hover:text-ow-red hover:bg-ow-red/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    리셋
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={!allAssigned}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'border-primary text-primary',
                      allAssigned && 'bg-primary text-black hover:bg-primary/90',
                      'disabled:opacity-40',
                    )}
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    {allAssigned ? '종료' : `종료 (${unassigned.length})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 우측 — 남은 매물 큐 */}
          <aside className="col-span-12 lg:col-span-3">
            <PlayerQueue
              players={roomState.unsoldPlayers}
              currentPlayerId={roomState.auction.currentBiddingPlayerId}
            />
          </aside>
        </div>
      )}
    </div>
  )
}
