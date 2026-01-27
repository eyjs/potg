"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Save } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"

interface EditVoteModalProps {
  vote: { id: string; title: string; deadline: string } | null
  onClose: () => void
  onUpdate: (id: string, data: { title: string; deadline: string }) => void
}

export function EditVoteModal({ vote, onClose, onUpdate }: EditVoteModalProps) {
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const isOpenRef = useRef(false)

  useEffect(() => {
    if (vote) {
      setTitle(vote.title)
      // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
      const date = new Date(vote.deadline)
      const formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setDeadline(formattedDate)
    }
  }, [vote])

  // 뒤로가기로 모달 닫기 지원
  useEffect(() => {
    if (!vote) return
    isOpenRef.current = true
    window.history.pushState({ dialog: true }, "")

    const handlePopState = () => {
      if (isOpenRef.current) {
        isOpenRef.current = false
        onClose()
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [vote, onClose])

  const handleDialogClose = useCallback(() => {
    if (isOpenRef.current) {
      isOpenRef.current = false
      onClose()
      window.history.back()
    }
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (vote && title && deadline) {
      onUpdate(vote.id, { title, deadline: new Date(deadline).toISOString() })
      handleDialogClose()
    }
  }

  return (
    <Dialog open={!!vote} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-bold italic uppercase tracking-wide text-foreground">
            투표 정보 수정
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-foreground font-semibold">
              투표 제목
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-deadline" className="text-foreground font-semibold">
              마감 일시 수정
            </Label>
            <Input
              id="edit-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              className="border-border text-muted-foreground"
            >
              취소
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground font-bold rounded-md gap-2">
              <Save className="w-4 h-4" />
              <span>저장</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
