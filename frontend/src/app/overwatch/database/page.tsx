'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/common/layouts/header'
import { Input } from '@/common/components/ui/input'
import { Button } from '@/common/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/components/ui/select'
import { Skeleton } from '@/common/components/ui/skeleton'
import { Search, Database, Users, MapIcon } from 'lucide-react'
import { useHeroes, useHeroDetail, useMaps, useGamemodes } from '@/modules/overwatch/hooks/use-game-data'
import { HeroCard } from '@/modules/overwatch/components/hero-card'
import { HeroDetailModal } from '@/modules/overwatch/components/hero-detail-modal'
import { MapCard } from '@/modules/overwatch/components/map-card'
import { cn } from '@/lib/utils'

type Tab = 'heroes' | 'maps'

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<Tab>('heroes')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [gamemodeFilter, setGamemodeFilter] = useState<string>('all')
  const [selectedHeroKey, setSelectedHeroKey] = useState<string | null>(null)

  const { heroes, isLoading: heroesLoading } = useHeroes()
  const { maps, isLoading: mapsLoading } = useMaps()
  const { gamemodes } = useGamemodes()
  const { hero: heroDetail, isLoading: heroDetailLoading } = useHeroDetail(selectedHeroKey)

  // Filter heroes
  const filteredHeroes = useMemo(() => {
    return heroes.filter((hero) => {
      const matchesSearch = hero.name.toLowerCase().includes(search.toLowerCase()) ||
        hero.key.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || hero.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [heroes, search, roleFilter])

  // Filter maps
  const filteredMaps = useMemo(() => {
    return maps.filter((map) => {
      const matchesSearch = map.name.toLowerCase().includes(search.toLowerCase()) ||
        map.location.toLowerCase().includes(search.toLowerCase())
      const matchesGamemode = gamemodeFilter === 'all' ||
        map.gamemodes.some((g) => g.toLowerCase().includes(gamemodeFilter.toLowerCase()))
      return matchesSearch && matchesGamemode
    })
  }, [maps, search, gamemodeFilter])

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              영웅 & 맵 <span className="text-primary">데이터베이스</span>
            </h1>
            <p className="text-muted-foreground">오버워치 영웅과 맵 정보를 확인하세요</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'heroes' ? 'default' : 'outline'}
              className={cn(
                'skew-x-[-8deg] font-bold uppercase tracking-wide',
                activeTab === 'heroes' && 'bg-primary text-primary-foreground'
              )}
              onClick={() => {
                setActiveTab('heroes')
                setSearch('')
              }}
            >
              <span className="skew-x-[8deg] flex items-center gap-2">
                <Users className="w-4 h-4" />
                영웅
              </span>
            </Button>
            <Button
              variant={activeTab === 'maps' ? 'default' : 'outline'}
              className={cn(
                'skew-x-[-8deg] font-bold uppercase tracking-wide',
                activeTab === 'maps' && 'bg-primary text-primary-foreground'
              )}
              onClick={() => {
                setActiveTab('maps')
                setSearch('')
              }}
            >
              <span className="skew-x-[8deg] flex items-center gap-2">
                <MapIcon className="w-4 h-4" />
                맵
              </span>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'heroes' ? '영웅 이름 검색...' : '맵 이름 검색...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/20 border-border/50"
              />
            </div>

            {activeTab === 'heroes' && (
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40 bg-muted/20 border-border/50">
                  <SelectValue placeholder="역할" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 역할</SelectItem>
                  <SelectItem value="tank">탱커</SelectItem>
                  <SelectItem value="damage">딜러</SelectItem>
                  <SelectItem value="support">힐러</SelectItem>
                </SelectContent>
              </Select>
            )}

            {activeTab === 'maps' && (
              <Select value={gamemodeFilter} onValueChange={setGamemodeFilter}>
                <SelectTrigger className="w-40 bg-muted/20 border-border/50">
                  <SelectValue placeholder="게임모드" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 모드</SelectItem>
                  {gamemodes.map((mode) => (
                    <SelectItem key={mode.key} value={mode.name}>
                      {mode.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Content */}
          {activeTab === 'heroes' && (
            <div>
              {heroesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredHeroes.map((hero) => (
                    <HeroCard
                      key={hero.key}
                      hero={hero}
                      onClick={() => setSelectedHeroKey(hero.key)}
                    />
                  ))}
                </div>
              )}

              {!heroesLoading && filteredHeroes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          )}

          {activeTab === 'maps' && (
            <div>
              {mapsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMaps.map((map) => (
                    <MapCard key={map.name} map={map} />
                  ))}
                </div>
              )}

              {!mapsLoading && filteredMaps.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Hero Detail Modal */}
      {selectedHeroKey && heroDetail && !heroDetailLoading && (
        <HeroDetailModal
          hero={heroDetail}
          onClose={() => setSelectedHeroKey(null)}
        />
      )}
    </div>
  )
}
