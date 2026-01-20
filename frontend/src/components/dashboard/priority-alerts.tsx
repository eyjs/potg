"use client"

import Link from "next/link"
import { AlertCircle, Clock, Flame } from "lucide-react"
import { Card, CardContent } from "@/common/components/ui/card"
import { Button } from "@/common/components/ui/button"
import { cn } from "@/lib/utils"

interface Alert {
  type: "vote" | "auction" | "betting"
  title: string
  description: string
  href: string
  urgency: "high" | "medium" | "low"
}

interface PriorityAlertsProps {
  alerts: Alert[]
}

const urgencyColors = {
  high: "border-destructive/50 bg-destructive/5",
  medium: "border-primary/50 bg-primary/5",
  low: "border-accent/50 bg-accent/5",
}

const urgencyIcons = {
  high: <Flame className="w-5 h-5 text-destructive" />,
  medium: <Clock className="w-5 h-5 text-primary" />,
  low: <AlertCircle className="w-5 h-5 text-accent" />,
}

export function PriorityAlerts({ alerts }: PriorityAlertsProps) {
  if (alerts.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
        <Flame className="w-6 h-6 text-primary" />
        지금 <span className="text-primary">주목할 것</span>
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {alerts.map((alert, index) => (
          <Link key={index} href={alert.href}>
            <Card
              className={cn(
                "border-2 transition-all hover:scale-[1.02] cursor-pointer",
                urgencyColors[alert.urgency]
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{urgencyIcons[alert.urgency]}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground uppercase italic text-sm md:text-base truncate">
                      {alert.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      {alert.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs font-bold uppercase"
                  >
                    확인 →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
