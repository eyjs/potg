'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/common/layouts/header'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Card, CardContent } from '@/common/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/components/ui/select'
import { Skeleton } from '@/common/components/ui/skeleton'
import { Plus, Search, Film, Trophy, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useReplays, useReplayStats, useReplayMutations } from '@/modules/overwatch/hooks/use-replays'
import { useMaps } from '@/modules/overwatch/hooks/use-game-data'
import { ReplayCard } from '@/modules/overwatch/components/replay-card'
import { CreateReplayModal } from '@/modules/overwatch/components/create-replay-modal'
import type { ReplayResult } from '@/modules/overwatch/types'

export default function ReplaysPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { maps } = useMaps()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState('')
  const [mapFilter, setMapFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<string>('all')

  const { replays, total, isLoading, refetch } = useReplays(user?.clanId, {
    search: search || undefined,
    mapName: mapFilter !== 'all' ? mapFilter : undefined,
    result: resultFilter !== 'all' ? (resultFilter as ReplayResult) : undefined,
    limit: 20,
  })

  const { stats, isLoading: statsLoading } = useReplayStats(user?.clanId)
  const { createReplay, deleteReplay, likeReplay, isSubmitting } = useReplayMutations(() => {
    setShowCreateModal(false)
    refetch()
  })

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

  if (!user.clanId) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
        <Header />
        <main className="container flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">클랜에 가입해야 리플레이를 이용할 수 있습니다.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-3">
                <Film className="w-8 h-8 text-primary" />
                리플레이 <span className="text-primary">코드</span>
              </h1>
              <p className="text-muted-foreground">클랜원들의 리플레이 코드를 공유하세요</p>
            </div>

            <Button
              className="skew-x-[-8deg] bg-primary hover:bg-primary/90 font-bold uppercase tracking-wide"
              onClick={() => setShowCreateModal(true)}
            >
              <span className="skew-x-[8deg] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                리플레이 등록
              </span>
            </Button>
          </div>

          {/* Stats */}
          {!statsLoading && stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<Film className="w-5 h-5" />}
                label="총 리플레이"
                value={stats.total}
              />
              <StatCard
                icon={<Trophy className="w-5 h-5 text-green-400" />}
                label="승리"
                value={stats.wins}
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-primary" />}
                label="승률"
                value={`${stats.winRate.toFixed(1)}%`}
              />
              <StatCard
                icon={<Trophy className="w-5 h-5 text-red-400" />}
                label="패배"
                value={stats.losses}
              />
            </div>
          )}

          {/* Filters */}
          <Card className="border-border/50 bg-card">
            <CardContent className="py-4">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="코드 또는 제목 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-muted/20 border-border/50"
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={mapFilter} onValueChange={setMapFilter}>
                    <SelectTrigger className="flex-1 sm:w-40 sm:flex-none bg-muted/20 border-border/50">
                      <SelectValue placeholder="맵 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 맵</SelectItem>
                      {maps.map((map) => (
                        <SelectItem key={map.name} value={map.name}>
                          {map.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={resultFilter} onValueChange={setResultFilter}>
                    <SelectTrigger className="flex-1 sm:w-32 sm:flex-none bg-muted/20 border-border/50">
                      <SelectValue placeholder="결과" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="WIN">승리</SelectItem>
                      <SelectItem value="LOSS">패배</SelectItem>
                      <SelectItem value="DRAW">무승부</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Replay List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : replays.length > 0 ? (
            <div className="space-y-3">
              {replays.map((replay) => (
                <ReplayCard
                  key={replay.id}
                  replay={replay}
                  isOwner={replay.userId === user.id}
                  onDelete={() => deleteReplay(replay.id)}
                  onLike={() => likeReplay(replay.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>등록된 리플레이가 없습니다</p>
              <p className="text-sm mt-1">첫 리플레이를 등록해보세요!</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateReplayModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createReplay}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
