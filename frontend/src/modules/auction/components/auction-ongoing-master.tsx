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
  Pause,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { LiveChip } from './parts/fx/live-chip'
import { TeamSidebar } from './parts/team-sidebar'
import { TeamDetailDialog } from './parts/team-detail-dialog'
import { PlayerStatusGrid } from './parts/player-status-grid'
import { AssignmentPanel } from './parts/assignment-panel'
import type { RoomState } from '../types'
import type {
  AuctionBidEvent,
  AuctionChatMessage,
  AuctionStageEvent,
  AuctionEmitFns,
} from '../hooks/use-auction-socket'
import { ChatPanel } from './parts/chat-panel'
import { BidLog } from './parts/bid-log'

interface Props {
  roomState: RoomState
  timerRemaining: number | null
  emit: AuctionEmitFns
  chatMessages?: AuctionChatMessage[]
  bidEvents?: AuctionBidEvent[]
  stageEvent?: AuctionStageEvent | null
  myUserId?: string | null
}

export function AuctionOngoingMaster({
  roomState,
  timerRemaining,
  emit,
  chatMessages,
  bidEvents,
  stageEvent,
  myUserId,
}: Props) {
  const confirm = useConfirm()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [detailCaptainId, setDetailCaptainId] = useState<string | null>(null)
  const detailTeam =
    roomState.teams.find((t) => t.captainId === detailCaptainId) ?? null

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

  // 다음 매물 자동 진행 — 수동 선택이 있으면 그것을, 없으면 대기 풀 첫 매물을
  // 곧바로 입찰에 올린다. selectPlayer 는 WAITING/SOLD 어느 단계에서도 동작하므로
  // 낙찰/유찰 직후에도 버튼 한 번으로 순차 진행된다.
  const handleAdvanceNext = () => {
    if (phase === 'BIDDING') return
    const nextId = selectedPlayerId || selectablePool[0]?.id
    if (!nextId) return
    emit.selectPlayer(nextId)
    setSelectedPlayerId('')
  }

  const canAdvance = phase !== 'BIDDING' && selectablePool.length > 0

  const handleEnterAssignment = async () => {
    const ok = await confirm({
      title: '유찰자 배정 단계로 진입하시겠습니까?',
      description: `유찰 ${unsoldOnly.length}명을 각 팀에 드래그앤드롭으로 배정합니다.`,
      confirmText: '진입',
    })
    if (!ok) return
    emit.enterAssignmentPhase()
  }

  const isPaused = status === 'PAUSED'

  const handleTogglePause = () => {
    if (isPaused) emit.resumeAuction()
    else emit.pauseAuction()
  }

  // 경매 임의 종료 — 남은 매물 전부 유찰 처리 후 수동 배정 단계로
  const handleEndToAssignment = async () => {
    const ok = await confirm({
      title: '경매를 종료하시겠습니까?',
      description: `미배정 매물 ${unassigned.length}명이 전부 유찰 처리되고, 각 팀 카드에 드래그앤드롭으로 수동 배정하는 단계로 이동합니다.`,
      variant: 'destructive',
      confirmText: '종료 (유찰 → 배정)',
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
      <Card className="relative overflow-hidden bg-card/85 border-ow-blue/25 backdrop-blur-sm">
        {/* 상단 에너지 스윕 라인 */}
        <div aria-hidden className="light-sweep absolute inset-x-0 top-0 h-0.5" />
        <CardContent className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="pr-2 text-xl font-black italic uppercase tracking-tighter break-keep leading-tight drop-shadow-[0_0_10px_rgba(0,195,255,0.3)]">
              {roomState.auction.title}
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              마스터 — {isAssigning ? '유찰자 배정' : '경매 진행'}
            </p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <span className="text-muted-foreground">
              미배정{' '}
              <span className="text-primary font-bold tabular-nums">
                {unassigned.length}
              </span>
              /<span className="tabular-nums">{players.length}</span>
            </span>
            {!isAssigning && <BidTimer remainingTime={timerRemaining} totalTime={roomState.auction.turnTimeLimit} phase={phase} />}
            <LiveChip paused={isPaused} />
          </div>
        </CardContent>
      </Card>

      {isPaused && (
        <Card className="bg-card border-primary/50">
          <CardContent className="py-3 text-center text-sm font-bold text-primary">
            ⏸ 경매가 일시정지되었습니다 — 재개 버튼으로 계속하세요.
          </CardContent>
        </Card>
      )}

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
          <aside className="col-span-12 lg:col-span-2 space-y-2">
            <TeamSidebar
              teams={roomState.teams}
              startingPoints={roomState.auction.startingPoints}
              rosterMode={roomState.auction.rosterMode}
              onTeamClick={setDetailCaptainId}
              highlightCaptainId={roomState.currentBid?.bidderId ?? null}
            />
          </aside>

          {/* 중앙 — 매물 + 경매조작 패널 */}
          <section className="col-span-12 lg:col-span-5 space-y-3">
            <CurrentPlayerCard
              player={roomState.currentPlayer}
              currentBid={roomState.currentBid}
              biddingPhase={phase}
              stageEvent={stageEvent}
            />

            {/* 경매조작 패널 (마스터) */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                {/* 매물 선택 — WAITING */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                      매물 지정 (선택 안 하면 순서대로)
                    </p>
                    <Select
                      value={selectedPlayerId}
                      onValueChange={setSelectedPlayerId}
                      disabled={phase === 'BIDDING' || selectablePool.length === 0}
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
                    disabled={!selectedPlayerId || phase === 'BIDDING'}
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
                    className="game-btn game-btn-gold bg-primary text-black font-bold hover:bg-primary/90 disabled:opacity-40"
                  >
                    <Hammer className="w-4 h-4 mr-1" />
                    낙찰
                  </Button>
                  <Button
                    onClick={() => emit.passPlayer()}
                    disabled={phase !== 'BIDDING'}
                    variant="outline"
                    className="game-btn border-ow-red text-ow-red hover:bg-ow-red/10 disabled:opacity-40"
                  >
                    <SkipForward className="w-4 h-4 mr-1" />
                    유찰
                  </Button>
                  <Button
                    onClick={handleAdvanceNext}
                    disabled={!canAdvance}
                    className="game-btn bg-ow-blue text-black font-bold hover:bg-ow-blue/90 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4 mr-1" />
                    다음 매물
                  </Button>
                </div>

                {/* 사이클 완료 안내 → 배정 진입 */}
                {cycleComplete && unsoldOnly.length > 0 && phase !== 'BIDDING' && (
                  <div className="rounded-sm border-2 border-primary bg-primary/10 p-3 space-y-2 ring-2 ring-primary/30 animate-pulse-slow">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                      ⚠ 한 사이클 완료
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      유찰 {unsoldOnly.length}명을 각 팀에 수동 배정하면 경매 종료가 가능합니다.
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

                {/* 일시정지/리셋 + 종료(유찰→배정) */}
                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={handleTogglePause}
                      variant="outline"
                      size="sm"
                      className={cn(
                        isPaused
                          ? 'border-primary text-primary bg-primary/10'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 mr-1" />
                          재개
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 mr-1" />
                          일시정지
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="ghost"
                      size="sm"
                      className="text-ow-red hover:text-ow-red hover:bg-ow-red/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      리셋
                    </Button>
                  </div>
                  {allAssigned ? (
                    <Button
                      onClick={handleComplete}
                      variant="outline"
                      size="sm"
                      className="border-primary bg-primary text-black hover:bg-primary/90"
                    >
                      <Square className="w-3.5 h-3.5 mr-1" />
                      경매 종료
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEndToAssignment}
                      variant="outline"
                      size="sm"
                      className="border-ow-red text-ow-red hover:bg-ow-red/10"
                    >
                      <Square className="w-3.5 h-3.5 mr-1" />
                      종료 — 남은 {unassigned.length}명 유찰 → 배정
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 입찰 로그 — 게임 킬로그 피드 */}
            <BidLog events={bidEvents ?? []} />
          </section>

          {/* 우측 — 매물 현황 */}
          <aside className="col-span-6 lg:col-span-3 space-y-3">
            <PlayerStatusGrid roomState={roomState} />
          </aside>

          {/* 최우측 — 채팅 전용 컬럼 */}
          <aside className="col-span-6 lg:col-span-2">
            {chatMessages && (
              <ChatPanel
                messages={chatMessages}
                onSend={emit.sendChat}
                participants={roomState.participants}
                myUserId={myUserId}
              />
            )}
          </aside>
        </div>
      )}

      {/* 팀 상세 + 낙찰 선수 회수 (마스터 전용) */}
      <TeamDetailDialog
        team={detailTeam}
        open={detailCaptainId !== null}
        onOpenChange={(o) => !o && setDetailCaptainId(null)}
        onRecall={emit.undoSoldPlayer}
        rosterMode={roomState.auction.rosterMode}
      />
    </div>
  )
}
