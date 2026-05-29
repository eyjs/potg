import api from '@/lib/api'

export interface AuctionHistoryRow {
  id: string
  title: string
  completedAt: string
  teamCount: number
  playerCount: number
  recruitedCount: number
  captainCount: number
  creatorId: string
  creatorName: string
}

export interface AuctionDetailParticipant {
  userId: string
  name: string
  mainRole: string | null
  avatarUrl: string | null
  role: 'CAPTAIN' | 'PLAYER'
  assignedTeamCaptainId: string | null
  soldPrice: number
  wasUnsold: boolean
  rewarded: boolean
  rewardAmount: string | null
}

export interface AuctionHistoryDetail {
  id: string
  title: string
  status: string
  completedAt: string
  startingPoints: number
  teamCount: number
  creatorId: string
  creatorName: string
  participants: AuctionDetailParticipant[]
  payout: {
    totalRecipients: number
    paidCount: number
  }
}

export interface AuctionPayoutResult {
  auctionId: string
  amountPerUser: number
  recipients: number
  paid: number
  skipped: number
}

export const adminAuctionsApi = {
  list: (): Promise<AuctionHistoryRow[]> =>
    api.get<AuctionHistoryRow[]>('/admin/auctions').then((r) => r.data),

  detail: (id: string): Promise<AuctionHistoryDetail> =>
    api.get<AuctionHistoryDetail>(`/admin/auctions/${id}`).then((r) => r.data),

  payout: (id: string, amountPerUser: number): Promise<AuctionPayoutResult> =>
    api
      .post<AuctionPayoutResult>(`/admin/auctions/${id}/payout`, {
        amountPerUser,
      })
      .then((r) => r.data),
}
