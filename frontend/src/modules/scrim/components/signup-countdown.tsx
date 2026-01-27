"use client"

import { useState, useEffect } from "react"
import { Clock, UserPlus, UserMinus, Users } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"

interface SignupCountdownProps {
  deadline: string
  participantCount: number
  isJoined: boolean
  onJoin: () => void
  onLeave: () => void
}

function calcRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return null
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { hours, minutes, seconds }
}

export function SignupCountdown({
  deadline,
  participantCount,
  isJoined,
  onJoin,
  onLeave,
}: SignupCountdownProps) {
  const [remaining, setRemaining] = useState(calcRemaining(deadline))

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining(deadline))
    }, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  const isExpired = !remaining

  return (
    <Card className="border-2 border-primary/30 bg-card">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                참가 신청
              </span>
              {isExpired ? (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">마감됨</Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                  신청중
                </Badge>
              )}
            </div>
            {isExpired ? (
              <p className="text-sm text-muted-foreground">신청이 마감되었습니다</p>
            ) : (
              <p className="text-lg font-black italic text-primary tabular-nums">
                {String(remaining.hours).padStart(2, "0")}:{String(remaining.minutes).padStart(2, "0")}:{String(remaining.seconds).padStart(2, "0")}
                <span className="text-xs font-normal text-muted-foreground ml-2 not-italic">남음</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{participantCount}명</span>
            </div>

            {!isExpired && (
              isJoined ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLeave}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  참가 취소
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onJoin}
                  className="skew-btn bg-primary text-primary-foreground font-bold"
                >
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-4 h-4" />
                    참가 신청
                  </span>
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
