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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamRosters } from './parts/team-rosters'
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

  // 풀 분류
  const players = roomState.participants.filter((p) => p.role === 'PLAYER')
  const unassigned = players.filter((p) => p.assignedTeamCaptainId === null)
  const unattempted = unassigned.filter((p) => !p.wasUnsold)
  const unsoldOnly = unassigned.filter((p) => p.wasUnsold)

  const cycleComplete = unattempted.length === 0
  const allAssigned = unassigned.length === 0
  const isAssigning = status === 'ASSIGNING'

  // BIDDING/WAITING/SOLD 선택 풀 — 미시도 매물만 (사이클 미완료 시) 또는 유찰자 포함 (사이클 후)
  const selectablePool = useMemo(() => {
    return roomState.unsoldPlayers.filter((up) =>
      unattempted.some((u) => u.userId === up.id),
    ).length > 0
      ? roomState.unsoldPlayers.filter((up) =>
          unattempted.some((u) => u.userId === up.id),
        )
      : roomState.unsoldPlayers
  }, [roomState.unsoldPlayers, unattempted])

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
      description: `팀 ${roomState.teams.length}개, 총 ${players.length}명 배정 완료. 결과를 확정합니다.`,
      confirmText: '종료',
    })
    if (!ok) return
    emit.completeAuction()
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="bg-card border-primary/30">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black italic uppercase tracking-tighter truncate">
              {roomState.auction.title}
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              진행자(마스터) — {isAssigning ? '유찰자 배정 단계' : '경매 진행 중'}
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
                  {allAssigned ? '경매 종료' : `미배정 ${unassigned.length}명 남음`}
                </span>
              </Button>
            </CardContent>
          </Card>

          <AssignmentPanel roomState={roomState} emit={emit} />
        </>
      ) : (
        <>
          {/* 메인 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <CurrentPlayerCard
                player={roomState.currentPlayer}
                currentBid={roomState.currentBid}
                biddingPhase={phase}
              />
            </div>

            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-4">
                {/* 매물 선택 */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    다음 매물 선택
                  </p>
                  <div className="flex gap-2">
                    <Select
                      value={selectedPlayerId}
                      onValueChange={setSelectedPlayerId}
                      disabled={phase !== 'WAITING' || selectablePool.length === 0}
                    >
                      <SelectTrigger className="bg-background flex-1">
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
                    <Button
                      onClick={handleSelectStart}
                      disabled={!selectedPlayerId || phase !== 'WAITING'}
                      className={cn(
                        'skew-x-[-10deg] bg-primary px-4 text-sm font-bold text-black',
                        'hover:bg-primary/90 disabled:opacity-40',
                      )}
                    >
                      <span className="skew-x-[10deg]">시작</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    미시도 {unattempted.length}명 · 유찰 {unsoldOnly.length}명
                  </p>
                </div>

                {/* 입찰 처리 */}
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    입찰 처리
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                </div>

                {/* 다음 진행 */}
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    다음 매물
                  </p>
                  <Button
                    onClick={() => emit.nextPlayer()}
                    disabled={phase !== 'SOLD'}
                    className="w-full bg-ow-blue text-black font-bold hover:bg-ow-blue/90 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4 mr-1" />
                    다음 진행
                  </Button>
                </div>

                {/* 사이클 완료 → 배정 진입 */}
                {cycleComplete && unsoldOnly.length > 0 && phase === 'WAITING' && (
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <p className="text-xs uppercase tracking-widest text-primary font-bold">
                      한 사이클 완료
                    </p>
                    <Button
                      onClick={handleEnterAssignment}
                      className="w-full bg-primary text-black font-bold hover:bg-primary/90"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      유찰자 배정 단계로 ({unsoldOnly.length}명)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 팀 로스터 */}
          <TeamRosters teams={roomState.teams} showPrice />

          {/* 하단: 리셋 + 종료 */}
          <Card className="bg-card border-border">
            <CardContent className="py-3 flex items-center justify-between gap-2">
              <Button
                onClick={handleReset}
                variant="ghost"
                className="text-ow-red hover:text-ow-red hover:bg-ow-red/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                경매 리셋
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!allAssigned}
                variant="outline"
                className={cn(
                  'border-primary text-primary',
                  allAssigned && 'bg-primary text-black hover:bg-primary/90',
                  'disabled:opacity-40',
                )}
                title={
                  allAssigned
                    ? '경매 종료'
                    : `미배정 ${unassigned.length}명 — 모두 배정해야 종료 가능`
                }
              >
                <Square className="w-4 h-4 mr-2" />
                {allAssigned ? '경매 종료' : `종료 (미배정 ${unassigned.length})`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
