import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomStateTeam } from '../../types'

interface Props {
  teams: RoomStateTeam[]
  myCaptainId?: string | null
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

/**
 * Vertical 팀 카드 사이드바 — 마스터/캡틴 ongoing 화면 좌측에 배치.
 * 한 화면에 모든 팀의 잔여 P + 영입 멤버 + 낙찰가를 노출.
 */
export function TeamSidebar({ teams, myCaptainId }: Props) {
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
    <div className="space-y-2">
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
                <span className="text-sm font-bold tabular-nums text-primary">
                  {team.points.toLocaleString()}P
                </span>
              </div>
              {team.members.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-1">
                  영입 없음
                </p>
              ) : (
                <ul className="space-y-1">
                  {team.members.map((m) => {
                    const roleKey = m.role.toLowerCase()
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-1.5 text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 text-[9px] px-1 py-0',
                              ROLE_COLORS[roleKey] || ROLE_COLORS.flex,
                            )}
                          >
                            {m.role.toUpperCase()}
                          </Badge>
                          <span className="truncate font-semibold">{m.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 font-bold tabular-nums text-[10px] px-1.5',
                            m.wasUnsold
                              ? 'border-muted-foreground/40 text-muted-foreground'
                              : 'border-primary/50 bg-primary/10 text-primary',
                          )}
                        >
                          {m.wasUnsold ? '유찰' : `${m.price.toLocaleString()}P`}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
