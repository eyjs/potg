'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Label } from '@/common/components/ui/label'
import { Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamSidebar } from './parts/team-sidebar'
import { PlayerStatusGrid } from './parts/player-status-grid'
import type { RoomState } from '../types'
import type { AuctionChatMessage, AuctionEmitFns } from '../hooks/use-auction-socket'
import { ChatPanel } from './parts/chat-panel'

/** 증액 단위 버튼 — 현재 최고가 + 증액이 새 입찰가가 된다. */
const BID_INCREMENTS = [100, 200, 500, 1000] as const

/** 오버워치 5:5 — 팀장 포함 5명. 팀장이 확보 가능한 선수는 최대 4명. */
const MAX_PLAYERS_PER_CAPTAIN = 4

function BidButtonsRow({
  disabled,
  currentBid,
  maxBid,
  onSubmit,
}: {
  disabled: boolean
  currentBid: number
  maxBid: number
  onSubmit: (amount: number) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {BID_INCREMENTS.map((inc) => {
        const amount = currentBid + inc
        const canBid = !disabled && amount <= maxBid
        return (
          <Button
            key={inc}
            onClick={() => canBid && onSubmit(amount)}
            disabled={!canBid}
            className={cn(
              'h-16 flex-col gap-0.5 skew-x-[-6deg] bg-primary font-bold text-black',
              'hover:bg-primary/90 disabled:opacity-40',
            )}
          >
            <span className="skew-x-[6deg] flex items-center gap-1 text-base font-black">
              <Gavel className="w-3.5 h-3.5" />+{inc}
            </span>
            <span className="skew-x-[6deg] text-[10px] tabular-nums opacity-80">
              {amount.toLocaleString()}P
            </span>
          </Button>
        )
      })}
    </div>
  )
}

interface Props {
  roomState: RoomState
  timerRemaining: number | null
  userId: string | null
  emit: AuctionEmitFns
  chatMessages?: AuctionChatMessage[]
}

export function AuctionOngoingCaptain({
  roomState,
  timerRemaining,
  userId,
  emit,
  chatMessages,
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

  const myTeam = roomState.teams.find((t) => t.captainId === userId)
  // members = 확보한 선수(팀장 제외). 4명이면 팀장 포함 5명으로 정원 마감.
  const teamFull = (myTeam?.members.length ?? 0) >= MAX_PLAYERS_PER_CAPTAIN

  const bidDisabled =
    phase !== 'BIDDING' ||
    targetPlayerId === null ||
    !userId ||
    isHighestBidder ||
    teamFull

  const handleBid = (amount: number) => {
    if (bidDisabled || !userId || !targetPlayerId) return
    emit.placeBid(targetPlayerId, amount)
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
              팀장 — {me?.user?.nickname ?? me?.user?.battleTag ?? '대기'}
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

      {roomState.auction.status === 'PAUSED' && (
        <Card className="bg-card border-primary/50">
          <CardContent className="py-3 text-center text-sm font-bold text-primary">
            ⏸ 마스터가 경매를 일시정지했습니다.
          </CardContent>
        </Card>
      )}

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
          <TeamSidebar
            teams={roomState.teams}
            myCaptainId={userId}
            startingPoints={roomState.auction.startingPoints}
          />
        </aside>

        {/* 중앙 — 매물 + 입찰 패널 */}
        <section className="col-span-12 lg:col-span-5 space-y-3">
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
                  입찰 — 현재가 {currentBidAmount.toLocaleString()}P · 내 잔여{' '}
                  {myPoints.toLocaleString()}P
                </Label>
                <BidButtonsRow
                  key={targetPlayerId ?? 'none'}
                  disabled={bidDisabled}
                  currentBid={currentBidAmount}
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
              {teamFull && (
                <p className="text-sm text-ow-red text-center font-bold">
                  🔒 팀 정원(5명) 마감 — 더 이상 입찰할 수 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 우측 — 매물 현황 */}
        <aside className="col-span-6 lg:col-span-2 space-y-3">
          <PlayerStatusGrid roomState={roomState} />
        </aside>

        {/* 최우측 — 채팅 전용 컬럼 */}
        <aside className="col-span-6 lg:col-span-2">
          {chatMessages && (
            <ChatPanel
              messages={chatMessages}
              onSend={emit.sendChat}
              participants={roomState.participants}
              myUserId={userId}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
