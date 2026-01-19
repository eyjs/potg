"use client"

import { Shield, Crosshair, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Hero } from "@/app/gallery/page"

interface HeroCardProps {
  hero: Hero
  onClick: () => void
}

const roleConfig = {
  tank: { icon: Shield, color: "text-yellow-500", bg: "from-yellow-500/20" },
  dps: { icon: Crosshair, color: "text-red-500", bg: "from-red-500/20" },
  support: { icon: Heart, color: "text-green-500", bg: "from-green-500/20" },
}

const statusConfig = {
  available: { label: "판매중", color: "bg-green-500 text-white" },
  talking: { label: "썸", color: "bg-yellow-500 text-black" },
  taken: { label: "품절", color: "bg-muted text-muted-foreground" },
}

export function HeroCard({ hero, onClick }: HeroCardProps) {
  const roleConf = roleConfig[hero.gameRole]
  const statusConf = statusConfig[hero.status]
  const Icon = roleConf.icon

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
      <div className={cn("aspect-[3/4] flex items-center justify-center bg-gradient-to-b to-transparent", roleConf.bg)}>
        <div className="w-20 h-20 rounded-full bg-muted/80 flex items-center justify-center border-2 border-border/50 group-hover:border-primary/50 transition-colors">
          <span className="text-3xl font-bold text-foreground">{hero.name.charAt(0)}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-card/90">
        <div className="flex items-center gap-1 mb-1">
          <Icon className={cn("w-4 h-4", roleConf.color)} />
          <span className="font-bold text-foreground truncate">{hero.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{hero.age}세</span>
          <span>{hero.tier}</span>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}
