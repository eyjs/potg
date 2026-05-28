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
import { TeamRosters } from './parts/team-rosters'
import type { RoomState } from '../types'

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
  const currentBidAmount = roomState.currentBid?.amount ?? 0
  const isHighestBidder =
    roomState.currentBid?.bidderId === userId && phase === 'BIDDING'
  const targetPlayerId = roomState.auction.currentBiddingPlayerId

  const minBid = currentBidAmount + 1
  // 매물 변경 시 자동 reset 없음 — 사용자가 직접 minBid 힌트 보고 입력.
  // (setState-in-effect 회피 + 사용자가 미리 입력해둔 값을 의도치 않게 덮어쓰지 않음)
  const [bidInput, setBidInput] = useState<string>('')

  const bidAmount = parseInt(bidInput, 10)
  const isValidAmount =
    !isNaN(bidAmount) && bidAmount > currentBidAmount && bidAmount <= myPoints
  const canBid =
    phase === 'BIDDING' &&
    targetPlayerId !== null &&
    !!userId &&
    isValidAmount &&
    !isHighestBidder

  const handleBid = () => {
    if (!canBid || !userId || !targetPlayerId) return
    emit.placeBid(userId, targetPlayerId, bidAmount)
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
              입찰자(팀장) — {me?.user?.battleTag ?? '대기'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                내 잔여
              </p>
              <p className="text-2xl font-black tabular-nums text-primary">
                {myPoints.toLocaleString()}P
              </p>
            </div>
            <BidTimer remainingTime={timerRemaining} />
          </div>
        </CardContent>
      </Card>

      {/* 메인 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CurrentPlayerCard
            player={roomState.currentPlayer}
            currentBid={roomState.currentBid}
            biddingPhase={phase}
          />
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                입찰 금액
              </Label>
              <Input
                type="number"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                disabled={phase !== 'BIDDING'}
                min={minBid}
                className="bg-background text-xl font-bold tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                최소: {minBid.toLocaleString()}P · 최대: {myPoints.toLocaleString()}P
              </p>
            </div>

            <Button
              onClick={handleBid}
              disabled={!canBid}
              className={cn(
                'w-full skew-x-[-10deg] bg-primary py-3 font-bold text-black',
                'hover:bg-primary/90 disabled:opacity-40',
              )}
            >
              <span className="skew-x-[10deg] flex items-center gap-2 justify-center">
                <Gavel className="w-4 h-4" />
                {isHighestBidder ? '내가 최고 입찰자' : '입찰'}
              </span>
            </Button>

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
              <p className="text-xs text-primary text-center">
                현재 최고 입찰자입니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <TeamRosters teams={roomState.teams} myCaptainId={userId} showPrice />
    </div>
  )
}
