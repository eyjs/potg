"use client"

import { Shield, Crosshair, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Player, Team } from "@/app/auction/[id]/page"

interface AuctionStageProps {
  currentPlayer: Player | null
  currentBid: { teamId: string; amount: number } | null
  auctionStatus: "waiting" | "bidding" | "paused" | "ended"
  timer: number
  teams: Team[]
  userRole: "admin" | "captain" | "spectator"
  myCaptainTeamId: string | null
  onBid: (amount: number) => void
}

const roleConfig = {
  tank: { icon: Shield, color: "text-yellow-500", bg: "bg-yellow-500/20" },
  dps: { icon: Crosshair, color: "text-red-500", bg: "bg-red-500/20" },
  support: { icon: Heart, color: "text-green-500", bg: "bg-green-500/20" },
}

export function AuctionStage({
  currentPlayer,
  currentBid,
  auctionStatus,
  timer,
  teams,
  userRole,
  myCaptainTeamId,
  onBid,
}: AuctionStageProps) {
  const currentBidTeam = currentBid ? teams.find((t) => t.id === currentBid.teamId) : null
  const myTeam = myCaptainTeamId ? teams.find((t) => t.id === myCaptainTeamId) : null
  const canBid = (userRole === "captain" || userRole === "admin") && auctionStatus === "bidding" && currentPlayer

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-6">
        {/* Timer Bar */}
        {auctionStatus === "bidding" && (
          <div className="mb-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000",
                  timer > 5 ? "bg-primary" : timer > 2 ? "bg-yellow-500" : "bg-destructive",
                )}
                style={{ width: `${(timer / 10) * 100}%` }}
              />
            </div>
            <p className="text-center mt-2 text-2xl font-bold text-foreground">{timer}초</p>
          </div>
        )}

        {/* Stage */}
        <div className="min-h-[250px] flex flex-col items-center justify-center">
          {currentPlayer ? (
            <>
              {/* Player Card */}
              <div
                className={cn(
                  "w-40 h-52 rounded-lg border-2 flex flex-col items-center justify-center p-4",
                  auctionStatus === "bidding" ? "border-primary pulse-live" : "border-border",
                  roleConfig[currentPlayer.role].bg,
                )}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                  {(() => {
                    const Icon = roleConfig[currentPlayer.role].icon
                    return <Icon className={cn("w-8 h-8", roleConfig[currentPlayer.role].color)} />
                  })()}
                </div>
                <h3 className="font-bold text-xl text-foreground">{currentPlayer.name}</h3>
                <p className="text-sm text-muted-foreground">{currentPlayer.tier}</p>
              </div>

              {/* Current Bid */}
              {currentBid && (
                <div className="mt-4 text-center">
                  <p className="text-muted-foreground text-sm">현재 최고 입찰</p>
                  <p className="text-3xl font-extrabold text-primary">{currentBid.amount.toLocaleString()}P</p>
                  <p className="text-sm" style={{ color: currentBidTeam?.color }}>
                    by {currentBidTeam?.name}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <span className="text-4xl">?</span>
              </div>
              <p className="font-semibold">선수를 선택하여 경매를 시작하세요</p>
              <p className="text-sm mt-1">왼쪽 선수 풀에서 선수를 클릭하세요</p>
            </div>
          )}
        </div>

        {/* Bidding Buttons (Captain View) */}
        {canBid && (
          <div className="mt-6 space-y-3">
            {myTeam && (
              <p className="text-center text-sm text-muted-foreground">
                보유 포인트: <span className="text-primary font-bold">{myTeam.points.toLocaleString()}P</span>
              </p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((amount) => (
                <Button
                  key={amount}
                  size="lg"
                  className="skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
                  onClick={() => onBid(amount)}
                  disabled={Boolean(myTeam && myTeam.points < (currentBid?.amount || 0) + amount)}
                >
                  <span>+{amount}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Spectator Notice */}
        {userRole === "spectator" && auctionStatus === "bidding" && (
          <div className="mt-6 text-center text-muted-foreground">
            <p>관전 모드 - 베팅에 참여할 수 없습니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
