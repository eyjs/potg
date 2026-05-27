import api from '@/lib/api'

export type MatchStatus =
  | 'DRAFT'
  | 'BETTING_OPEN'
  | 'LOCKED'
  | 'SETTLED'
  | 'CANCELLED'

export interface MatchTeam {
  id: string
  name: string
  members: MatchTeamMember[]
}

interface MatchTeamMember {
  id: string
  userId: string
  username: string
  rank?: number
}

export interface AdminMatch {
  id: string
  title: string
  status: MatchStatus
  scheduledAt: string
  createdAt: string
  teams: MatchTeam[]
}

export interface MatchListParams {
  status?: MatchStatus
  skip?: number
  take?: number
}

export interface CreateMatchDto {
  title: string
  scheduledAt: string
  teamCount?: number
}

export interface CreateTeamDto {
  name: string
  memberUserIds?: string[]
}

export interface SettleMatchDto {
  winnerTeamId: string
  placements: Array<{ teamId: string; rank: number }>
}

export const matchesApi = {
  list: (params?: MatchListParams): Promise<AdminMatch[]> =>
    api.get<AdminMatch[]>('/admin/matches', { params }).then((r) => r.data),

  detail: (id: string): Promise<AdminMatch> =>
    api.get<AdminMatch>(`/admin/matches/${id}`).then((r) => r.data),

  create: (dto: CreateMatchDto): Promise<AdminMatch> =>
    api.post<AdminMatch>('/admin/matches', dto).then((r) => r.data),

  addTeam: (matchId: string, dto: CreateTeamDto): Promise<MatchTeam> =>
    api
      .post<MatchTeam>(`/admin/matches/${matchId}/teams`, dto)
      .then((r) => r.data),

  open: (id: string): Promise<AdminMatch> =>
    api.post<AdminMatch>(`/admin/matches/${id}/open`).then((r) => r.data),

  lock: (id: string): Promise<AdminMatch> =>
    api.post<AdminMatch>(`/admin/matches/${id}/lock`).then((r) => r.data),

  settle: (id: string, dto: SettleMatchDto): Promise<AdminMatch> =>
    api
      .post<AdminMatch>(`/admin/matches/${id}/settle`, dto)
      .then((r) => r.data),

  cancel: (id: string): Promise<AdminMatch> =>
    api.post<AdminMatch>(`/admin/matches/${id}/cancel`).then((r) => r.data),
}
