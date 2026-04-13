"use client"

import { Trophy, Medal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { ScrimRankingEntry } from "../types"

const RANK_COLORS: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-gray-300",
  3: "text-amber-600",
}

interface ScrimRankingTableProps {
  rankings: ScrimRankingEntry[]
  pointField: "scrimPoints" | "totalPoints"
  pointLabel: string
}

export function ScrimRankingTable({
  rankings,
  pointField,
  pointLabel,
}: ScrimRankingTableProps) {
  if (rankings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-bold">아직 랭킹 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="grid grid-cols-[40px_1fr_80px] gap-2 px-3 py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
        <span>#</span>
        <span>플레이어</span>
        <span className="text-right">{pointLabel}</span>
      </div>

      {/* Rankings */}
      {rankings.map((entry) => {
        const displayName = entry.nickname || entry.battleTag?.split("#")[0] || "Unknown"
        const rankColor = RANK_COLORS[entry.rank]
        const isTopThree = entry.rank <= 3

        return (
          <div
            key={entry.userId}
            className={cn(
              "grid grid-cols-[40px_1fr_80px] gap-2 items-center px-3 py-3 rounded-lg transition-colors",
              isTopThree
                ? "bg-card/80 border border-border/50"
                : "hover:bg-muted/20",
            )}
          >
            {/* Rank */}
            <div className={cn("font-black text-lg italic", rankColor)}>
              {entry.rank <= 3 ? (
                <div className="flex items-center">
                  {entry.rank === 1 ? (
                    <Trophy className="w-5 h-5 fill-current text-yellow-400" />
                  ) : (
                    <Medal className={cn("w-5 h-5", rankColor)} />
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm pl-0.5">
                  {entry.rank}
                </span>
              )}
            </div>

            {/* Player */}
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={entry.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {displayName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className={cn(
                  "text-sm font-semibold truncate",
                  isTopThree && "text-foreground",
                )}>
                  {displayName}
                </p>
                {entry.battleTag && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {entry.battleTag}
                  </p>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <span className={cn(
                "font-bold text-sm",
                isTopThree ? "text-primary" : "text-foreground/70",
              )}>
                {entry[pointField].toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground ml-0.5">p</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
