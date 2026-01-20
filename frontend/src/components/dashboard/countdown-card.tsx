"use client"

import { useEffect, useState } from "react"
import { Clock, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"

interface CountdownCardProps {
  nextEventDate?: string
  nextEventTitle?: string
}

function calculateTimeLeft(targetDate: string) {
  const difference = new Date(targetDate).getTime() - new Date().getTime()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

export function CountdownCard({ nextEventDate, nextEventTitle }: CountdownCardProps) {
  const [timeLeft, setTimeLeft] = useState(
    nextEventDate ? calculateTimeLeft(nextEventDate) : null
  )

  useEffect(() => {
    if (!nextEventDate) return

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(nextEventDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [nextEventDate])

  if (!nextEventDate || !timeLeft) {
    return (
      <Card className="border-2 border-muted/30 bg-card">
        <CardHeader className="pb-3">
          <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            다음 <span className="text-primary">이벤트</span>
          </h2>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center">
            <p className="text-muted-foreground text-sm">
              예정된 이벤트가 없습니다
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          D-Day <span className="text-primary">카운터</span>
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextEventTitle && (
          <div className="text-center pb-2">
            <p className="text-sm text-muted-foreground uppercase font-bold">다음 이벤트</p>
            <p className="text-foreground font-black italic mt-1">{nextEventTitle}</p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
            <div className="text-2xl md:text-3xl font-black italic text-primary">
              {timeLeft.days}
            </div>
            <div className="text-xs text-muted-foreground uppercase font-bold mt-1">
              일
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
            <div className="text-2xl md:text-3xl font-black italic text-primary">
              {timeLeft.hours}
            </div>
            <div className="text-xs text-muted-foreground uppercase font-bold mt-1">
              시간
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
            <div className="text-2xl md:text-3xl font-black italic text-primary">
              {timeLeft.minutes}
            </div>
            <div className="text-xs text-muted-foreground uppercase font-bold mt-1">
              분
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
            <div className="text-2xl md:text-3xl font-black italic text-primary">
              {timeLeft.seconds}
            </div>
            <div className="text-xs text-muted-foreground uppercase font-bold mt-1">
              초
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
