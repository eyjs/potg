"use client"

import { Eye } from "lucide-react"

interface Team {
  captainId: string
  members: unknown[]
}

interface MobileSpectatorBarProps {
  teams: Team[]
  teamColors: string[]
}

/**
 * 모바일 관전자용 floating 바.
 * 각 팀의 멤버 수 표시.
 */
export function MobileSpectatorBar({ teams, teamColors }: MobileSpectatorBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-sm border-t border-border py-2 px-4 safe-area-pb">
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>관전 중</span>
        </div>
        {teams.map((team, index) => {
          const color = teamColors[index % teamColors.length]
          return (
            <div key={team.captainId} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-semibold" style={{ color }}>
                {team.members.length}명
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
