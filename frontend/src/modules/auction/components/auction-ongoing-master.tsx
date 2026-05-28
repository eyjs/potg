'use client'

import { useState } from 'react'
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
import { Hammer, SkipForward, ChevronRight, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamRosters } from './parts/team-rosters'
import type { RoomState } from '../types'

interface AuctionEmitFns {
  selectPlayer: (playerId: string) => void
  confirmBid: () => void
  passPlayer: () => void
  nextPlayer: () => void
  completeAuction: () => void
}

interface Props {
  roomState: RoomState
  timerRemaining: number | null
  emit: AuctionEmitFns
}

export function AuctionOngoingMaster({ roomState, timerRemaining, emit }: Props) {
  const confirm = useConfirm()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')

  const phase = roomState.auction.biddingPhase
  const waitingPool = roomState.unsoldPlayers

  const handleSelectStart = () => {
    if (!selectedPlayerId) return
    emit.selectPlayer(selectedPlayerId)
    setSelectedPlayerId('')
  }

  const handleConfirm = () => emit.confirmBid()
  const handlePass = () => emit.passPlayer()
  const handleNext = () => emit.nextPlayer()

  const handleComplete = async () => {
    const ok = await confirm({
      title: '경매를 종료하시겠습니까?',
      description: '미낙찰 선수는 무소속으로 남게 됩니다.',
      variant: 'destructive',
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
              진행자(마스터) — 흐름 조율
            </p>
          </div>
          <BidTimer remainingTime={timerRemaining} />
        </CardContent>
      </Card>

      {/* 메인 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 현재 매물 */}
        <div className="lg:col-span-2">
          <CurrentPlayerCard
            player={roomState.currentPlayer}
            currentBid={roomState.currentBid}
            biddingPhase={phase}
          />
        </div>

        {/* 컨트롤 */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-4">
            {/* 매물 선택 — WAITING phase 만 활성 */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                다음 매물 선택
              </p>
              <div className="flex gap-2">
                <Select
                  value={selectedPlayerId}
                  onValueChange={setSelectedPlayerId}
                  disabled={phase !== 'WAITING' || waitingPool.length === 0}
                >
                  <SelectTrigger className="bg-background flex-1">
                    <SelectValue placeholder="대기 풀에서 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {waitingPool.map((p) => (
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
                대기 {waitingPool.length}명
              </p>
            </div>

            {/* BIDDING 액션 */}
            <div className="space-y-2 border-t border-border/40 pt-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                입찰 처리
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleConfirm}
                  disabled={phase !== 'BIDDING' || !roomState.currentBid}
                  className="bg-primary text-black font-bold hover:bg-primary/90 disabled:opacity-40"
                >
                  <Hammer className="w-4 h-4 mr-1" />
                  낙찰 확정
                </Button>
                <Button
                  onClick={handlePass}
                  disabled={phase !== 'BIDDING'}
                  variant="outline"
                  className="border-ow-red text-ow-red hover:bg-ow-red/10 disabled:opacity-40"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  유찰
                </Button>
              </div>
            </div>

            {/* SOLD → 다음 */}
            <div className="space-y-2 border-t border-border/40 pt-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                다음 매물로
              </p>
              <Button
                onClick={handleNext}
                disabled={phase !== 'SOLD'}
                className="w-full bg-ow-blue text-black font-bold hover:bg-ow-blue/90 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                다음 진행
              </Button>
              <p className="text-[11px] text-muted-foreground">
                낙찰/유찰 후 마스터가 명시적으로 진행해야 다음 매물 경매가 시작됩니다.
              </p>
            </div>

            {/* 종료 */}
            <div className="border-t border-border/40 pt-3">
              <Button
                onClick={handleComplete}
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Square className="w-4 h-4 mr-2" />
                경매 종료
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 팀 로스터 */}
      <TeamRosters teams={roomState.teams} showPrice />
    </div>
  )
}
