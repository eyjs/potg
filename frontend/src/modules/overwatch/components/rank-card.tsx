'use client'

import { Shield, Sword, Heart, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { cn } from '@/lib/utils'
import type { RankInfo, RoleType, CompetitiveRank } from '../types'
import { ROLE_LABELS, ROLE_COLORS, ROLE_BG_COLORS, getDivisionColor, formatRank } from '../types'

interface RankCardProps {
  role: RoleType
  rankInfo?: RankInfo
}

function getRoleIcon(role: RoleType) {
  const className = cn('w-6 h-6', ROLE_COLORS[role])
  switch (role) {
    case 'tank':
      return <Shield className={className} />
    case 'damage':
      return <Sword className={className} />
    case 'support':
      return <Heart className={className} />
    default:
      return <HelpCircle className={className} />
  }
}

export function RankCard({ role, rankInfo }: RankCardProps) {
  const divisionColor = getDivisionColor(rankInfo?.division)

  return (
    <Card className={cn('border', ROLE_BG_COLORS[role], 'transition-all hover:scale-[1.02]')}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {getRoleIcon(role)}
          <CardTitle className={cn('text-sm font-bold uppercase tracking-wide', ROLE_COLORS[role])}>
            {ROLE_LABELS[role]}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {rankInfo ? (
          <div className="space-y-1">
            {/* Rank Icon */}
            {rankInfo.rank_icon && (
              <div className="flex justify-center mb-2">
                <img
                  src={rankInfo.rank_icon}
                  alt={rankInfo.division}
                  className="w-16 h-16 object-contain drop-shadow-lg"
                />
              </div>
            )}

            {/* Division & Tier */}
            <p className={cn('text-xl font-black italic text-center', divisionColor)}>
              {formatRank(rankInfo)}
            </p>

            {/* Skill Tier */}
            {rankInfo.skill_tier && (
              <p className="text-xs text-center text-muted-foreground">
                스킬 티어: {rankInfo.skill_tier}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">배치 필요</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface RankCardsProps {
  competitive?: CompetitiveRank
}

export function RankCards({ competitive }: RankCardsProps) {
  const pcRanks = competitive?.pc

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black italic uppercase tracking-tight text-foreground">
        경쟁전 <span className="text-primary">랭크</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RankCard role="tank" rankInfo={pcRanks?.tank} />
        <RankCard role="damage" rankInfo={pcRanks?.damage} />
        <RankCard role="support" rankInfo={pcRanks?.support} />
      </div>
    </div>
  )
}
