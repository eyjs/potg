'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { cn } from '@/lib/utils'
import type { HeroStatsCategory } from '../types'

interface HeroStatsCardProps {
  topHeroes?: Record<string, HeroStatsCategory[]>
}

interface HeroEntry {
  name: string
  timePlayed: number
  winRate?: number
}

export function HeroStatsCard({ topHeroes }: HeroStatsCardProps) {
  // Parse hero stats from the complex structure
  const heroes = parseHeroStats(topHeroes)
  const maxTime = heroes.length > 0 ? Math.max(...heroes.map((h) => h.timePlayed)) : 1

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-black italic uppercase tracking-tight">
          주력 <span className="text-ow-blue">영웅</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {heroes.length > 0 ? (
          <div className="space-y-4">
            {heroes.slice(0, 5).map((hero, index) => (
              <HeroRow
                key={hero.name}
                hero={hero}
                rank={index + 1}
                maxTime={maxTime}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">영웅 통계가 없습니다</p>
            <p className="text-xs mt-1">프로필이 비공개이거나 데이터가 없습니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface HeroRowProps {
  hero: HeroEntry
  rank: number
  maxTime: number
}

function HeroRow({ hero, rank, maxTime }: HeroRowProps) {
  const progress = (hero.timePlayed / maxTime) * 100
  const winRateColor =
    hero.winRate && hero.winRate >= 50
      ? 'text-green-400'
      : 'text-red-400'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-5 text-muted-foreground font-mono">#{rank}</span>
          <span className="font-medium text-foreground capitalize">{hero.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{formatPlayTime(hero.timePlayed)}</span>
          {hero.winRate !== undefined && (
            <span className={cn('font-bold', winRateColor)}>
              {hero.winRate.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-ow-blue to-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function parseHeroStats(topHeroes?: Record<string, HeroStatsCategory[]>): HeroEntry[] {
  if (!topHeroes) return []

  const heroes: HeroEntry[] = []

  for (const [heroName, categories] of Object.entries(topHeroes)) {
    let timePlayed = 0
    let winRate: number | undefined

    for (const category of categories) {
      for (const stat of category.stats) {
        if (stat.key === 'time_played' || stat.label?.toLowerCase().includes('time')) {
          timePlayed = parseTime(stat.value)
        }
        if (stat.key === 'win_percentage' || stat.label?.toLowerCase().includes('win')) {
          winRate = typeof stat.value === 'number' ? stat.value : parseFloat(String(stat.value))
        }
      }
    }

    if (timePlayed > 0) {
      heroes.push({ name: heroName, timePlayed, winRate })
    }
  }

  return heroes.sort((a, b) => b.timePlayed - a.timePlayed)
}

function parseTime(value: number | string): number {
  if (typeof value === 'number') return value
  const str = String(value).toLowerCase()
  // Parse formats like "42:30:00" or "42 hours"
  if (str.includes(':')) {
    const parts = str.split(':').map(Number)
    return parts[0] * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  }
  return parseFloat(str) || 0
}

function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}시간`
  return `${minutes}분`
}
