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
import { AuctionPendingMaster } from '@/modules/auction/components/auction-pending-master'
import { AuctionPendingWaiting } from '@/modules/auction/components/auction-pending-waiting'
import { AuctionOngoingMaster } from '@/modules/auction/components/auction-ongoing-master'
import { AuctionOngoingCaptain } from '@/modules/auction/components/auction-ongoing-captain'
import { AuctionOngoingSpectator } from '@/modules/auction/components/auction-ongoing-spectator'
import { AuctionCompleted } from '@/modules/auction/components/auction-completed'

export default function AuctionPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
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
  const { roomState, timerRemaining, emit } = useAuctionSocket(
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
    if (role === 'master') {
      return (
        <AuctionPendingMaster
          auctionId={listAuction.id}
          roomState={roomState}
          emit={emit}
        />
      )
    }
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

  if (role === 'master') {
    return (
      <AuctionOngoingMaster
        roomState={roomState}
        timerRemaining={timerRemaining}
        emit={emit}
      />
    )
  }
  if (role === 'captain') {
    return (
      <AuctionOngoingCaptain
        roomState={roomState}
        timerRemaining={timerRemaining}
        userId={user?.id ?? null}
        emit={emit}
      />
    )
  }
  return (
    <AuctionOngoingSpectator
      roomState={roomState}
      timerRemaining={timerRemaining}
    />
  )
}
