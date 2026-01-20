"use client"

import { Users, Activity } from "lucide-react"
import { Card, CardContent } from "@/common/components/ui/card"

interface ClanOverviewBannerProps {
  clanName: string
  voteCount: number
  auctionCount: number
  bettingCount: number
}

export function ClanOverviewBanner({
  clanName,
  voteCount,
  auctionCount,
  bettingCount,
}: ClanOverviewBannerProps) {
  const totalEvents = voteCount + auctionCount + bettingCount

  return (
    <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Clan Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary skew-btn flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                CLAN DASHBOARD
              </p>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-foreground">
                {clanName}
              </h1>
            </div>
          </div>

          {/* Event Stats */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">
                  진행 중
                </p>
                <p className="text-xl font-black italic text-primary">
                  {totalEvents}개
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <div className="text-center px-3 py-2 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-xs text-muted-foreground font-bold">투표</p>
                <p className="text-lg font-black italic text-foreground">{voteCount}</p>
              </div>
              <div className="text-center px-3 py-2 bg-accent/10 rounded-lg border border-accent/30">
                <p className="text-xs text-muted-foreground font-bold">경매</p>
                <p className="text-lg font-black italic text-foreground">{auctionCount}</p>
              </div>
              <div className="text-center px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-xs text-muted-foreground font-bold">베팅</p>
                <p className="text-lg font-black italic text-foreground">{bettingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
