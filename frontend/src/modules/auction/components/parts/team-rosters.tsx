import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/lib/utils'
import { Crown } from 'lucide-react'
import type { RoomStateTeam } from '../../types'

interface Props {
  teams: RoomStateTeam[]
  myCaptainId?: string | null
  showPrice?: boolean
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export function TeamRosters({ teams, myCaptainId, showPrice = true }: Props) {
  if (teams.length === 0) {
    return (
      <Card className="bg-card border-border border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          팀이 아직 구성되지 않았습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {teams.map((team) => {
        const isMine = myCaptainId && team.captainId === myCaptainId
        return (
          <Card
            key={team.captainId}
            className={cn(
              'bg-card border-border',
              isMine && 'border-primary border-2',
            )}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Crown className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-bold text-sm truncate">
                    {team.captainName}
                  </span>
                </div>
                <span className="text-xs font-mono text-primary tabular-nums">
                  {team.points.toLocaleString()}P
                </span>
              </div>
              {team.members.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  영입 선수 없음
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {team.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 text-[10px] px-1.5 py-0',
                            ROLE_COLORS[m.role] || ROLE_COLORS.flex,
                          )}
                        >
                          {m.role.toUpperCase()}
                        </Badge>
                        <span className="truncate font-semibold">{m.name}</span>
                      </div>
                      {showPrice && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 font-bold tabular-nums text-[11px] px-2',
                            m.wasUnsold
                              ? 'border-muted-foreground/40 text-muted-foreground'
                              : 'border-primary/50 bg-primary/10 text-primary',
                          )}
                        >
                          {m.wasUnsold ? '유찰배정' : `${m.price.toLocaleString()}P`}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
