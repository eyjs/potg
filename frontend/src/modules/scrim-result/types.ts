export interface ScrimResultEntry {
  id: string
  userId: string
  teamCaptainId: string
  rank: number
  basePoints: number
  earnedActivityPoints: number
  earnedScrimPoints: number
  isCaptain: boolean
  user: {
    id: string
    nickname: string | null
    battleTag: string
    avatarUrl: string | null
    mainRole: string | null
  }
}

export interface ScrimResult {
  id: string
  auctionId: string
  status: "DRAFT" | "CONFIRMED"
  confirmedAt: string | null
  confirmedById: string | null
  entries: ScrimResultEntry[]
  createdAt: string
}

export interface ScrimRankingEntry {
  userId: string
  nickname: string | null
  battleTag: string
  avatarUrl: string | null
  scrimPoints: number
  totalPoints: number
  rank: number
}

export interface TeamRanking {
  teamCaptainId: string
  rank: number
  points: number
}
