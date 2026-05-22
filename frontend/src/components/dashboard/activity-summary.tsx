"use client"

import { Users } from "lucide-react"
import { Card, CardContent } from "@/common/components/ui/card"

interface ActivitySummaryProps {
  totalParticipants?: number
}

export function ActivitySummary({
  totalParticipants = 0,
}: ActivitySummaryProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
        <Users className="w-6 h-6 text-primary" />
        클랜 <span className="text-primary">활동 요약</span>
      </h2>

      <div className="grid grid-cols-1 gap-4">
        <Card className="border-2 border-destructive/30 bg-destructive/5 transition-all hover:scale-105">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-destructive" />
              <span className="text-xs text-muted-foreground uppercase font-bold">평균 참여자</span>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-black italic text-foreground">
                {totalParticipants}
                <span className="text-lg md:text-xl text-muted-foreground ml-1">명</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
