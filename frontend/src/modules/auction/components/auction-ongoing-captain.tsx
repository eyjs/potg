'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamSidebar } from './parts/team-sidebar'
import { PlayerQueue } from './parts/player-queue'
import type { RoomState } from '../types'

/**
 * 입찰 input + 버튼.
 * 매물 변경 시 부모가 key={targetPlayerId} 로 재마운트 → 직전 매물에 입력했던
 * 잔여 값이 자동 초기화된다 (setState-in-effect 없이).
 */
function BidInputRow({
  disabled,
  minBid,
  maxBid,
  onSubmit,
}: {
  disabled: boolean
  minBid: number
  maxBid: number
  onSubmit: (amount: number) => void
}) {
  const [value, setValue] = useState('')
  const parsed = parseInt(value, 10)
  const isValid =
    !isNaN(parsed) && parsed >= minBid && parsed <= maxBid && !disabled

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit(parsed)
    setValue('')
  }

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValid) handleSubmit()
        }}
        disabled={disabled}
        placeholder={String(minBid)}
        min={minBid}
        className="bg-background text-2xl font-bold tabular-nums h-14 flex-1"
      />
      <Button
        onClick={handleSubmit}
        disabled={!isValid}
        className={cn(
          'h-14 px-6 skew-x-[-10deg] bg-primary font-bold text-black',
          'hover:bg-primary/90 disabled:opacity-40',
        )}
      >
        <span className="skew-x-[10deg] flex items-center gap-2">
          <Gavel className="w-5 h-5" />
          입찰
        </span>
      </Button>
    </div>
  )
}

interface AuctionEmitFns {
  placeBid: (bidderId: string, targetPlayerId: string, amount: number) => void
}

interface Props {
  roomState: RoomState
  timerRemaining: number | null
  userId: string | null
  emit: AuctionEmitFns
}

export function AuctionOngoingCaptain({
  roomState,
  timerRemaining,
  userId,
  emit,
}: Props) {
  const me = useMemo(
    () => roomState.participants.find((p) => p.userId === userId),
    [roomState, userId],
  )

  const myPoints = me?.currentPoints ?? 0
  const phase = roomState.auction.biddingPhase
  const isAssigning = roomState.auction.status === 'ASSIGNING'
  const currentBidAmount = roomState.currentBid?.amount ?? 0
  const isHighestBidder =
    roomState.currentBid?.bidderId === userId && phase === 'BIDDING'
  const targetPlayerId = roomState.auction.currentBiddingPlayerId

  const minBid = currentBidAmount + 1
  const bidDisabled =
    phase !== 'BIDDING' ||
    targetPlayerId === null ||
    !userId ||
    isHighestBidder

  const handleBid = (amount: number) => {
    if (bidDisabled || !userId || !targetPlayerId) return
    emit.placeBid(userId, targetPlayerId, amount)
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
              팀장 — {me?.user?.battleTag ?? '대기'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                내 잔여
              </p>
              <p className="text-2xl font-black tabular-nums text-primary">
                {myPoints.toLocaleString()}P
              </p>
            </div>
            {!isAssigning && <BidTimer remainingTime={timerRemaining} />}
          </div>
        </CardContent>
      </Card>

      {isAssigning && (
        <Card className="bg-card border-primary/30">
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            마스터가 유찰자를 각 팀에 수동 배정 중입니다...
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* 좌측 — 팀 카드 (본인 팀 강조) */}
        <aside className="col-span-12 lg:col-span-3 space-y-2">
          <TeamSidebar teams={roomState.teams} myCaptainId={userId} />
        </aside>

        {/* 중앙 — 매물 + 입찰 패널 */}
        <section className="col-span-12 lg:col-span-6 space-y-3">
          <CurrentPlayerCard
            player={roomState.currentPlayer}
            currentBid={roomState.currentBid}
            biddingPhase={phase}
          />

          {/* 입찰 패널 */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                  입찰 금액 (최소 {minBid.toLocaleString()}P · 최대 {myPoints.toLocaleString()}P)
                </Label>
                <BidInputRow
                  key={targetPlayerId ?? 'none'}
                  disabled={bidDisabled}
                  minBid={minBid}
                  maxBid={myPoints}
                  onSubmit={handleBid}
                />
              </div>

              {phase === 'WAITING' && (
                <p className="text-xs text-muted-foreground text-center">
                  마스터가 다음 매물을 선택할 때까지 대기 중...
                </p>
              )}
              {phase === 'SOLD' && (
                <p className="text-xs text-muted-foreground text-center">
                  낙찰 완료. 다음 매물 대기 중...
                </p>
              )}
              {isHighestBidder && phase === 'BIDDING' && (
                <p className="text-sm text-primary text-center font-bold">
                  ⭐ 현재 최고 입찰자입니다.
                </p>
              )}
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
    </div>
  )
}
