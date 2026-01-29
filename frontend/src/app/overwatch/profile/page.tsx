'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Header } from '@/common/layouts/header'
import { useAuth } from '@/context/auth-context'
import { useOverwatchProfile, useClanLeaderboard } from '@/modules/overwatch/hooks/use-overwatch-profile'
import { ProfileHeader } from '@/modules/overwatch/components/profile-header'
import { RankCards } from '@/modules/overwatch/components/rank-card'
import { HeroStatsCard } from '@/modules/overwatch/components/hero-stats-card'
import { CareerStatsCard } from '@/modules/overwatch/components/career-stats-card'
import { ClanLeaderboard } from '@/modules/overwatch/components/clan-leaderboard'
import { Skeleton } from '@/common/components/ui/skeleton'
import { Card, CardContent } from '@/common/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function OverwatchProfilePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { profile, isLoading, isSyncing, syncProfile } = useOverwatchProfile('me')
  const { rankings, isLoading: rankingsLoading } = useClanLeaderboard(user?.clanId)

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

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Header */}
          {isLoading ? (
            <ProfileHeaderSkeleton />
          ) : profile ? (
            <ProfileHeader
              profile={profile}
              isMe
              isSyncing={isSyncing}
              onSync={syncProfile}
            />
          ) : (
            <NoBattleTagCard />
          )}

          {/* Main Content Grid */}
          {profile && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Ranks */}
              <div className="lg:col-span-2 space-y-6">
                {isLoading ? (
                  <RankCardsSkeleton />
                ) : (
                  <RankCards competitive={profile.competitiveRank} />
                )}

                {/* Hero Stats */}
                {isLoading ? (
                  <CardSkeleton />
                ) : (
                  <HeroStatsCard topHeroes={profile.topHeroes} />
                )}
              </div>

              {/* Right Column - Stats & Leaderboard */}
              <div className="space-y-6">
                {/* Career Stats */}
                {isLoading ? (
                  <CardSkeleton />
                ) : (
                  <CareerStatsCard
                    statsSummary={profile.statsSummary}
                    endorsementLevel={profile.endorsementLevel}
                  />
                )}

                {/* Clan Leaderboard */}
                {rankingsLoading ? (
                  <CardSkeleton />
                ) : (
                  <ClanLeaderboard rankings={rankings} limit={5} />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ProfileHeaderSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
      <Skeleton className="h-32 md:h-40" />
      <div className="relative px-4 pb-4 -mt-12 md:-mt-16">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}

function RankCardsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return <Skeleton className="h-64 rounded-xl" />
}

function NoBattleTagCard() {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex items-center gap-4 py-6">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <div>
          <p className="font-bold text-foreground">BattleTag가 설정되지 않았습니다</p>
          <p className="text-sm text-muted-foreground">
            내 정보 페이지에서 BattleTag를 설정해주세요
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
