"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Users, Hash } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"

interface CreateAuctionModalProps {
  onCreateAuction: (auction: { title: string; maxParticipants: number; teamCount: number }) => void
}

export function CreateAuctionModal({ onCreateAuction }: CreateAuctionModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [maxParticipants, setMaxParticipants] = useState(20)
  const [teamCount, setTeamCount] = useState(2)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onCreateAuction({
      title: title.trim(),
      maxParticipants,
      teamCount,
    })

    setTitle("")
    setMaxParticipants(20)
    setTeamCount(2)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-semibold uppercase tracking-wide">
          <Plus className="w-4 h-4 mr-2" />
          <span>경매 생성</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold italic uppercase tracking-wide text-foreground">
            새 경매 생성
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            경매 정보를 입력하고 드래프트를 시작하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground font-semibold">
              경매 제목
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 금요일 내전 경매"
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="participants" className="text-foreground font-semibold flex items-center gap-1">
                <Users className="w-4 h-4" />
                최대 인원
              </Label>
              <Input
                id="participants"
                type="number"
                min={4}
                max={40}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teams" className="text-foreground font-semibold flex items-center gap-1">
                <Hash className="w-4 h-4" />팀 수
              </Label>
              <Input
                id="teams"
                type="number"
                min={2}
                max={8}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              type="submit"
              className="skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <span>생성</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
