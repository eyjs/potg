'use client'

import { Card, CardContent } from '@/common/components/ui/card'
import { Eye } from 'lucide-react'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamSidebar } from './parts/team-sidebar'
import { PlayerQueue } from './parts/player-queue'
import type { RoomState } from '../types'

interface Props {
  roomState: RoomState
  timerRemaining: number | null
}

export function AuctionOngoingSpectator({ roomState, timerRemaining }: Props) {
  const phase = roomState.auction.biddingPhase
  const isAssigning = roomState.auction.status === 'ASSIGNING'

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardContent className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter truncate">
                {roomState.auction.title}
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                관전자 — {isAssigning ? '유찰자 배정 중' : 'read only'}
              </p>
            </div>
          </div>
          {!isAssigning && <BidTimer remainingTime={timerRemaining} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-3 space-y-2">
          <TeamSidebar teams={roomState.teams} />
        </aside>
        <section className="col-span-12 lg:col-span-6">
          {isAssigning ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                마스터가 유찰자를 각 팀에 수동 배정 중입니다...
              </CardContent>
            </Card>
          ) : (
            <CurrentPlayerCard
              player={roomState.currentPlayer}
              currentBid={roomState.currentBid}
              biddingPhase={phase}
            />
          )}
        </section>
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
