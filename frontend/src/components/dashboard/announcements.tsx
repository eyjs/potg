"use client"

import { Megaphone, Pin, Calendar } from "lucide-react"
import { Card, CardContent } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
  isPinned?: boolean
}

interface AnnouncementsProps {
  announcements?: Announcement[]
}

export function Announcements({ announcements = [] }: AnnouncementsProps) {
  // Placeholder announcements if none provided
  const defaultAnnouncements: Announcement[] = [
    {
      id: "1",
      title: "이번 주 내전 일정",
      content: "이번 주 금요일 오후 8시에 내전이 예정되어 있습니다. 투표 필수!",
      createdAt: new Date().toISOString(),
      isPinned: true
    }
  ]

  const displayAnnouncements = announcements.length > 0 ? announcements : defaultAnnouncements

  return (
    <section className="space-y-4">
      <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-primary" />
        <span className="text-primary">공지사항</span>
      </h2>

      <div className="space-y-3">
        {displayAnnouncements.map((announcement) => (
          <Card
            key={announcement.id}
            className="border-2 border-primary/30 bg-card hover:border-primary/50 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {announcement.isPinned && (
                    <Pin className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <h3 className="font-bold text-foreground uppercase italic text-sm md:text-base truncate">
                    {announcement.title}
                  </h3>
                </div>
                {announcement.isPinned && (
                  <Badge variant="outline" className="border-primary/50 text-primary text-xs shrink-0">
                    고정
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                {announcement.content}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{new Date(announcement.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayAnnouncements.length === 0 && (
        <div className="p-8 border-2 border-dashed border-border/50 rounded-lg text-center">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground text-sm">새로운 공지사항이 없습니다</p>
        </div>
      )}
    </section>
  )
}
