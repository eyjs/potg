"use client"

import { Plus, X, Crown, Shield, Crosshair, Heart } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import type { Team } from "@/app/auction/[id]/page"

interface TeamPanelProps {
  teams: Team[]
  isAdmin: boolean
  onAddTeam: () => void
  onRemoveMember: (teamId: string, playerId: string) => void
}

const roleIcons = {
  tank: Shield,
  dps: Crosshair,
  support: Heart,
}

export function TeamPanel({ teams, isAdmin, onAddTeam, onRemoveMember }: TeamPanelProps) {
  return (
    <Card className="bg-card border-border/50 flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground">
            팀 <span className="text-primary">현황</span>
          </h2>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/20" onClick={onAddTeam}>
              <Plus className="w-4 h-4 mr-1" />팀 추가
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
        {teams.map((team) => (
          <div key={team.id} className="p-3 bg-muted/30 rounded border border-border/30">
            {/* Team Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                <h3 className="font-bold text-foreground">{team.name}</h3>
              </div>
              <Badge variant="outline" className="text-primary border-primary/50">
                {team.points.toLocaleString()}P
              </Badge>
            </div>

            {/* Captain */}
            {team.captainName && (
              <div className="flex items-center gap-2 mb-2 text-sm">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-muted-foreground">팀장:</span>
                <span className="font-semibold text-foreground">{team.captainName}</span>
              </div>
            )}

            {/* Members */}
            <div className="space-y-1">
              {team.members.map((member) => {
                const Icon = roleIcons[member.role]
                return (
                  <div key={member.id} className="flex items-center justify-between py-1 px-2 bg-background/50 rounded">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-foreground">{member.name}</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/20"
                        onClick={() => onRemoveMember(team.id, member.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
              {team.members.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">팀원 없음</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
