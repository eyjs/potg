'use client'

import { X, Shield, Heart, Sparkles } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HeroDetail } from '../types'

interface HeroDetailModalProps {
  hero: HeroDetail
  onClose: () => void
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'text-blue-400',
  damage: 'text-red-400',
  support: 'text-green-400',
}

export function HeroDetailModal({ hero, onClose }: HeroDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-border/50 rounded-xl shadow-2xl">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 p-6 border-b border-border/50">
          {/* Portrait */}
          <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-lg overflow-hidden bg-muted/20">
            <img
              src={hero.portrait}
              alt={hero.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Basic Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-foreground">
                {hero.name}
              </h2>
              <p className={cn('text-sm font-bold uppercase', ROLE_COLORS[hero.role])}>
                {hero.role}
              </p>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3">
              {hero.description}
            </p>

            {/* Hitpoints */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-sm">
                  <span className="text-muted-foreground">체력:</span>{' '}
                  <span className="font-bold text-foreground">{hero.hitpoints.health}</span>
                </span>
              </div>
              {hero.hitpoints.armor > 0 && (
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">방어력:</span>{' '}
                    <span className="font-bold text-foreground">{hero.hitpoints.armor}</span>
                  </span>
                </div>
              )}
              {hero.hitpoints.shields > 0 && (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">보호막:</span>{' '}
                    <span className="font-bold text-foreground">{hero.hitpoints.shields}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Abilities */}
        <div className="p-6 border-b border-border/50">
          <h3 className="text-lg font-black italic uppercase tracking-tight mb-4">
            스킬 <span className="text-ow-blue">목록</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hero.abilities.map((ability) => (
              <div
                key={ability.name}
                className="group p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-ow-blue/50 transition-colors"
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={ability.icon}
                    alt={ability.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs font-bold text-center text-foreground group-hover:text-ow-blue transition-colors">
                  {ability.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Story */}
        {hero.story?.summary && (
          <div className="p-6">
            <h3 className="text-lg font-black italic uppercase tracking-tight mb-3">
              스토리
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {hero.story.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
