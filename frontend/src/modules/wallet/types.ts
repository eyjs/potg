export interface ClanMemberWithUser {
  id: string
  userId: string
  clanId: string
  totalPoints: number
  lockedPoints: number
  role: 'MASTER' | 'MANAGER' | 'MEMBER'
  user: {
    id: string
    username: string
    battleTag: string
    avatarUrl?: string
  }
}

export interface PointLog {
  id: string
  userId: string
  clanId: string
  amount: number
  reason: string
  createdAt: string
}

export interface SendPointsRequest {
  recipientId: string
  clanId: string
  amount: number
  message?: string
}

export interface ParsedTransaction {
  type: 'send' | 'receive' | 'other'
  targetUserId?: string
  message: string
}
