"use client"

import type React from "react"

import { useState } from "react"
import { Swords } from "lucide-react"
import { useDialog } from "@/common/hooks/use-dialog"
import { Button } from "@/common/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { cn } from "@/lib/utils"

interface CreateScrimData {
  title: string
  scheduledDate: string
  signupDeadline?: string
  checkInStart?: string
  minPlayers?: number
  maxPlayers?: number
  description?: string
  recruitmentType?: string
}

interface CreateScrimModalProps {
  onCreateScrim: (scrim: CreateScrimData) => void
}

export function CreateScrimModal({ onCreateScrim }: CreateScrimModalProps) {
  const dialog = useDialog()
  const [title, setTitle] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [signupDeadline, setSignupDeadline] = useState("")
  const [checkInStart, setCheckInStart] = useState("")
  const [minPlayers, setMinPlayers] = useState(6)
  const [maxPlayers, setMaxPlayers] = useState(12)
  const [description, setDescription] = useState("")
  const [recruitmentType, setRecruitmentType] = useState("OPEN")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title && scheduledDate) {
      onCreateScrim({
        title,
        scheduledDate,
        recruitmentType,
        minPlayers,
        maxPlayers,
        ...(signupDeadline ? { signupDeadline } : {}),
        ...(checkInStart ? { checkInStart } : {}),
        ...(description ? { description } : {}),
      })
      setTitle("")
      setScheduledDate("")
      setSignupDeadline("")
      setCheckInStart("")
      setMinPlayers(6)
      setMaxPlayers(12)
      setDescription("")
      setRecruitmentType("OPEN")
      dialog.close()
    }
  }

  return (
    <Dialog {...dialog.dialogProps}>
      <DialogTrigger asChild>
        <Button className="skew-btn bg-accent text-accent-foreground font-bold uppercase tracking-wide hover:bg-accent/90">
          <span className="flex items-center gap-2">
            <Swords className="w-4 h-4" /> 내전 생성
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold italic uppercase tracking-wide text-foreground flex items-center justify-between">
            새 내전 생성
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scrim-title" className="text-foreground font-semibold">
              내전 제목
            </Label>
            <Input
              id="scrim-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 토요일 정기 내전"
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-semibold">모집 방식</Label>
            <div className="flex gap-2">
              {[
                { value: "OPEN", label: "자유 참가" },
                { value: "MANUAL", label: "수동 배정" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecruitmentType(opt.value)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-sm border text-sm font-bold transition-all",
                    recruitmentType === opt.value
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 text-muted-foreground bg-muted/30"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scrim-date" className="text-foreground font-semibold">
              일시
            </Label>
            <Input
              id="scrim-date"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="scrim-deadline" className="text-foreground font-semibold">
                신청 마감 (선택)
              </Label>
              <Input
                id="scrim-deadline"
                type="datetime-local"
                value={signupDeadline}
                onChange={(e) => setSignupDeadline(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scrim-checkin" className="text-foreground font-semibold">
                체크인 시작 (선택)
              </Label>
              <Input
                id="scrim-checkin"
                type="datetime-local"
                value={checkInStart}
                onChange={(e) => setCheckInStart(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="scrim-min" className="text-foreground font-semibold">
                최소 인원
              </Label>
              <Input
                id="scrim-min"
                type="number"
                min={2}
                max={30}
                value={minPlayers}
                onChange={(e) => setMinPlayers(Number(e.target.value))}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scrim-max" className="text-foreground font-semibold">
                최대 인원
              </Label>
              <Input
                id="scrim-max"
                type="number"
                min={2}
                max={30}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scrim-desc" className="text-foreground font-semibold">
              설명 (선택)
            </Label>
            <Input
              id="scrim-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 실력 향상을 위한 정기 내전입니다"
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialog.close()}
              className="border-border text-muted-foreground"
            >
              취소
            </Button>
            <Button type="submit" className="skew-btn bg-primary text-primary-foreground font-bold">
              <span>생성</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
