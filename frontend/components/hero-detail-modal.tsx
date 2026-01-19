"use client"

import { MapPin, Briefcase, Brain, Shield, Crosshair, Heart, Cigarette, Gamepad2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Hero } from "@/app/gallery/page"

interface HeroDetailModalProps {
  hero: Hero | null
  isAdmin: boolean
  onClose: () => void
  onUpdateStatus: (heroId: string, status: Hero["status"]) => void
  onDelete: (heroId: string) => void
}

const roleConfig = {
  tank: { icon: Shield, color: "text-yellow-500", label: "탱커" },
  dps: { icon: Crosshair, color: "text-red-500", label: "딜러" },
  support: { icon: Heart, color: "text-green-500", label: "힐러" },
}

const statusConfig = {
  available: { label: "절찬 판매중", color: "bg-green-500 text-white" },
  talking: { label: "썸 진행중", color: "bg-yellow-500 text-black" },
  taken: { label: "품절 (연애중)", color: "bg-muted text-muted-foreground" },
}

export function HeroDetailModal({ hero, isAdmin, onClose, onUpdateStatus, onDelete }: HeroDetailModalProps) {
  if (!hero) return null

  const roleConf = roleConfig[hero.gameRole]
  const statusConf = statusConfig[hero.status]
  const Icon = roleConf.icon

  return (
    <Dialog open={!!hero} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">{hero.name} 상세 정보</DialogTitle>
        </DialogHeader>

        {/* Hero Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-primary/50 shrink-0">
            <span className="text-4xl font-bold text-foreground">{hero.name.charAt(0)}</span>
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-foreground">{hero.name}</h2>
              <Badge className={cn(statusConf.color)}>{statusConf.label}</Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{hero.age}세</span>
              <span>·</span>
              <span>{hero.mbti}</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Icon className={cn("w-4 h-4", roleConf.color)} />
              <span className="text-sm text-foreground">{roleConf.label}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-primary font-semibold">{hero.tier}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">거주지</p>
              <p className="text-sm font-semibold text-foreground">{hero.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">직업</p>
              <p className="text-sm font-semibold text-foreground">{hero.job}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
            <Brain className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">MBTI</p>
              <p className="text-sm font-semibold text-foreground">{hero.mbti}</p>
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

        {/* Most Heroes */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">모스트 영웅</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hero.mostHeroes.map((h) => (
              <Badge key={h} variant="secondary" className="bg-accent/20 text-accent">
                {h}
              </Badge>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4 p-4 bg-muted/20 rounded border border-border/50">
          <p className="text-sm text-muted-foreground italic">&quot;{hero.bio}&quot;</p>
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
                  <SelectItem value="available">판매중</SelectItem>
                  <SelectItem value="talking">썸</SelectItem>
                  <SelectItem value="taken">품절</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("정말 삭제하시겠습니까?")) {
                  onDelete(hero.id)
                }
              }}
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
