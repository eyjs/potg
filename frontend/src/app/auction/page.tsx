'use client'

import { Header } from '@/common/layouts/header'
import { AuthGuard } from '@/common/components/auth-guard'
import { Skeleton } from '@/common/components/ui/skeleton'
import { useAuth } from '@/context/auth-context'
import { useCurrentAuction } from '@/modules/auction/hooks/use-current-auction'
import { useAuctionSocket } from '@/modules/auction/hooks/use-auction-socket'
import {
  canCreateAuction,
  getAuctionRole,
} from '@/modules/auction/hooks/use-auction-role'
import { AuctionNoActive } from '@/modules/auction/components/auction-no-active'
import { AuctionMasterView } from '@/modules/auction/components/auction-master-view'
import { AuctionPendingWaiting } from '@/modules/auction/components/auction-pending-waiting'
import { AuctionOngoingCaptain } from '@/modules/auction/components/auction-ongoing-captain'
import { AuctionOngoingSpectator } from '@/modules/auction/components/auction-ongoing-spectator'
import { AuctionCompleted } from '@/modules/auction/components/auction-completed'

export default function AuctionPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen auction-stage-bg">
        <Header />
        <main className="w-full px-4 py-6 max-w-[1800px] mx-auto">
          <AuctionBody />
        </main>
      </div>
    </AuthGuard>
  )
}

function AuctionBody() {
  const { user } = useAuth()
  const {
    auction: listAuction,
    isLoading: listLoading,
  } = useCurrentAuction()
  const { roomState, timerRemaining, chatMessages, emit } = useAuctionSocket(
    listAuction?.id ?? null,
    user?.id ?? null,
  )

  if (listLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const canCreate = canCreateAuction(user)

  if (!listAuction) {
    return <AuctionNoActive canCreate={canCreate} />
  }

  const role = getAuctionRole(roomState, listAuction.creatorId, user)
  const status = roomState?.auction.status ?? listAuction.status

  // 마스터 — 경매 관리 ↔ 경매장 ↔ 결과 3화면을 탭으로 자유 이동
  if (role === 'master') {
    return (
      <AuctionMasterView
        auctionId={listAuction.id}
        fallbackStatus={status}
        roomState={roomState}
        timerRemaining={timerRemaining}
        emit={emit}
        chatMessages={chatMessages}
        myUserId={user?.id ?? null}
      />
    )
  }

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    if (!roomState) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
        </div>
      )
    }
    return <AuctionCompleted roomState={roomState} canRestart={canCreate} />
  }

  if (status === 'PENDING') {
    return <AuctionPendingWaiting roomState={roomState} userId={user?.id ?? null} />
  }

  // ONGOING / PAUSED / ASSIGNING — roomState 가 필요
  if (!roomState) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (role === 'captain') {
    return (
      <AuctionOngoingCaptain
        roomState={roomState}
        timerRemaining={timerRemaining}
        userId={user?.id ?? null}
        emit={emit}
        chatMessages={chatMessages}
      />
    )
  }
  return (
    <AuctionOngoingSpectator
      roomState={roomState}
      timerRemaining={timerRemaining}
      chatMessages={chatMessages}
      onSendChat={emit.sendChat}
      myUserId={user?.id ?? null}
    />
  )
}
