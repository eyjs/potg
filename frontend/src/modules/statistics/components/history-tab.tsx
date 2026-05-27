import Link from 'next/link'
import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { ChevronRight, Filter, Swords } from 'lucide-react'
import type { ScrimHistory, ScrimStatus, StatisticsFilter } from '../types'

const STATUS_LABEL: Record<ScrimStatus, string> = {
  FINISHED: '완료',
  IN_PROGRESS: '진행중',
  SCHEDULED: '예정',
  DRAFT: '준비중',
  CANCELLED: '취소',
}

const STATUS_CLASS: Record<ScrimStatus, string> = {
  FINISHED: 'border-green-500/50 text-green-500',
  IN_PROGRESS: 'border-yellow-500/50 text-yellow-500 animate-pulse',
  SCHEDULED: 'border-blue-500/50 text-blue-500',
  DRAFT: 'border-muted-foreground/50',
  CANCELLED: 'border-muted-foreground/50',
}

interface HistoryTabProps {
  filteredScrims: ScrimHistory[]
  filter: StatisticsFilter
  onFilterChange: (value: StatisticsFilter) => void
}

export function HistoryTab({ filteredScrims, filter, onFilterChange }: HistoryTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={filter} onValueChange={(v) => onFilterChange(v as StatisticsFilter)}>
          <SelectTrigger className="w-[140px] bg-muted/30">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="finished">완료</SelectItem>
            <SelectItem value="upcoming">예정</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredScrims.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Swords className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">내전 기록이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredScrims.map((scrim) => (
            <Link key={scrim.id} href={`/scrim/${scrim.id}`}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-xs text-muted-foreground">
                        {new Date(scrim.scheduledDate).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scrim.scheduledDate).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={STATUS_CLASS[scrim.status]}>
                          {STATUS_LABEL[scrim.status]}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {scrim.recruitmentType === 'AUCTION'
                            ? '경매'
                            : scrim.recruitmentType === 'VOTE'
                              ? '투표'
                              : '일반'}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-foreground">{scrim.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {scrim.participantsCount || 0}명 참가
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {scrim.status === 'FINISHED' && (
                      <div className="text-center">
                        <p className="text-2xl font-black">
                          <span
                            className={
                              scrim.teamAScore > scrim.teamBScore ? 'text-primary' : ''
                            }
                          >
                            {scrim.teamAScore}
                          </span>
                          <span className="text-muted-foreground mx-1">:</span>
                          <span
                            className={
                              scrim.teamBScore > scrim.teamAScore ? 'text-primary' : ''
                            }
                          >
                            {scrim.teamBScore}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">A vs B</p>
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
