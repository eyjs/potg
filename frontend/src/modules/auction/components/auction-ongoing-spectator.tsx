'use client'

import { Card, CardContent } from '@/common/components/ui/card'
import { Eye } from 'lucide-react'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamRosters } from './parts/team-rosters'
import type { RoomState } from '../types'

interface Props {
  roomState: RoomState
  timerRemaining: number | null
}

export function AuctionOngoingSpectator({ roomState, timerRemaining }: Props) {
  const phase = roomState.auction.biddingPhase

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter truncate">
                {roomState.auction.title}
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                관전자 — read only
              </p>
            </div>
          </div>
          <BidTimer remainingTime={timerRemaining} />
        </CardContent>
      </Card>

      <CurrentPlayerCard
        player={roomState.currentPlayer}
        currentBid={roomState.currentBid}
        biddingPhase={phase}
      />

      <TeamRosters teams={roomState.teams} showPrice />
    </div>
  )
}
