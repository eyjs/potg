'use client'

import { Trophy, Target, Clock, Star, Gamepad2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { cn } from '@/lib/utils'
import type { HeroStatsCategory } from '../types'

interface CareerStatsCardProps {
  statsSummary?: Record<string, unknown>
  endorsementLevel: number
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string | number
  highlight?: boolean
}

function StatItem({ icon, label, value, highlight = false }: StatItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2">
        <span className={cn('text-muted-foreground', highlight && 'text-primary')}>{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={cn('font-bold text-foreground', highlight && 'text-primary')}>
        {value}
      </span>
    </div>
  )
}

export function CareerStatsCard({ statsSummary, endorsementLevel }: CareerStatsCardProps) {
  const stats = parseCareerStats(statsSummary)

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-black italic uppercase tracking-tight">
          커리어 <span className="text-primary">통계</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <StatItem
          icon={<Gamepad2 className="w-4 h-4" />}
          label="총 경기 수"
          value={stats.totalGames?.toLocaleString() || '-'}
        />
        <StatItem
          icon={<Trophy className="w-4 h-4" />}
          label="승리"
          value={stats.wins?.toLocaleString() || '-'}
        />
        <StatItem
          icon={<Target className="w-4 h-4" />}
          label="승률"
          value={stats.winRate ? `${stats.winRate.toFixed(1)}%` : '-'}
          highlight={stats.winRate !== undefined && stats.winRate >= 50}
        />
        <StatItem
          icon={<Clock className="w-4 h-4" />}
          label="총 플레이 시간"
          value={stats.playTime || '-'}
        />
        <StatItem
          icon={<Star className="w-4 h-4" />}
          label="칭찬 레벨"
          value={`레벨 ${endorsementLevel}`}
          highlight
        />
      </CardContent>
    </Card>
  )
}

interface ParsedStats {
  totalGames?: number
  wins?: number
  losses?: number
  winRate?: number
  playTime?: string
  eliminations?: number
  deaths?: number
  damage?: number
  healing?: number
}

function parseCareerStats(summary?: Record<string, unknown>): ParsedStats {
  if (!summary) return {}

  const stats: ParsedStats = {}

  // Try to extract common stat keys
  const categories = Array.isArray(summary) ? summary : Object.values(summary)

  for (const category of categories) {
    if (!category || typeof category !== 'object') continue

    const cat = category as HeroStatsCategory
    if (!cat.stats) continue

    for (const stat of cat.stats) {
      const key = stat.key?.toLowerCase() || ''
      const label = stat.label?.toLowerCase() || ''
      const value = stat.value

      if (key.includes('games_played') || label.includes('games played')) {
        stats.totalGames = Number(value) || 0
      }
      if (key.includes('games_won') || label.includes('games won') || key === 'wins') {
        stats.wins = Number(value) || 0
      }
      if (key.includes('games_lost') || label.includes('games lost')) {
        stats.losses = Number(value) || 0
      }
      if (key.includes('win_percentage') || label.includes('win')) {
        stats.winRate = Number(value) || 0
      }
      if (key.includes('time_played') || label.includes('time played')) {
        stats.playTime = formatDuration(value)
      }
      if (key.includes('eliminations') && !key.includes('per')) {
        stats.eliminations = Number(value) || 0
      }
      if (key.includes('deaths') && !key.includes('per')) {
        stats.deaths = Number(value) || 0
      }
    }
  }

  // Calculate win rate if not provided
  if (stats.winRate === undefined && stats.wins !== undefined && stats.totalGames) {
    stats.winRate = (stats.wins / stats.totalGames) * 100
  }

  return stats
}

function formatDuration(value: unknown): string {
  if (typeof value === 'string') {
    // Already formatted like "42:30:00" or "42 hours"
    if (value.includes(':')) {
      const parts = value.split(':')
      const hours = parseInt(parts[0], 10)
      return `${hours}시간`
    }
    return value
  }

  if (typeof value === 'number') {
    const hours = Math.floor(value / 3600)
    if (hours >= 1) return `${hours}시간`
    const minutes = Math.floor(value / 60)
    return `${minutes}분`
  }

  return '-'
}
