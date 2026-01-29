'use client'

import { Trophy, Medal, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { ClanRanking } from '../types'
import { getDivisionColor, formatRank } from '../types'

interface ClanLeaderboardProps {
  rankings: ClanRanking[]
  limit?: number
  showViewAll?: boolean
}

export function ClanLeaderboard({ rankings, limit = 5, showViewAll = true }: ClanLeaderboardProps) {
  const displayRankings = limit ? rankings.slice(0, limit) : rankings

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            클랜 <span className="text-primary">리더보드</span>
          </CardTitle>
          {showViewAll && rankings.length > limit && (
            <Link href="/overwatch/leaderboard">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                전체 보기
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayRankings.length > 0 ? (
          <div className="space-y-2">
            {displayRankings.map((member, index) => (
              <LeaderboardRow key={member.userId} member={member} rank={index + 1} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm">랭킹 데이터가 없습니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface LeaderboardRowProps {
  member: ClanRanking
  rank: number
}

function LeaderboardRow({ member, rank }: LeaderboardRowProps) {
  const pcRank = member.competitive?.pc
  const highestRank = getHighestRank(pcRank)

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        rank <= 3 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/20 hover:bg-muted/30'
      )}
    >
      {/* Rank Badge */}
      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        {rank === 1 ? (
          <Medal className="w-6 h-6 text-yellow-500" />
        ) : rank === 2 ? (
          <Medal className="w-6 h-6 text-gray-400" />
        ) : rank === 3 ? (
          <Medal className="w-6 h-6 text-amber-600" />
        ) : (
          <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="w-10 h-10 border-2 border-border">
        <AvatarImage src={member.avatar} alt={member.battleTag} />
        <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
          {member.battleTag.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{member.battleTag}</p>
        {highestRank && (
          <p className={cn('text-xs', getDivisionColor(highestRank.division))}>
            {highestRank.division} {highestRank.tier}
          </p>
        )}
      </div>

      {/* Endorsement */}
      <div className="shrink-0 text-right">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {member.endorsementLevel}
        </div>
      </div>
    </div>
  )
}

function getHighestRank(competitive?: { tank?: { division: string; tier: number }; damage?: { division: string; tier: number }; support?: { division: string; tier: number } }) {
  if (!competitive) return null

  const roles = [competitive.tank, competitive.damage, competitive.support].filter(Boolean)
  if (roles.length === 0) return null

  const divisionOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion']

  return roles.reduce((highest, current) => {
    if (!current) return highest
    if (!highest) return current

    const currentIndex = divisionOrder.findIndex((d) => current.division?.includes(d))
    const highestIndex = divisionOrder.findIndex((d) => highest.division?.includes(d))

    if (currentIndex > highestIndex) return current
    if (currentIndex === highestIndex && current.tier < highest.tier) return current
    return highest
  }, null as { division: string; tier: number } | null)
}
