'use client'

import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/lib/utils'
import { CalendarDays, Loader2 } from 'lucide-react'
import type { AttendanceRecord } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

interface AttendanceHistoryPanelProps {
  records: AttendanceRecord[]
  isLoading: boolean
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AttendanceHistoryPanel({
  records,
  isLoading,
}: AttendanceHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center text-muted-foreground">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
          출석 기록이 없습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <Card key={record.id} className="bg-card border-border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 text-xs border',
                    STATUS_COLORS[record.status],
                    record.status === 'PRESENT' && 'border-green-500/30 bg-green-500/10',
                    record.status === 'LATE' && 'border-yellow-500/30 bg-yellow-500/10',
                    record.status === 'ABSENT' && 'border-red-500/30 bg-red-500/10',
                    record.status === 'EXCUSED' && 'border-blue-500/30 bg-blue-500/10',
                  )}
                >
                  {STATUS_LABELS[record.status]}
                </Badge>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {record.member?.user?.battleTag || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {record.scrim?.title || '내전'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{formatDate(record.createdAt)}</span>
                    {record.bonusReason && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/30 text-primary bg-primary/10"
                      >
                        {record.bonusReason}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {record.pointsEarned > 0 && (
                  <span className="text-sm font-bold text-primary tabular-nums">
                    +{record.pointsEarned}P
                  </span>
                )}
                {record.bonusPoints > 0 && (
                  <span className="text-sm font-bold text-ow-blue tabular-nums">
                    +{record.bonusPoints}P
                  </span>
                )}
                {record.pointsEarned === 0 && record.bonusPoints === 0 && (
                  <span className="text-sm text-muted-foreground">0P</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
