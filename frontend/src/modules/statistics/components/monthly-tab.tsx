import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { TrendingUp } from 'lucide-react'
import type { MonthlyStats } from '../types'

interface MonthlyTabProps {
  monthlyStats: MonthlyStats[]
}

export function MonthlyTab({ monthlyStats }: MonthlyTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          월별 내전 통계
        </CardTitle>
      </CardHeader>
      <CardContent>
        {monthlyStats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {monthlyStats.map((stat) => (
              <div key={stat.month} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">{stat.month}</span>
                  <span className="text-sm text-muted-foreground">
                    {stat.scrimCount}회 진행
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">총 참가자</p>
                    <p className="text-xl font-black text-foreground">
                      {stat.totalParticipants}명
                    </p>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">평균 참가</p>
                    <p className="text-xl font-black text-foreground">
                      {stat.averageParticipants}명
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
