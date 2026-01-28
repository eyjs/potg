import { Badge } from '@/common/components/ui/badge'
import { Crown, Users, Calendar } from 'lucide-react'
import type { ClanInfo } from '../types'

interface ClanHeroBannerProps {
  clanInfo: ClanInfo | null
  memberCount: number
  isLoading: boolean
}

export function ClanHeroBanner({ clanInfo, memberCount, isLoading }: ClanHeroBannerProps) {
  if (isLoading || !clanInfo) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-blue-500/10" />
        <div className="relative px-6 py-8 flex items-center gap-6">
          <div className="w-16 h-16 bg-muted/40 rounded-lg animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-muted/40 rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted/40 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const createdDate = clanInfo.createdAt
    ? new Date(clanInfo.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {/* 그라디언트 배경 */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-blue-500/10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* 헥사곤 로고 */}
        <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 rounded-lg flex items-center justify-center shrink-0">
          <Crown className="w-8 h-8 text-primary" />
        </div>

        {/* 클랜 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-foreground">
              {clanInfo.name}
            </h1>
            <Badge
              variant="outline"
              className="text-xs border-primary/40 text-primary font-bold uppercase"
            >
              [{clanInfo.tag}]
            </Badge>
          </div>

          {clanInfo.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {clanInfo.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {memberCount}명
            </span>
            {createdDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {createdDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
