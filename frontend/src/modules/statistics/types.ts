export type ScrimStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
export type RecruitmentType = 'VOTE' | 'AUCTION' | 'MANUAL'

export interface ScrimHistory {
  id: string
  title: string
  scheduledDate: string
  status: ScrimStatus
  teamAScore: number
  teamBScore: number
  recruitmentType: RecruitmentType
  participantsCount: number
}

export interface PlayerStats {
  rank: number
  userId: string
  battleTag: string
  avatarUrl?: string
  wins: number
  losses: number
  participations: number
  winRate: number
  totalPoints: number
}

export interface MonthlyStats {
  month: string
  scrimCount: number
  totalParticipants: number
  averageParticipants: number
}

export type StatisticsFilter = 'all' | 'finished' | 'upcoming'
