"use client"

import { MapPin, Briefcase } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Hero } from "@/app/gallery/page"

interface HeroCardProps {
  hero: Hero
  onClick: () => void
}

const statusConfig = {
  available: { label: "만남 가능", color: "bg-green-500 text-white" },
  talking: { label: "소개팅 중", color: "bg-yellow-500 text-black" },
  taken: { label: "매칭 완료", color: "bg-muted text-muted-foreground" },
}

export function HeroCard({ hero, onClick }: HeroCardProps) {
  const statusConf = statusConfig[hero.status]

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer group overflow-hidden rounded-lg border border-border/50",
        "bg-gradient-to-b from-card to-card/80",
        "hover:border-primary/70 hover:scale-105 transition-all duration-200",
        hero.status === "taken" && "opacity-60 grayscale-[30%]",
      )}
    >
      {/* Status Badge */}
      <Badge className={cn("absolute top-2 right-2 z-10 text-xs", statusConf.color)}>{statusConf.label}</Badge>

      {/* Avatar Area */}
      <div className="aspect-[3/4] flex items-center justify-center bg-gradient-to-b from-primary/10 to-transparent">
        <div className="w-20 h-20 rounded-full bg-muted/80 flex items-center justify-center border-2 border-border/50 group-hover:border-primary/50 transition-colors">
          <span className="text-3xl font-bold text-foreground">{hero.name.charAt(0)}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-card/90 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground truncate">{hero.name}</span>
          <span className="text-xs text-muted-foreground">{hero.age}세</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{hero.location}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Briefcase className="w-3 h-3" />
          <span className="truncate">{hero.job}</span>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}
