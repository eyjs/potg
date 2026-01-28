'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { UserPlus, Crown, Coins, TrendingDown, TrendingUp, Megaphone, Activity, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface ApiActivityEvent {
  id: string
  type: string
  userId: string
  userBattleTag: string
  userAvatarUrl: string | null
  message: string
  amount: number | null
  createdAt: string
}

interface ActivitySidebarProps {
  clanId: string | undefined
}

const ACTIVITY_ICON_MAP: Record<string, { icon: React.ReactNode; accent: string }> = {
  MEMBER_JOIN: { icon: <UserPlus className="w-3.5 h-3.5" />, accent: 'text-green-500' },
  CLAN_CREATE: { icon: <Crown className="w-3.5 h-3.5" />, accent: 'text-yellow-500' },
  POINT_RECEIVED: { icon: <TrendingUp className="w-3.5 h-3.5" />, accent: 'text-primary' },
  POINT_SENT: { icon: <Coins className="w-3.5 h-3.5" />, accent: 'text-muted-foreground' },
  BET_WIN: { icon: <TrendingUp className="w-3.5 h-3.5" />, accent: 'text-green-500' },
  BET_LOSS: { icon: <TrendingDown className="w-3.5 h-3.5" />, accent: 'text-ow-red' },
  ANNOUNCEMENT: { icon: <Megaphone className="w-3.5 h-3.5" />, accent: 'text-ow-blue' },
}

const FALLBACK_STYLE = { icon: <Activity className="w-3.5 h-3.5" />, accent: 'text-muted-foreground' }

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function ActivitySidebar({ clanId }: ActivitySidebarProps) {
  const [events, setEvents] = useState<ApiActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!clanId) return

    const fetchActivities = async () => {
      setIsLoading(true)
      try {
        const res = await api.get<ApiActivityEvent[]>(`/clans/${clanId}/activities?limit=10`)
        if (mountedRef.current) setEvents(res.data)
      } catch {
        // 활동 피드 실패는 사이드바이므로 조용히 무시
      } finally {
        if (mountedRef.current) setIsLoading(false)
      }
    }

    fetchActivities()
  }, [clanId])

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          최근 활동
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">활동 내역이 없습니다.</p>
        ) : (
          <div className="space-y-0">
            {events.map((event, idx) => {
              const style = ACTIVITY_ICON_MAP[event.type] ?? FALLBACK_STYLE
              return (
                <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
                  {/* 타임라인 선 */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-muted/30',
                        style.accent,
                      )}
                    >
                      {style.icon}
                    </div>
                    {idx < events.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  {/* 내용 */}
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs text-foreground leading-snug">{event.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(event.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
