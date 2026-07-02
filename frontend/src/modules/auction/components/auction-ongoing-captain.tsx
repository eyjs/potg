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
import { maxPlayersPerTeam, type RoomState } from '../types'
import type {
  AuctionBidEvent,
  AuctionChatMessage,
  AuctionStageEvent,
  AuctionEmitFns,
} from '../hooks/use-auction-socket'
import { ChatPanel } from './parts/chat-panel'
import { BidLog } from './parts/bid-log'
import { LiveChip } from './parts/fx/live-chip'

/** 증액 단위 버튼 — 현재 최고가 + 증액이 새 입찰가가 된다. */
const BID_INCREMENTS = [100, 200, 500, 1000] as const

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
      {BID_INCREMENTS.map((inc, idx) => {
        const amount = currentBid + inc
        const canBid = !disabled && amount <= maxBid
        // 첫 버튼(최소 증액)은 골드 강조, 나머지는 시안 네온 (샘플 레퍼런스)
        const isPrimaryCta = idx === 0
        return (
          <Button
            key={inc}
            onClick={() => canBid && onSubmit(amount)}
            disabled={!canBid}
            className={cn(
              'game-btn h-20 flex-col gap-0.5 font-bold',
              isPrimaryCta
                ? 'game-btn-gold neon-frame-gold bg-ow-gold/15 text-ow-gold hover:bg-ow-gold/25'
                : 'neon-frame bg-ow-blue/10 text-ow-blue hover:bg-ow-blue/20 hover:text-ow-gold',
              'disabled:opacity-40',
            )}
          >
            <span className="flex items-center gap-1 text-2xl font-black tracking-tight">
              <Gavel className="w-4 h-4" />+{inc}
            </span>
            <span className="text-[11px] tabular-nums opacity-75">
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
  bidEvents?: AuctionBidEvent[]
  stageEvent?: AuctionStageEvent | null
}

export function AuctionOngoingCaptain({
  roomState,
  timerRemaining,
  userId,
  emit,
  chatMessages,
  bidEvents,
  stageEvent,
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
  // members = 확보한 선수(팀장/감독 제외). 정원은 로스터 모드로 결정.
  const maxPlayers = maxPlayersPerTeam(roomState.auction.rosterMode)
  const teamFull = (myTeam?.members.length ?? 0) >= maxPlayers

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
      <Card className="relative overflow-hidden bg-card/85 border-ow-blue/25 backdrop-blur-sm">
        {/* 상단 에너지 스윕 라인 */}
        <div aria-hidden className="light-sweep absolute inset-x-0 top-0 h-0.5" />
        <CardContent className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="pr-2 text-xl font-black italic uppercase tracking-tighter break-keep leading-tight drop-shadow-[0_0_10px_rgba(0,195,255,0.3)]">
              {roomState.auction.title}
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              팀장 — {me?.user?.nickname ?? me?.user?.battleTag ?? '대기'}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                내 잔여
              </p>
              {/* key 리마운트로 포인트 변경 시 팝 */}
              <p
                key={myPoints}
                className="bid-pop text-2xl font-black tabular-nums text-primary"
              >
                {myPoints.toLocaleString()}P
              </p>
            </div>
            {!isAssigning && <BidTimer remainingTime={timerRemaining} totalTime={roomState.auction.turnTimeLimit} phase={phase} />}
            <LiveChip paused={roomState.auction.status === 'PAUSED'} />
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
        <aside className="col-span-12 lg:col-span-2 space-y-2">
          <TeamSidebar
            teams={roomState.teams}
            myCaptainId={userId}
            startingPoints={roomState.auction.startingPoints}
            rosterMode={roomState.auction.rosterMode}
            highlightCaptainId={roomState.currentBid?.bidderId ?? null}
          />
        </aside>

        {/* 중앙 — 매물 + 입찰 패널 */}
        <section className="col-span-12 lg:col-span-5 space-y-3">
          <CurrentPlayerCard
            player={roomState.currentPlayer}
            currentBid={roomState.currentBid}
            biddingPhase={phase}
              stageEvent={stageEvent}
          />

          {/* 입찰 패널 */}
          <Card className="game-panel">
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
                  🔒 팀 정원(선수 {maxPlayers}명) 마감 — 더 이상 입찰할 수 없습니다.
                </p>
              )}
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
              myUserId={userId}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
