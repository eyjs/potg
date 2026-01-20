"use client"

import { TrendingUp, Users, Coins, Swords } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"

interface ActivitySummaryProps {
  scrimCount?: number
  bettingCount?: number
  totalParticipants?: number
}

export function ActivitySummary({
  scrimCount = 0,
  bettingCount = 0,
  totalParticipants = 0,
}: ActivitySummaryProps) {
  const stats = [
    {
      label: "이번 주 내전",
      value: scrimCount,
      unit: "회",
      icon: <Swords className="w-5 h-5 text-accent" />,
      color: "border-accent/30 bg-accent/5",
    },
    {
      label: "총 베팅",
      value: bettingCount,
      unit: "건",
      icon: <TrendingUp className="w-5 h-5 text-primary" />,
      color: "border-primary/30 bg-primary/5",
    },
    {
      label: "평균 참여자",
      value: totalParticipants,
      unit: "명",
      icon: <Users className="w-5 h-5 text-destructive" />,
      color: "border-destructive/30 bg-destructive/5",
    },
  ]

  return (
    <section className="space-y-4">
      <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        클랜 <span className="text-primary">활동 요약</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className={`border-2 ${stat.color} transition-all hover:scale-105`}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                {stat.icon}
                <span className="text-xs text-muted-foreground uppercase font-bold">
                  {stat.label}
                </span>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-black italic text-foreground">
                  {stat.value}
                  <span className="text-lg md:text-xl text-muted-foreground ml-1">
                    {stat.unit}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
