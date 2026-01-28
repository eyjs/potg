'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Progress } from '@/common/components/ui/progress'
import { cn } from '@/lib/utils'
import { Trophy, Flame, Loader2 } from 'lucide-react'
import type { AttendanceStats } from '../types'

interface AttendanceStatsPanelProps {
  stats: AttendanceStats[]
  isLoading: boolean
}

export function AttendanceStatsPanel({
  stats,
  isLoading,
}: AttendanceStatsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center text-muted-foreground">
          통계 데이터가 없습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="평균 출석률"
          value={`${Math.round(stats.reduce((s, m) => s + m.attendanceRate, 0) / stats.length)}%`}
        />
        <SummaryCard
          label="최고 연속 출석"
          value={`${Math.max(...stats.map((m) => m.currentStreak))}회`}
          icon={<Flame className="w-4 h-4 text-primary" />}
        />
        <SummaryCard
          label="총 출석 기록"
          value={`${stats.reduce((s, m) => s + m.totalRecords, 0)}건`}
        />
        <SummaryCard
          label="총 지급 포인트"
          value={`${stats.reduce((s, m) => s + m.totalPointsEarned, 0).toLocaleString()}P`}
          icon={<Trophy className="w-4 h-4 text-primary" />}
        />
      </div>

      {/* 멤버별 통계 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">멤버별 출석 통계</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.map((member) => (
            <div key={member.memberId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">
                    {member.battleTag}
                  </span>
                  {member.currentStreak >= 3 && (
                    <span className="flex items-center gap-0.5 text-xs text-primary">
                      <Flame className="w-3 h-3" />
                      {member.currentStreak}연속
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-muted-foreground">
                    {member.presentCount}/{member.totalRecords}회
                  </span>
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      member.attendanceRate >= 80
                        ? 'text-green-400'
                        : member.attendanceRate >= 50
                          ? 'text-yellow-400'
                          : 'text-red-400',
                    )}
                  >
                    {member.attendanceRate}%
                  </span>
                  <span className="text-primary font-bold tabular-nums w-16 text-right">
                    {member.totalPointsEarned.toLocaleString()}P
                  </span>
                </div>
              </div>
              <Progress
                value={member.attendanceRate}
                className="h-1.5"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="py-3 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {icon}
          <span className="text-lg font-bold tabular-nums">{value}</span>
        </div>
      </CardContent>
    </Card>
  )
}
