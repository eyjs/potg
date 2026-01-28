export type PointRuleCategory = 'ATTENDANCE' | 'ACTIVITY' | 'ACHIEVEMENT' | 'PENALTY'

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'

export interface PointRule {
  id: string
  clanId: string
  code: string
  name: string
  description: string | null
  category: PointRuleCategory
  points: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AttendanceRecord {
  id: string
  memberId: string
  scrimId: string
  status: AttendanceStatus
  pointsEarned: number
  bonusPoints: number
  bonusReason: string | null
  checkedInAt: string | null
  createdAt: string
  member?: {
    id: string
    userId: string
    user?: {
      id: string
      battleTag: string
      avatarUrl?: string
    }
  }
  scrim?: {
    id: string
    title: string
    scheduledDate: string | null
  }
}

export interface AttendanceStats {
  memberId: string
  userId: string
  battleTag: string
  avatarUrl: string | null
  totalRecords: number
  presentCount: number
  attendanceRate: number
  currentStreak: number
  totalPointsEarned: number
}

export const CATEGORY_LABELS: Record<PointRuleCategory, string> = {
  ATTENDANCE: '출석',
  ACTIVITY: '활동',
  ACHIEVEMENT: '업적',
  PENALTY: '페널티',
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: '출석',
  LATE: '지각',
  ABSENT: '결석',
  EXCUSED: '사유',
}

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'text-green-400',
  LATE: 'text-yellow-400',
  ABSENT: 'text-red-400',
  EXCUSED: 'text-blue-400',
}
