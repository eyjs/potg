'use client'

import { Card, CardContent } from '@/common/components/ui/card'
import { Eye } from 'lucide-react'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamSidebar } from './parts/team-sidebar'
import { PlayerStatusGrid } from './parts/player-status-grid'
import type { RoomState } from '../types'
import type { AuctionChatMessage } from '../hooks/use-auction-socket'
import { ChatPanel } from './parts/chat-panel'

interface Props {
  roomState: RoomState
  timerRemaining: number | null
  chatMessages?: AuctionChatMessage[]
  onSendChat?: (message: string) => void
  myUserId?: string | null
}

export function AuctionOngoingSpectator({
  roomState,
  timerRemaining,
  chatMessages,
  onSendChat,
  myUserId,
}: Props) {
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

      {roomState.auction.status === 'PAUSED' && (
        <Card className="bg-card border-primary/50">
          <CardContent className="py-3 text-center text-sm font-bold text-primary">
            ⏸ 경매가 일시정지되었습니다.
          </CardContent>
        </Card>
      )}

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
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          <PlayerStatusGrid roomState={roomState} />
          {chatMessages && onSendChat && (
            <ChatPanel
              messages={chatMessages}
              onSend={onSendChat}
              participants={roomState.participants}
              myUserId={myUserId}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
