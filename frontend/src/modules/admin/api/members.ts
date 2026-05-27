import api from '@/lib/api'

export interface AdminMember {
  id: string
  username: string
  battleTag: string
  role: 'USER' | 'CAPTAIN' | 'ADMIN'
  /** User.pointsBalance 기반. */
  totalPoints: number
  marketGatePassed: boolean
  avatarUrl?: string
  createdAt: string
}

export interface AdminMemberDetail extends AdminMember {
  email?: string
  discordId?: string
  clanId?: string
}

export interface MemberListParams {
  skip?: number
  take?: number
}

export interface AdjustPointsDto {
  delta: number
  memo: string
}

export const membersApi = {
  list: (params: MemberListParams): Promise<AdminMember[]> =>
    api.get<AdminMember[]>('/admin/members', { params }).then((r) => r.data),

  detail: (id: string): Promise<AdminMemberDetail> =>
    api.get<AdminMemberDetail>(`/admin/members/${id}`).then((r) => r.data),

  updateRole: (
    id: string,
    role: 'USER' | 'CAPTAIN' | 'ADMIN',
  ): Promise<AdminMember> =>
    api
      .patch<AdminMember>(`/admin/members/${id}/role`, { role })
      .then((r) => r.data),

  adjustPoints: (id: string, dto: AdjustPointsDto): Promise<void> =>
    api.post<void>(`/admin/members/${id}/adjust`, dto).then((r) => r.data),
}
