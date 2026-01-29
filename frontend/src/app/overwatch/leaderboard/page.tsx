'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/common/layouts/header'
import { useAuth } from '@/context/auth-context'
import { useClanLeaderboard } from '@/modules/overwatch/hooks/use-overwatch-profile'
import { ClanLeaderboard } from '@/modules/overwatch/components/clan-leaderboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Input } from '@/common/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/components/ui/select'
import { Skeleton } from '@/common/components/ui/skeleton'
import { Trophy, Search, Filter } from 'lucide-react'
import type { ClanRanking, RoleType } from '@/modules/overwatch/types'
import { ROLE_LABELS } from '@/modules/overwatch/types'

type SortOption = 'endorsement' | 'tank' | 'damage' | 'support'

export default function LeaderboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { rankings, isLoading } = useClanLeaderboard(user?.clanId)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('endorsement')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold animate-pulse uppercase italic tracking-widest">
        접속 확인 중...
      </div>
    )
  }

  if (!user) return null

  // Filter and sort rankings
  const filteredRankings = rankings
    .filter((r) => r.battleTag.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'endorsement') {
        return b.endorsementLevel - a.endorsementLevel
      }
      const roleA = getRoleSkillTier(a, sortBy)
      const roleB = getRoleSkillTier(b, sortBy)
      return roleB - roleA
    })

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              클랜 <span className="text-primary">리더보드</span>
            </h1>
            <p className="text-muted-foreground">클랜원들의 오버워치 랭킹을 확인하세요</p>
          </div>

          {/* Filters */}
          <Card className="border-border/50 bg-card">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="BattleTag 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-muted/20 border-border/50"
                  />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-40 bg-muted/20 border-border/50">
                      <SelectValue placeholder="정렬 기준" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="endorsement">칭찬 레벨</SelectItem>
                      <SelectItem value="tank">{ROLE_LABELS.tank} 랭크</SelectItem>
                      <SelectItem value="damage">{ROLE_LABELS.damage} 랭크</SelectItem>
                      <SelectItem value="support">{ROLE_LABELS.support} 랭크</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          {!isLoading && rankings.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="총 클랜원"
                value={rankings.length}
                icon="👥"
              />
              <StatCard
                label="평균 칭찬 레벨"
                value={calculateAverageEndorsement(rankings).toFixed(1)}
                icon="⭐"
              />
              <StatCard
                label="마스터+"
                value={countMastersPlus(rankings)}
                icon="💎"
              />
              <StatCard
                label="다이아+"
                value={countDiamondsPlus(rankings)}
                icon="💠"
              />
            </div>
          )}

          {/* Leaderboard */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <ClanLeaderboard rankings={filteredRankings} showViewAll={false} />
          )}
        </div>
      </main>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: string
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="py-3 px-4 text-center">
        <div className="text-2xl mb-1">{icon}</div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function getRoleSkillTier(ranking: ClanRanking, role: RoleType): number {
  const pcRank = ranking.competitive?.pc
  if (!pcRank) return 0

  const roleRank = pcRank[role as 'tank' | 'damage' | 'support']
  if (!roleRank || typeof roleRank === 'number') return 0

  // Convert division + tier to numeric value for sorting
  const divisionOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion']
  const divisionIndex = divisionOrder.findIndex((d) => roleRank.division?.includes(d))

  // Higher division = higher score, lower tier = higher score (tier 1 > tier 5)
  return divisionIndex * 10 + (6 - (roleRank.tier || 5))
}

function calculateAverageEndorsement(rankings: ClanRanking[]): number {
  if (rankings.length === 0) return 0
  const total = rankings.reduce((sum, r) => sum + r.endorsementLevel, 0)
  return total / rankings.length
}

function countMastersPlus(rankings: ClanRanking[]): number {
  return rankings.filter((r) => {
    const pc = r.competitive?.pc
    if (!pc) return false
    return ['Master', 'Grandmaster', 'Champion'].some((d) =>
      [pc.tank?.division, pc.damage?.division, pc.support?.division].some((div) => div?.includes(d))
    )
  }).length
}

function countDiamondsPlus(rankings: ClanRanking[]): number {
  return rankings.filter((r) => {
    const pc = r.competitive?.pc
    if (!pc) return false
    return ['Diamond', 'Master', 'Grandmaster', 'Champion'].some((d) =>
      [pc.tank?.division, pc.damage?.division, pc.support?.division].some((div) => div?.includes(d))
    )
  }).length
}
