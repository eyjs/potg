"use client"

import { Trophy, Crown, Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { ScrimResult, ScrimResultEntry } from "../types"

const RANK_STYLES: Record<number, { color: string; bg: string; icon: string; label: string }> = {
  1: { color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", icon: "gold", label: "1st" },
  2: { color: "text-gray-300", bg: "bg-gray-300/10 border-gray-300/30", icon: "silver", label: "2nd" },
  3: { color: "text-amber-600", bg: "bg-amber-600/10 border-amber-600/30", icon: "bronze", label: "3rd" },
  4: { color: "text-muted-foreground", bg: "bg-muted/20 border-border/30", icon: "none", label: "4th" },
}

function getDisplayName(entry: ScrimResultEntry): string {
  return entry.user?.nickname || entry.user?.battleTag?.split("#")[0] || "Unknown"
}

interface ScrimResultViewProps {
  result: ScrimResult
}

export function ScrimResultView({ result }: ScrimResultViewProps) {
  // Group entries by team (teamCaptainId)
  const teamMap = new Map<string, ScrimResultEntry[]>()
  for (const entry of result.entries) {
    const existing = teamMap.get(entry.teamCaptainId) ?? []
    existing.push(entry)
    teamMap.set(entry.teamCaptainId, existing)
  }

  // Sort teams by rank
  const teams = Array.from(teamMap.entries())
    .map(([captainId, members]) => {
      const captain = members.find((m) => m.isCaptain)
      return {
        captainId,
        rank: captain?.rank ?? members[0]?.rank ?? 99,
        members: members.sort((a, b) => {
          if (a.isCaptain) return -1
          if (b.isCaptain) return 1
          return 0
        }),
      }
    })
    .sort((a, b) => a.rank - b.rank)

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
            result.status === "CONFIRMED"
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
          )}
        >
          {result.status === "CONFIRMED" ? "확정" : "임시"}
        </span>
        {result.confirmedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(result.confirmedAt).toLocaleDateString("ko-KR")}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-3">
        {teams.map((team) => {
          const style = RANK_STYLES[team.rank] ?? RANK_STYLES[4]

          return (
            <div
              key={team.captainId}
              className={cn(
                "rounded-lg border p-4",
                style.bg,
              )}
            >
              {/* Team Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("flex items-center gap-2", style.color)}>
                  {team.rank === 1 ? (
                    <Trophy className="w-5 h-5 fill-current" />
                  ) : team.rank <= 3 ? (
                    <Star className="w-5 h-5 fill-current" />
                  ) : null}
                  <span className="font-black text-lg italic">{style.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  +{team.members[0]?.basePoints ?? 0}p (기본)
                </span>
              </div>

              {/* Team Members */}
              <div className="space-y-2">
                {team.members.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={entry.user?.avatarUrl ?? undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {getDisplayName(entry)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {getDisplayName(entry)}
                      </span>
                      {entry.isCaptain && (
                        <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={cn(
                        "text-sm font-bold",
                        entry.isCaptain ? "text-yellow-400" : "text-foreground/80",
                      )}>
                        +{entry.earnedScrimPoints}p
                      </span>
                      {entry.isCaptain && (
                        <span className="text-[10px] text-yellow-400/70 font-semibold">
                          x2
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
