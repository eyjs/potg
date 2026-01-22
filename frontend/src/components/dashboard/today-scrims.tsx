"use client"

import { Swords, Clock, Users, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import { Button } from "@/common/components/ui/button"
import Link from "next/link"

interface Scrim {
  id: string
  title: string
  scheduledDate: string
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED"
  recruitmentType: "VOTE" | "AUCTION" | "MANUAL"
  teamAScore: number
  teamBScore: number
  participantsCount?: number
}

interface TodayScrimsProps {
  scrims: Scrim[]
}

export function TodayScrims({ scrims }: TodayScrimsProps) {
  const getStatusBadge = (status: Scrim["status"]) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">예정</Badge>
      case "IN_PROGRESS":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">진행중</Badge>
      case "FINISHED":
        return <Badge className="bg-muted text-muted-foreground">종료</Badge>
      default:
        return <Badge variant="outline">대기</Badge>
    }
  }

  const getTypeLabel = (type: Scrim["recruitmentType"]) => {
    switch (type) {
      case "AUCTION":
        return "경매"
      case "VOTE":
        return "투표"
      default:
        return "일반"
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
          <Swords className="w-6 h-6 text-primary" />
          오늘의 <span className="text-primary">내전</span>
        </h2>
        <Link href="/vote">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            전체보기 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {scrims.length === 0 ? (
        <Card className="border-2 border-dashed border-border/50 bg-card/50">
          <CardContent className="p-8 text-center">
            <Swords className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">오늘 예정된 내전이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scrims.map((scrim) => (
            <Link key={scrim.id} href={`/scrim/${scrim.id}`}>
              <Card className="border-2 border-primary/20 bg-card hover:border-primary/40 transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(scrim.status)}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(scrim.recruitmentType)}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {scrim.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(scrim.scheduledDate)}
                        </span>
                        {scrim.participantsCount && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {scrim.participantsCount}명
                          </span>
                        )}
                      </div>
                    </div>

                    {scrim.status === "FINISHED" || scrim.status === "IN_PROGRESS" ? (
                      <div className="text-center shrink-0">
                        <div className="text-2xl font-black italic text-foreground">
                          <span className={scrim.teamAScore > scrim.teamBScore ? "text-primary" : ""}>{scrim.teamAScore}</span>
                          <span className="text-muted-foreground mx-1">:</span>
                          <span className={scrim.teamBScore > scrim.teamAScore ? "text-primary" : ""}>{scrim.teamBScore}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">A vs B</p>
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
