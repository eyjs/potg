'use client'

import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Hero } from '../types'

interface HeroCardProps {
  hero: Hero
  onClick?: () => void
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  damage: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const ROLE_LABELS: Record<string, string> = {
  tank: '탱커',
  damage: '딜러',
  support: '힐러',
}

export function HeroCard({ hero, onClick }: HeroCardProps) {
  const roleColor = ROLE_COLORS[hero.role] || 'bg-muted text-muted-foreground'
  const roleLabel = ROLE_LABELS[hero.role] || hero.role

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden border-border/50 bg-card',
        'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        'transition-all duration-200'
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Hero Portrait */}
        <div className="relative aspect-square bg-muted/20 overflow-hidden">
          <img
            src={hero.portrait}
            alt={hero.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Role Badge */}
          <Badge
            className={cn(
              'absolute top-2 right-2 text-xs font-bold uppercase',
              roleColor
            )}
          >
            {roleLabel}
          </Badge>
        </div>

        {/* Hero Info */}
        <div className="p-3 space-y-1">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
            {hero.name}
          </h3>
          <p className="text-xs text-muted-foreground">{hero.key}</p>
        </div>
      </CardContent>
    </Card>
  )
}
