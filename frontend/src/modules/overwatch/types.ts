export interface RankInfo {
  division: string
  tier: number
  role_icon: string
  rank_icon: string
  skill_tier: number
}

export interface CompetitiveInfo {
  season: number
  tank?: RankInfo
  damage?: RankInfo
  support?: RankInfo
  open?: RankInfo
}

export interface CompetitiveRank {
  pc?: CompetitiveInfo
  console?: CompetitiveInfo
}

export interface HeroStat {
  key: string
  label: string
  value: number | string
}

export interface HeroStatsCategory {
  category: string
  label: string
  stats: HeroStat[]
}

export interface OverwatchProfile {
  id: string
  userId: string
  battleTag: string
  platform: 'pc' | 'console'
  avatar?: string
  namecard?: string
  title?: string
  endorsementLevel: number
  privacy: 'public' | 'private'
  competitiveRank?: CompetitiveRank
  statsSummary?: Record<string, unknown>
  topHeroes?: Record<string, HeroStatsCategory[]>
  autoSync: boolean
  lastSyncedAt?: string
  lastSyncStatus: 'success' | 'error' | 'not_found'
  lastSyncError?: string
}

export interface ClanRanking {
  userId: string
  battleTag: string
  avatar?: string
  endorsementLevel: number
  competitive?: CompetitiveRank
  lastSyncedAt?: string
}

export type RoleType = 'tank' | 'damage' | 'support'

export const ROLE_LABELS: Record<RoleType, string> = {
  tank: '탱커',
  damage: '딜러',
  support: '힐러',
}

export const ROLE_COLORS: Record<RoleType, string> = {
  tank: 'text-blue-400',
  damage: 'text-ow-red',
  support: 'text-green-400',
}

export const ROLE_BG_COLORS: Record<RoleType, string> = {
  tank: 'bg-blue-500/20 border-blue-500/30',
  damage: 'bg-red-500/20 border-red-500/30',
  support: 'bg-green-500/20 border-green-500/30',
}

export const DIVISION_ORDER = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Master',
  'Grandmaster',
  'Champion',
]

export function getDivisionColor(division?: string): string {
  if (!division) return 'text-muted-foreground'
  const d = division.toLowerCase()
  if (d.includes('bronze')) return 'text-amber-600'
  if (d.includes('silver')) return 'text-gray-400'
  if (d.includes('gold')) return 'text-yellow-500'
  if (d.includes('platinum')) return 'text-cyan-400'
  if (d.includes('diamond')) return 'text-blue-400'
  if (d.includes('master')) return 'text-purple-400'
  if (d.includes('grandmaster')) return 'text-yellow-300'
  if (d.includes('champion')) return 'text-ow-gold'
  return 'text-muted-foreground'
}

export function formatRank(rankInfo?: RankInfo): string {
  if (!rankInfo) return '배치 필요'
  return `${rankInfo.division} ${rankInfo.tier}`
}

// ============================================
// Game Data Types (Heroes, Maps, etc.)
// ============================================

export interface Hero {
  key: string
  name: string
  portrait: string
  role: string
}

export interface HeroDetail extends Hero {
  description: string
  location: string
  hitpoints: {
    health: number
    armor: number
    shields: number
    total: number
  }
  abilities: Ability[]
  story: {
    summary: string
    media?: {
      type: string
      link: string
    }
  }
}

export interface Ability {
  name: string
  description: string
  icon: string
  video?: {
    thumbnail: string
    link: {
      mp4: string
      webm: string
    }
  }
}

export interface GameMap {
  name: string
  screenshot: string
  gamemodes: string[]
  location: string
  country_code: string | null
}

export interface Gamemode {
  key: string
  name: string
  icon: string
  description: string
  screenshot: string
}

export interface Role {
  key: string
  name: string
  icon: string
  description: string
}

// ============================================
// Replay Types
// ============================================

export type ReplayResult = 'WIN' | 'LOSS' | 'DRAW'

export interface Replay {
  id: string
  code: string
  userId: string
  clanId: string
  mapName: string
  gamemode?: string
  heroes: string[]
  result: ReplayResult
  videoUrl?: string
  notes?: string
  tags?: string[]
  likes: number
  views: number
  createdAt: string
  user?: {
    id: string
    battleTag: string
    avatarUrl?: string
  }
}

export interface CreateReplayDto {
  code: string
  mapName: string
  gamemode?: string
  heroes: string[]
  result: ReplayResult
  videoUrl?: string
  notes?: string
  tags?: string[]
}

export interface ReplayStats {
  total: number
  wins: number
  losses: number
  draws: number
  winRate: number
  topMaps: { mapName: string; count: number }[]
  topHeroes: { hero: string; count: number }[]
}

export const REPLAY_TAGS = [
  '스크림',
  '하이라이트',
  'VOD리뷰',
  '연습',
  '랭크',
  '빠른대전',
] as const

export const RESULT_LABELS: Record<ReplayResult, string> = {
  WIN: '승리',
  LOSS: '패배',
  DRAW: '무승부',
}

export const RESULT_COLORS: Record<ReplayResult, string> = {
  WIN: 'text-green-400 bg-green-500/20',
  LOSS: 'text-red-400 bg-red-500/20',
  DRAW: 'text-yellow-400 bg-yellow-500/20',
}
