"use client"

import type React from "react"

import { useState } from "react"
import { Swords } from "lucide-react"
import { useDialog } from "@/common/hooks/use-dialog"
import { Button } from "@/common/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"

interface CreateScrimModalProps {
  onCreateScrim: (scrim: { title: string; scheduledDate: string; signupDeadline?: string }) => void
}

export function CreateScrimModal({ onCreateScrim }: CreateScrimModalProps) {
  const dialog = useDialog()
  const [title, setTitle] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [signupDeadline, setSignupDeadline] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title && scheduledDate) {
      onCreateScrim({
        title,
        scheduledDate,
        ...(signupDeadline ? { signupDeadline } : {}),
      })
      setTitle("")
      setScheduledDate("")
      setSignupDeadline("")
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
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-bold italic uppercase tracking-wide text-foreground flex items-center justify-between">
            새 내전 생성 (수동)
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
          <div className="space-y-2">
            <Label htmlFor="scrim-deadline" className="text-foreground font-semibold">
              신청 마감시간 (선택)
            </Label>
            <Input
              id="scrim-deadline"
              type="datetime-local"
              value={signupDeadline}
              onChange={(e) => setSignupDeadline(e.target.value)}
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
