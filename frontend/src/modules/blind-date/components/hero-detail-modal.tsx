"use client"

import { MapPin, Briefcase, Brain, Cigarette, Trash2, GraduationCap, Ruler, User as UserIcon, Send } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/common/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { cn } from "@/lib/utils"
import type { Hero } from "@/app/gallery/page"
import api from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"

interface HeroDetailModalProps {
  hero: Hero | null
  isAdmin: boolean
  onClose: () => void
  onUpdateStatus: (heroId: string, status: Hero["status"]) => void
  onDelete: (heroId: string) => void
}

const statusConfig = {
  available: { label: "만남 가능", color: "bg-green-500 text-white" },
  talking: { label: "소개팅 중", color: "bg-yellow-500 text-black" },
  taken: { label: "매칭 완료", color: "bg-muted text-muted-foreground" },
}

export function HeroDetailModal({ hero, isAdmin, onClose, onUpdateStatus, onDelete }: HeroDetailModalProps) {
  const { user } = useAuth()
  if (!hero) return null

  const statusConf = statusConfig[hero.status]
  const isOwner = user?.id === hero.registerId

  const handleApply = async () => {
    const message = prompt("상대방에게 전달할 한마디를 입력해주세요 (선택):", "안녕하세요! 프로필 보고 연락드렸습니다.")
    if (message === null) return // Cancelled

    try {
      await api.post(`/blind-date/listings/${hero.id}/request`, { message })
      toast.success("신청이 완료되었습니다! 매니저의 확인을 기다려주세요.")
      onClose()
    } catch (error: any) {
      console.error("Failed to apply:", error)
      toast.error(error.response?.data?.message || "신청에 실패했습니다.")
    }
  }

  return (
    <Dialog open={!!hero} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">{hero.name} 상세 정보</DialogTitle>
        </DialogHeader>

        {/* Hero Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/50 shrink-0 overflow-hidden">
            {hero.avatar ? (
              <img src={hero.avatar} alt={hero.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-foreground">{hero.name.charAt(0)}</span>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-foreground">{hero.name}</h2>
              <Badge className={cn(statusConf.color)}>{statusConf.label}</Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{hero.age}세</span>
              {hero.mbti && (
                <>
                  <span>·</span>
                  <span>{hero.mbti}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-bold bg-primary/10 w-fit px-2 py-1 rounded">
              <UserIcon className="w-3 h-3" />
              <span>등록자: {hero.registerNickname}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">거주지</p>
              <p className="text-sm font-semibold text-foreground">{hero.location || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">직업</p>
              <p className="text-sm font-semibold text-foreground">{hero.job || "-"}</p>
            </div>
          </div>
          {hero.education && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">학력</p>
                <p className="text-sm font-semibold text-foreground">{hero.education}</p>
              </div>
            </div>
          )}
          {hero.height && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">키</p>
                <p className="text-sm font-semibold text-foreground">{hero.height}cm</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <Brain className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">MBTI</p>
              <p className="text-sm font-semibold text-foreground">{hero.mbti || "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <Cigarette className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">흡연</p>
              <p className="text-sm font-semibold text-foreground">{hero.smoking ? "O" : "X"}</p>
            </div>
          </div>
        </div>

        {/* Bio */}
        {hero.bio && (
          <div className="mt-4 p-4 bg-muted/20 rounded border border-border/50">
            <p className="text-xs text-muted-foreground font-bold mb-1">소개</p>
            <p className="text-sm text-foreground">&quot;{hero.bio}&quot;</p>
          </div>
        )}

        {/* Ideal Type */}
        {hero.idealType && (
          <div className="mt-4 p-4 bg-primary/5 rounded border border-primary/20">
            <p className="text-xs text-primary font-bold mb-1">원하는 상대 조건</p>
            <p className="text-sm text-foreground">{hero.idealType}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2">
          {hero.status === "available" && !isOwner && (
            <Button onClick={handleApply} className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-6 text-lg skew-btn">
              <Send className="w-5 h-5 mr-2" />
              소개팅 신청하기
            </Button>
          )}
          {isOwner && (
            <div className="text-center p-3 bg-muted/20 rounded border border-dashed border-border text-xs text-muted-foreground">
              내가 등록한 매물입니다. 신청 내역은 매니저를 통해 확인해주세요.
            </div>
          )}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">상태 변경:</span>
              <Select value={hero.status} onValueChange={(value) => onUpdateStatus(hero.id, value as Hero["status"])}>
                <SelectTrigger className="w-32 bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="available">만남 가능</SelectItem>
                  <SelectItem value="talking">소개팅 중</SelectItem>
                  <SelectItem value="taken">매칭 완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(hero.id)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              삭제
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
