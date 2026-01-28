export type ClanRole = 'MASTER' | 'MANAGER' | 'MEMBER'

export type MainRole = 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX'

export interface ClanMember {
  id: string
  userId: string
  role: ClanRole
  totalPoints: number
  user: {
    id: string
    battleTag: string
    mainRole: MainRole
    avatarUrl?: string
  }
}

export interface JoinRequest {
  id: string
  message: string
  user: {
    battleTag: string
  }
}

export interface ClanInfo {
  id: string
  name: string
  tag: string
  description: string
  createdAt?: string
  members: ClanMember[]
}

export interface GroupedMembers {
  MASTER: ClanMember[]
  MANAGER: ClanMember[]
  MEMBER: ClanMember[]
}

export const CHART_COLORS = {
  master: '#EAB308',
  manager: '#3B82F6',
  member: '#A0A0A0',
  tank: '#3B82F6',
  dps: '#ff4649',
  support: '#22C55E',
  flex: '#FFB800',
} as const

export const POSITION_LABELS: Record<string, string> = {
  TANK: '탱커',
  DPS: '딜러',
  SUPPORT: '서포터',
  FLEX: '플렉스',
}
