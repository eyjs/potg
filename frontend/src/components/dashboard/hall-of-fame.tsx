"use client"

import { Trophy, DollarSign, Star, Crown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"

interface HallOfFameMember {
  id: string
  username: string
  avatarUrl?: string
  contribution?: number
  points?: number
}

interface HallOfFameProps {
  donors?: HallOfFameMember[]
  topPlayers?: HallOfFameMember[]
}

export function HallOfFame({ donors = [], topPlayers = [] }: HallOfFameProps) {
  return (
    <div className="space-y-6">
      {/* Donors Section */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-primary">기부자</span>
          </h2>
        </CardHeader>
        <CardContent>
          {donors.length > 0 ? (
            <div className="space-y-3">
              {donors.slice(0, 5).map((donor, index) => (
                <div
                  key={donor.id}
                  className="flex items-center gap-3 p-2 bg-card/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg font-black italic text-primary w-6 text-center">
                      #{index + 1}
                    </span>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={donor.avatarUrl} />
                      <AvatarFallback className="bg-primary/20 text-xs">
                        {donor.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-foreground text-sm truncate">
                      {donor.username}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">
                    {donor.contribution?.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <DollarSign className="w-10 h-10 mx-auto text-muted-foreground opacity-20 mb-2" />
              <p className="text-xs text-muted-foreground">
                클랜 활동 기부자를<br />준비중입니다
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hall of Fame Section */}
      <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-3">
          <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            명예의 <span className="text-accent">전당</span>
          </h2>
        </CardHeader>
        <CardContent>
          {topPlayers.length > 0 ? (
            <div className="space-y-3">
              {topPlayers.slice(0, 5).map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 bg-card/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {index === 0 ? (
                      <Crown className="w-5 h-5 text-accent" />
                    ) : (
                      <span className="text-lg font-black italic text-accent w-6 text-center">
                        #{index + 1}
                      </span>
                    )}
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={player.avatarUrl} />
                      <AvatarFallback className="bg-accent/20 text-xs">
                        {player.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-foreground text-sm truncate">
                      {player.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 text-accent" />
                    <span className="text-xs font-bold text-accent">
                      {player.points}P
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground opacity-20 mb-2" />
              <p className="text-xs text-muted-foreground">
                이달의 MVP를<br />집계중입니다
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
