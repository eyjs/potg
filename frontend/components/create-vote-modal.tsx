"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CreateVoteModalProps {
  onCreateVote: (vote: { title: string; deadline: string; maxVotes: number }) => void
}

export function CreateVoteModal({ onCreateVote }: CreateVoteModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const [maxVotes, setMaxVotes] = useState(20)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title && deadline) {
      onCreateVote({ title, deadline, maxVotes })
      setTitle("")
      setDeadline("")
      setMaxVotes(20)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="skew-btn bg-primary text-primary-foreground font-bold uppercase tracking-wide hover:bg-primary/90">
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> 투표 생성
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-bold italic uppercase tracking-wide text-foreground flex items-center justify-between">
            새 투표 생성
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground font-semibold">
              투표 제목
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 금요일 내전 참여"
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline" className="text-foreground font-semibold">
              마감 일시
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxVotes" className="text-foreground font-semibold">
              최대 인원
            </Label>
            <Input
              id="maxVotes"
              type="number"
              value={maxVotes}
              onChange={(e) => setMaxVotes(Number(e.target.value))}
              min={2}
              max={100}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
