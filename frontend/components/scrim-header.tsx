"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, Clock, Pencil } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface ScrimHeaderProps {
  scrim: {
    id: string
    title: string
    status: "scheduled" | "finished"
    date: string
    startTime: string
    endTime: string
  }
  isAdmin: boolean
  onUpdateSchedule: (date: string, startTime: string, endTime: string) => void
}

export function ScrimHeader({ scrim, isAdmin, onUpdateSchedule }: ScrimHeaderProps) {
  const [editDate, setEditDate] = useState(scrim.date)
  const [editStartTime, setEditStartTime] = useState(scrim.startTime)
  const [editEndTime, setEditEndTime] = useState(scrim.endTime)
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    onUpdateSchedule(editDate, editStartTime, editEndTime)
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link href="/">
        <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          로비로 돌아가기
        </Button>
      </Link>

      {/* Title and Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-card border-2 border-border rounded-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-extrabold italic uppercase tracking-wider text-foreground">
            {scrim.title}
          </h1>
          <Badge
            className={cn(
              "uppercase font-bold tracking-wide",
              scrim.status === "finished" ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground",
            )}
          >
            {scrim.status === "finished" ? "종료됨" : "예정됨"}
          </Badge>
        </div>

        {/* Schedule Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">{scrim.date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-medium">
              {scrim.startTime} ~ {scrim.endTime}
            </span>
          </div>

          {isAdmin && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-primary/50 text-primary hover:bg-primary/20 bg-transparent"
                >
                  <Pencil className="w-3 h-3" />
                  수정
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-card border-border" align="end">
                <div className="space-y-4">
                  <h3 className="font-bold text-foreground">일정 수정</h3>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-muted-foreground">
                      날짜
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="bg-muted border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="startTime" className="text-muted-foreground">
                        시작 시간
                      </Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime" className="text-muted-foreground">
                        종료 시간
                      </Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="bg-muted border-border"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSave}
                    className="w-full skew-btn bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <span>저장</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  )
}
