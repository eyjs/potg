"use client"

import Link from "next/link"
import { Users, Calendar, Trash2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AuctionRoomCardProps {
  id: string
  title: string
  status: "live" | "waiting" | "ended"
  participants: number
  maxParticipants: number
  teamCount: number
  createdAt: string
  isAdmin?: boolean
  onDelete?: () => void
}

export function AuctionRoomCard({
  id,
  title,
  status,
  participants,
  maxParticipants,
  teamCount,
  createdAt,
  isAdmin,
  onDelete,
}: AuctionRoomCardProps) {
  const statusConfig = {
    live: {
      label: "LIVE",
      color: "bg-destructive text-destructive-foreground",
      glow: "pulse-live",
    },
    waiting: {
      label: "대기중",
      color: "bg-accent text-accent-foreground",
      glow: "",
    },
    ended: {
      label: "종료",
      color: "bg-muted text-muted-foreground",
      glow: "",
    },
  }

  const config = statusConfig[status]

  return (
    <Card
      className={cn(
        "bg-card border-border/50 overflow-hidden transition-all hover:border-primary/50",
        status === "live" && "border-destructive/50",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg text-foreground line-clamp-1">{title}</h3>
          <Badge className={cn("shrink-0", config.color, config.glow)}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>
              {participants}/{maxParticipants}명
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-primary font-semibold">{teamCount}팀</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{createdAt}</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Link href={`/auction/${id}`} className="flex-1">
          <Button
            className={cn(
              "w-full skew-btn font-semibold uppercase tracking-wide",
              status === "live"
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : status === "waiting"
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
            )}
            disabled={status === "ended"}
          >
            <LogIn className="w-4 h-4 mr-2" />
            <span>{status === "ended" ? "기록 보기" : "입장"}</span>
          </Button>
        </Link>
        {isAdmin && (
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
