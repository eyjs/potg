"use client"

import { Card, CardContent } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import { Trophy, Crown, Shield, Crosshair, Heart, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AuctionRoomState } from "../hooks/use-auction-socket"

const teamColors = ["#F99E1A", "#00C3FF", "#FF4649", "#00FF88", "#FF00FF", "#FFFF00"]

const roleConfig = {
  tank: { icon: Shield, color: "text-yellow-500" },
  dps: { icon: Crosshair, color: "text-red-500" },
  support: { icon: Heart, color: "text-green-500" },
  flex: { icon: Users, color: "text-purple-500" },
}

interface AuctionResultsPosterProps {
  title: string
  teams: AuctionRoomState["teams"]
}

export function AuctionResultsPoster({ title, teams }: AuctionResultsPosterProps) {
  return (
    <Card className="border-primary/50 bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider">
              경매 결과
            </h1>
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team, index) => {
            const teamColor = teamColors[index % teamColors.length]
            const totalSpent =
              team.members.reduce((sum, m) => sum + m.price, 0)

            return (
              <div
                key={team.captainId}
                className="rounded-lg p-4"
                style={{
                  background: `linear-gradient(135deg, ${teamColor}10 0%, transparent 100%)`,
                  border: `2px solid ${teamColor}50`,
                }}
              >
                {/* Team Header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: teamColor + "30" }}
                  >
                    <Crown className="w-6 h-6" style={{ color: teamColor }} />
                  </div>
                  <div>
                    <h3
                      className="font-black text-lg uppercase tracking-wide"
                      style={{ color: teamColor }}
                    >
                      TEAM {String.fromCharCode(65 + index)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {team.captainName?.split("#")[0] || "캡틴"} 팀
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-muted-foreground">잔여 포인트</p>
                    <p className="font-bold text-primary">
                      {team.points.toLocaleString()}P
                    </p>
                  </div>
                </div>

                {/* Captain */}
                <div className="mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                    팀장
                  </p>
                  <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                    <Crown className="w-4 h-4" style={{ color: teamColor }} />
                    <span className="font-bold">
                      {team.captainName?.split("#")[0] || "캡틴"}
                    </span>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                    팀원 ({team.members.length}명)
                  </p>
                  <div className="space-y-1">
                    {team.members.map((member) => {
                      const role = (member.role || "flex") as keyof typeof roleConfig
                      const config = roleConfig[role] || roleConfig.flex
                      const Icon = config.icon

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded bg-background/50"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", config.color)} />
                            <span className="font-semibold">{member.name}</span>
                            {member.wasUnsold && (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0 text-yellow-500 border-yellow-500"
                              >
                                유찰
                              </Badge>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm font-bold",
                              member.wasUnsold ? "text-yellow-500" : "text-primary"
                            )}
                          >
                            {member.price.toLocaleString()}P
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">총 사용 포인트</span>
                  <span className="font-black text-lg" style={{ color: teamColor }}>
                    {totalSpent.toLocaleString()}P
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            POTG Auction System | Generated automatically
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
