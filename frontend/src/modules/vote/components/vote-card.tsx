"use client"

import { Check, X, Clock, Users, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader } from "@/common/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/common/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface VoteCardProps {
  id: string
  title: string
  deadline: string
  currentVotes: number
  maxVotes: number
  status: "open" | "closed"
  isAdmin?: boolean
  userVote?: "attend" | "absent" | "late" | null
  onVote?: (vote: "attend" | "absent" | "late") => void
  onEdit?: () => void
  onDelete?: () => void
  onClose?: () => void
}

export function VoteCard({
  title,
  deadline,
  currentVotes,
  maxVotes,
  status,
  isAdmin = false,
  userVote = null,
  onVote,
  onEdit,
  onDelete,
  onClose,
}: VoteCardProps) {
  const progress = (currentVotes / maxVotes) * 100
  const isOpen = status === "open"

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 transition-all",
        isOpen ? "border-primary/50 bg-card" : "border-muted bg-muted/30 opacity-70",
      )}
    >
      {/* Status Badge */}
      <div
        className={cn(
          "absolute top-0 right-0 px-3 py-1 text-xs font-bold uppercase tracking-wider",
          isOpen ? "bg-primary text-primary-foreground" : "bg-muted-foreground text-background",
        )}
      >
        {isOpen ? "투표중" : "마감"}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="pr-16">
            <h3 className="font-bold text-lg italic uppercase tracking-wide text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">마감: {deadline}</p>
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Pencil className="w-4 h-4 mr-2" /> 수정
                </DropdownMenuItem>
                {isOpen && (
                  <DropdownMenuItem onClick={onClose} className="cursor-pointer">
                    <X className="w-4 h-4 mr-2" /> 마감
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>참여 현황</span>
            </div>
            <span className="font-bold text-primary">
              {currentVotes}/{maxVotes}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-sm overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500", isOpen ? "progress-animated" : "bg-muted-foreground")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Vote Buttons */}
        {isOpen && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={userVote === "attend" ? "default" : "outline"}
              className={cn(
                "skew-btn h-10 font-semibold text-sm",
                userVote === "attend"
                  ? "bg-accent text-accent-foreground"
                  : "border-accent/50 text-accent hover:bg-accent/20",
              )}
              onClick={() => onVote?.("attend")}
            >
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4" /> 참석
              </span>
            </Button>
            <Button
              variant={userVote === "absent" ? "default" : "outline"}
              className={cn(
                "skew-btn h-10 font-semibold text-sm",
                userVote === "absent"
                  ? "bg-destructive text-destructive-foreground"
                  : "border-destructive/50 text-destructive hover:bg-destructive/20",
              )}
              onClick={() => onVote?.("absent")}
            >
              <span className="flex items-center gap-1">
                <X className="w-4 h-4" /> 불참
              </span>
            </Button>
            <Button
              variant={userVote === "late" ? "default" : "outline"}
              className={cn(
                "skew-btn h-10 font-semibold text-sm",
                userVote === "late"
                  ? "bg-primary text-primary-foreground"
                  : "border-primary/50 text-primary hover:bg-primary/20",
              )}
              onClick={() => onVote?.("late")}
            >
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> 늦참
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
