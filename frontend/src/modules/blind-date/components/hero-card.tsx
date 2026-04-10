"use client"

import Link from "next/link"
import { MapPin, Briefcase, Ruler, Cigarette } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BlindDateProfile } from "@/modules/blind-date/types"
import { statusConfig } from "@/modules/blind-date/types"
import { getImageUrl } from "@/lib/upload"

interface HeroCardProps {
  hero: BlindDateProfile
}

export function HeroCard({ hero }: HeroCardProps) {
  const statusConf = statusConfig[hero.status] || statusConfig.OPEN
  const isClosed = hero.status === "CLOSED"
  const hasPhoto = hero.photos && hero.photos.length > 0

  return (
    <Link href={`/gallery/${hero.id}`}>
      <div
        className={cn(
          "relative cursor-pointer group overflow-hidden rounded-xl border border-border/40",
          "bg-card shadow-lg",
          "hover:border-primary/60 hover:shadow-primary/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
          isClosed && "opacity-50 grayscale-[40%]",
        )}
      >
        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between">
          <Badge className={cn(
            "text-xs font-bold shadow-md",
            hero.gender === "MALE" ? "bg-blue-500 text-white" : "bg-pink-500 text-white"
          )}>
            {hero.gender === "MALE" ? "남" : "여"}
          </Badge>
          <Badge className={cn("text-xs font-bold shadow-md", statusConf.color)}>
            {statusConf.label}
          </Badge>
        </div>

        {/* Photo / Avatar Area */}
        <div className="aspect-[3/4] relative overflow-hidden">
          {hasPhoto ? (
            <>
              <img
                src={getImageUrl(hero.photos![0])}
                alt={hero.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Bottom gradient overlay for text readability */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/15 via-card to-card/80 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center border-2 border-primary/30 group-hover:border-primary/60 transition-colors">
                <span className="text-3xl font-black text-foreground">{hero.name.charAt(0)}</span>
              </div>
            </div>
          )}

          {/* Info overlay on photo */}
          <div className={cn(
            "absolute bottom-0 inset-x-0 p-3 space-y-1.5",
            hasPhoto ? "text-white" : "relative text-foreground bg-card p-3",
          )}>
            {/* Name + Age */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold truncate">{hero.name}</span>
              <span className={cn("text-sm font-bold", hasPhoto ? "text-white/80" : "text-muted-foreground")}>
                {hero.age}세
              </span>
            </div>

            {/* Key Info Pills */}
            <div className="flex flex-wrap gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                hasPhoto ? "bg-white/15 text-white/90 backdrop-blur-sm" : "bg-muted/40 text-muted-foreground"
              )}>
                <MapPin className="w-3 h-3" />
                {hero.location || "-"}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                hasPhoto ? "bg-white/15 text-white/90 backdrop-blur-sm" : "bg-muted/40 text-muted-foreground"
              )}>
                <Briefcase className="w-3 h-3" />
                {hero.job || "-"}
              </span>
            </div>

            {/* Secondary Info */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {hero.height && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-medium",
                  hasPhoto ? "text-white/70" : "text-muted-foreground"
                )}>
                  <Ruler className="w-2.5 h-2.5" />
                  {hero.height}cm
                </span>
              )}
              {hero.mbti && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-bold",
                    hasPhoto ? "border-white/30 text-white/90" : "border-primary/40 text-primary"
                  )}
                >
                  {hero.mbti}
                </Badge>
              )}
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-medium",
                hasPhoto ? "text-white/70" : "text-muted-foreground"
              )}>
                <Cigarette className="w-2.5 h-2.5" />
                {hero.smoking ? "흡연" : "비흡연"}
              </span>
            </div>
          </div>
        </div>

        {/* Hover glow */}
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5 group-hover:ring-primary/20 transition-all pointer-events-none" />
      </div>
    </Link>
  )
}
