"use client"

import { useState } from "react"
import { Shield, Crosshair, Heart, ChevronDown, UserPlus, Crown } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Player, Team } from "@/app/auction/[id]/page"

interface PlayerPoolProps {
  players: Player[]
  isAdmin: boolean
  teams: Team[]
  onSelectPlayer: (player: Player) => void
  onForceAssign: (player: Player, teamId: string) => void
  onSetCaptain: (teamId: string, player: Player) => void
}

const roleConfig = {
  tank: { icon: Shield, color: "text-yellow-500", label: "탱커" },
  dps: { icon: Crosshair, color: "text-red-500", label: "딜러" },
  support: { icon: Heart, color: "text-green-500", label: "힐러" },
}

export function PlayerPool({ players, isAdmin, teams, onSelectPlayer, onForceAssign, onSetCaptain }: PlayerPoolProps) {
  const [filterRole, setFilterRole] = useState<"all" | "tank" | "dps" | "support">("all")

  const filteredPlayers = filterRole === "all" ? players : players.filter((p) => p.role === filterRole)

  return (
    <Card className="bg-card border-border/50 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground">
            선수 <span className="text-primary">풀</span>
          </h2>
          <Badge variant="secondary">{players.length}명</Badge>
        </div>

        {/* Role Filter */}
        <div className="flex gap-1 mt-2">
          {(["all", "tank", "dps", "support"] as const).map((role) => (
            <Button
              key={role}
              size="sm"
              variant={filterRole === role ? "default" : "ghost"}
              className={cn("text-xs", filterRole === role && "bg-primary text-primary-foreground")}
              onClick={() => setFilterRole(role)}
            >
              {role === "all" ? "전체" : roleConfig[role].label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredPlayers.map((player) => {
          const config = roleConfig[player.role]
          const Icon = config.icon

          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center justify-between p-3 bg-muted/50 rounded border border-border/30",
                "hover:border-primary/50 transition-all cursor-pointer",
                isAdmin && "hover:bg-muted",
              )}
              onClick={() => isAdmin && onSelectPlayer(player)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className={cn("w-5 h-5", config.color)} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.tier}</p>
                </div>
              </div>

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Crown className="w-4 h-4 mr-2" />
                        팀장 지정
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border-border">
                        {teams
                          .filter((t) => !t.captainId)
                          .map((team) => (
                            <DropdownMenuItem
                              key={team.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onSetCaptain(team.id, player)
                              }}
                            >
                              {team.name}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <UserPlus className="w-4 h-4 mr-2" />
                        강제 배정
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border-border">
                        {teams.map((team) => (
                          <DropdownMenuItem
                            key={team.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onForceAssign(player, team.id)
                            }}
                          >
                            {team.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}

        {filteredPlayers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>대기 중인 선수가 없습니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
