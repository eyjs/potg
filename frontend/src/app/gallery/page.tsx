"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { HeroCard } from "@/modules/blind-date/components/hero-card"
import { HeroDetailModal } from "@/modules/blind-date/components/hero-detail-modal"
import { CreateHeroModal } from "@/modules/blind-date/components/create-hero-modal"
import { Button } from "@/common/components/ui/button"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/common/components/auth-guard"

// ... Hero interface ...

export interface Hero {
  id: string
  registerId: string
  name: string
  age: number
  location: string
  job: string
  mbti: string
  status: "available" | "talking" | "taken"
  bio: string
  idealType?: string
  smoking: boolean
  education?: string
  height?: number
  avatar?: string
}

export default function GalleryPage() {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null)
  const [viewMode, setViewMode] = useState<"all" | "my">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "talking" | "taken">("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.clanId) {
      fetchHeroes()
    } else {
      setIsLoading(false)
    }
  }, [user?.clanId])

  const fetchHeroes = async () => {
    if (!user) return
    try {
      setIsLoading(true)
      const response = await api.get(`/blind-date/listings?clanId=${user.clanId}`)
      
      const mapped = response.data.map((h: any) => ({
        id: h.id,
        registerId: h.registerId,
        name: h.name,
        age: h.age,
        location: h.location,
        job: h.job,
        mbti: h.mbti || "Unknown",
        status: h.status === 'OPEN' ? 'available' : h.status === 'MATCHED' ? 'talking' : 'taken',
        bio: h.description,
        idealType: h.idealType,
        smoking: h.smoking || false,
        education: h.education,
        height: h.height,
        avatar: h.photos?.[0]
      }))
      setHeroes(mapped)
    } catch (error) {
      console.error("Failed to fetch heroes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredHeroes = heroes.filter((hero) => {
    // View mode filter (내 매물 / 전체 매물)
    if (viewMode === "my" && hero.registerId !== user?.id) return false
    // Status filter
    if (filterStatus !== "all" && hero.status !== filterStatus) return false
    return true
  })

  const myHeroesCount = heroes.filter(h => h.registerId === user?.id).length
  const allHeroesCount = heroes.length

  const handleCreateHero = async (newHero: Omit<Hero, "id" | "registerId">) => {
    if (!user) return
    try {
      await api.post('/blind-date/listings', {
        clanId: user.clanId,
        name: newHero.name,
        age: newHero.age,
        gender: 'FEMALE', // Default or add to modal
        location: newHero.location,
        job: newHero.job,
        description: newHero.bio,
        idealType: newHero.idealType,
        mbti: newHero.mbti,
        education: newHero.education,
        height: newHero.height,
        smoking: newHero.smoking
      })
      fetchHeroes()
    } catch (error) {
      console.error("Failed to create listing:", error)
    }
  }

  const handleUpdateStatus = async (heroId: string, status: Hero["status"]) => {
    try {
      const backendStatus = status === 'available' ? 'OPEN' : status === 'talking' ? 'MATCHED' : 'CLOSED'
      await api.put(`/blind-date/listings/${heroId}`, {
        status: backendStatus
      })
      fetchHeroes()
    } catch (error) {
      console.error("Failed to update status:", error)
      alert("상태 변경에 실패했습니다.")
    }
  }

  const handleDeleteHero = async (heroId: string) => {
    try {
      await api.delete(`/blind-date/listings/${heroId}`)
      fetchHeroes()
    } catch (error: any) {
      console.error("Failed to delete hero:", error)
      alert(error.response?.data?.message || "매물 삭제에 실패했습니다.")
    }
  }

  const statusCounts = {
    all: heroes.length,
    available: heroes.filter((h) => h.status === "available").length,
    talking: heroes.filter((h) => h.status === "talking").length,
    taken: heroes.filter((h) => h.status === "taken").length,
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
        영웅 갤러리 로딩 중...
      </div>
    </div>
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-6 space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold italic uppercase tracking-wider text-foreground">
                영웅 <span className="text-primary">갤러리</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">소개팅 매물 관리 - 마음에 드는 영웅을 찾아보세요</p>
            </div>
            {isAdmin && <CreateHeroModal onCreateHero={handleCreateHero} />}
          </div>

          {/* View Mode Tabs (내 매물 / 전체 매물) */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Button
              variant={viewMode === "all" ? "default" : "ghost"}
              onClick={() => setViewMode("all")}
              className={viewMode === "all" ? "bg-primary text-black font-bold" : ""}
            >
              전체 매물 ({allHeroesCount})
            </Button>
            <Button
              variant={viewMode === "my" ? "default" : "ghost"}
              onClick={() => setViewMode("my")}
              className={viewMode === "my" ? "bg-primary text-black font-bold" : ""}
            >
              내 매물 ({myHeroesCount})
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">상태:</span>
              <div className="flex gap-1">
                {(["all", "available", "talking", "taken"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={filterStatus === status ? "default" : "ghost"}
                    className={filterStatus === status ? "bg-primary text-primary-foreground" : ""}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === "all" && `전체 (${statusCounts.all})`}
                    {status === "available" && `만남 가능 (${statusCounts.available})`}
                    {status === "talking" && `소개팅 중 (${statusCounts.talking})`}
                    {status === "taken" && `매칭 완료 (${statusCounts.taken})`}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredHeroes.map((hero) => (
              <HeroCard key={hero.id} hero={hero} onClick={() => setSelectedHero(hero)} />
            ))}
          </div>

          {/* Empty State */}
          {filteredHeroes.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">조건에 맞는 영웅이 없습니다</p>
            </div>
          )}

          {/* Hero Detail Modal */}
          <HeroDetailModal
            hero={selectedHero}
            isAdmin={isAdmin}
            onClose={() => setSelectedHero(null)}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteHero}
          />
        </main>
      </div>
    </AuthGuard>
  )
}
