import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maxPlayersPerTeam, type RoomStateTeam, type RosterMode } from '../../types'

/** 한 팀은 5명 — 감독 모드는 선수 5명, 팀장 모드는 팀장 포함 5명. */
const TEAM_SIZE = 5

interface Props {
  teams: RoomStateTeam[]
  myCaptainId?: string | null
  /** 팀장 시작 포인트 — 잔여 포인트 게이지 계산용 */
  startingPoints?: number
  /** 로스터 모드 — 정원 표시(팀장 포함/제외) 결정. 기본 CAPTAIN. */
  rosterMode?: RosterMode
  /** 팀 카드 클릭 핸들러 — 제공 시 카드가 클릭 가능(팀 상세/회수 모달용). */
  onTeamClick?: (captainId: string) => void
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
export function TeamSidebar({
  teams,
  myCaptainId,
  startingPoints,
  rosterMode = 'CAPTAIN',
  onTeamClick,
}: Props) {
  const maxPlayers = maxPlayersPerTeam(rosterMode)
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
        // members = 확보 선수. 팀장 모드는 팀장(+1) 포함해 표시, 감독 모드는 선수만.
        const rosterCount =
          rosterMode === 'COACH' ? team.members.length : team.members.length + 1
        const rosterFull = team.members.length >= maxPlayers
        return (
          <Card
            key={team.captainId}
            onClick={
              onTeamClick ? () => onTeamClick(team.captainId) : undefined
            }
            className={cn(
              'bg-card border-border',
              isMine && 'border-primary border-2',
              onTeamClick &&
                'cursor-pointer transition-colors hover:border-primary/60 hover:bg-primary/5',
            )}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Crown className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate leading-tight">
                      {team.teamName ?? `${team.captainName} 팀`}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      팀장 {team.captainName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-bold tabular-nums text-primary leading-tight">
                    {team.points.toLocaleString()}P
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold tabular-nums leading-tight',
                      rosterFull ? 'text-ow-red' : 'text-muted-foreground',
                    )}
                  >
                    {rosterCount}/{TEAM_SIZE}
                  </span>
                </div>
              </div>
              {startingPoints !== undefined && startingPoints > 0 && (
                <div
                  className="h-1 rounded-full bg-muted/40 overflow-hidden"
                  role="progressbar"
                  aria-label={`잔여 포인트 ${team.points}/${startingPoints}`}
                  aria-valuenow={team.points}
                  aria-valuemin={0}
                  aria-valuemax={startingPoints}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      team.points / startingPoints > 0.5
                        ? 'bg-primary'
                        : team.points / startingPoints > 0.2
                          ? 'bg-yellow-400'
                          : 'bg-ow-red',
                    )}
                    style={{
                      width: `${Math.max(0, Math.min(100, (team.points / startingPoints) * 100))}%`,
                    }}
                  />
                </div>
              )}
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
