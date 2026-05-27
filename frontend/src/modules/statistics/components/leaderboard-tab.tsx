import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerStats } from '../types'

interface LeaderboardTabProps {
  playerStats: PlayerStats[]
}

const RANK_BG: Record<number, string> = {
  1: 'bg-yellow-500 text-yellow-950',
  2: 'bg-gray-400 text-gray-950',
  3: 'bg-amber-600 text-amber-950',
}

export function LeaderboardTab({ playerStats }: LeaderboardTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          포인트 랭킹
        </CardTitle>
      </CardHeader>
      <CardContent>
        {playerStats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">데이터가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {playerStats.slice(0, 20).map((player) => (
              <div
                key={player.userId}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg',
                  player.rank <= 3
                    ? 'bg-accent/10 border border-accent/30'
                    : 'bg-muted/20',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-black text-sm',
                    RANK_BG[player.rank] || 'bg-muted text-muted-foreground',
                  )}
                >
                  {player.rank}
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={player.avatarUrl} />
                  <AvatarFallback className="bg-muted">
                    {player.battleTag[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{player.battleTag}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-primary">
                    {player.totalPoints.toLocaleString()}P
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
