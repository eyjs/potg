'use client'

import { LayoutGroup } from 'framer-motion'
import { Card, CardContent } from '@/common/components/ui/card'
import { Eye } from 'lucide-react'
import { CurrentPlayerCard } from './parts/current-player-card'
import { BidTimer } from './parts/bid-timer'
import { TeamSidebar } from './parts/team-sidebar'
import { PlayerStatusGrid } from './parts/player-status-grid'
import type { RoomState } from '../types'
import type {
  AuctionBidEvent,
  AuctionChatMessage,
  AuctionStageEvent,
} from '../hooks/use-auction-socket'
import { ChatPanel } from './parts/chat-panel'
import { BidLog } from './parts/bid-log'
import { LiveChip } from './parts/fx/live-chip'

interface Props {
  roomState: RoomState
  timerRemaining: number | null
  chatMessages?: AuctionChatMessage[]
  bidEvents?: AuctionBidEvent[]
  stageEvent?: AuctionStageEvent | null
  onSendChat?: (message: string) => void
  myUserId?: string | null
}

export function AuctionOngoingSpectator({
  roomState,
  timerRemaining,
  chatMessages,
  bidEvents,
  stageEvent,
  onSendChat,
  myUserId,
}: Props) {
  const phase = roomState.auction.biddingPhase
  const isAssigning = roomState.auction.status === 'ASSIGNING'

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden bg-card/85 border-ow-blue/25 backdrop-blur-sm">
        {/* 상단 에너지 스윕 라인 */}
        <div aria-hidden className="light-sweep absolute inset-x-0 top-0 h-0.5" />
        <CardContent className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="pr-2 text-xl font-black italic uppercase tracking-tighter break-keep leading-tight drop-shadow-[0_0_10px_rgba(0,195,255,0.3)]">
                {roomState.auction.title}
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                관전자 — {isAssigning ? '유찰자 배정 중' : 'read only'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {!isAssigning && <BidTimer remainingTime={timerRemaining} totalTime={roomState.auction.turnTimeLimit} phase={phase} />}
            <LiveChip paused={roomState.auction.status === 'PAUSED'} />
          </div>
        </CardContent>
      </Card>

      {roomState.auction.status === 'PAUSED' && (
        <Card className="bg-card border-primary/50">
          <CardContent className="py-3 text-center text-sm font-bold text-primary">
            ⏸ 경매가 일시정지되었습니다.
          </CardContent>
        </Card>
      )}

      <LayoutGroup>
      <div className="hidden lg:grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-2 space-y-2">
          <TeamSidebar
            teams={roomState.teams}
            startingPoints={roomState.auction.startingPoints}
            rosterMode={roomState.auction.rosterMode}
            highlightCaptainId={roomState.currentBid?.bidderId ?? null}
          />
        </aside>
        <section className="col-span-12 lg:col-span-5 space-y-3">
          {isAssigning ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                마스터가 유찰자를 각 팀에 수동 배정 중입니다...
              </CardContent>
            </Card>
          ) : (
            <>
              <CurrentPlayerCard
                player={roomState.currentPlayer}
                currentBid={roomState.currentBid}
                biddingPhase={phase}
              stageEvent={stageEvent}
              />
              {/* 입찰 로그 — 게임 킬로그 피드 */}
              <BidLog events={bidEvents ?? []} />
            </>
          )}
        </section>
        <aside className="col-span-6 lg:col-span-3 space-y-3">
          <PlayerStatusGrid roomState={roomState} />
        </aside>

        {/* 최우측 — 채팅 전용 컬럼 */}
        <aside className="col-span-6 lg:col-span-2">
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
      </LayoutGroup>

      {/*
        모바일(<lg) — 트위치/치지직 세로형: 상단 실시간 경매현황 + 하단 채팅.
        min-h는 dvh 기준(모바일 주소창 리사이즈 대응) — 페이지 컨테이너 py-6(상하 총 3rem) +
        헤더 카드(아이콘+타이틀+타이머, 약 4rem) + space-y-4 간격(1rem) + 여유값(2rem) = 10rem.
        PAUSED 배너가 추가로 표시될 때도 min-height일 뿐이라 페이지가 자연스럽게 늘어난다.
      */}
      <div className="lg:hidden flex flex-col gap-4 min-h-[calc(100dvh-10rem)]">
        {/* 상단 — 실시간 경매현황 */}
        <div className="shrink-0">
          {isAssigning ? (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                마스터가 유찰자를 각 팀에 수동 배정 중입니다...
              </CardContent>
            </Card>
          ) : (
            <CurrentPlayerCard
              player={roomState.currentPlayer}
              currentBid={roomState.currentBid}
              biddingPhase={phase}
              stageEvent={stageEvent}
            />
          )}
        </div>

        {/* 하단 — 채팅, 남은 높이 전부 */}
        <div className="flex-1 min-h-0">
          {chatMessages && onSendChat && (
            <ChatPanel
              messages={chatMessages}
              onSend={onSendChat}
              participants={roomState.participants}
              myUserId={myUserId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
