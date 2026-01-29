'use client'

import { MapPin } from 'lucide-react'
import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GameMap } from '../types'

interface MapCardProps {
  map: GameMap
}

export function MapCard({ map }: MapCardProps) {
  return (
    <Card
      className={cn(
        'group overflow-hidden border-border/50 bg-card',
        'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        'transition-all duration-200'
      )}
    >
      <CardContent className="p-0">
        {/* Map Screenshot */}
        <div className="relative aspect-video bg-muted/20 overflow-hidden">
          <img
            src={map.screenshot}
            alt={map.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        </div>

        {/* Map Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
            {map.name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{map.location}</span>
            {map.country_code && (
              <span className="uppercase">({map.country_code})</span>
            )}
          </div>

          {/* Gamemodes */}
          <div className="flex flex-wrap gap-1.5">
            {map.gamemodes.map((mode) => (
              <Badge
                key={mode}
                variant="outline"
                className="text-xs border-ow-blue/30 text-ow-blue"
              >
                {mode}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
