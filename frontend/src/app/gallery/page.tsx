"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { HeroCard } from "@/modules/blind-date/components/hero-card"
import { HeroDetailModal } from "@/modules/blind-date/components/hero-detail-modal"
import { CreateHeroModal } from "@/modules/blind-date/components/create-hero-modal"
import { Button } from "@/common/components/ui/button"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"

export interface Hero {
  id: string
  name: string
  age: number
  location: string
  job: string
  mbti: string
  status: "available" | "talking" | "taken"
  gameRole: "tank" | "dps" | "support"
  tier: string
  mostHeroes: string[]
  bio: string
  smoking: boolean
  avatar?: string
}

export default function GalleryPage() {
  const { user, isAdmin } = useAuth()
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "talking" | "taken">("all")
  const [filterRole, setFilterRole] = useState<"all" | "tank" | "dps" | "support">("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.clanId) {
      fetchHeroes()
    }
  }, [user?.clanId])

  const fetchHeroes = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/blind-date/listings?clanId=${user.clanId}`)
      
      const mapped = response.data.map((h: any) => ({
        id: h.id,
        name: h.name,
        age: h.age,
        location: h.location,
        job: h.job,
        mbti: h.mbti || "Unknown",
        status: h.status === 'OPEN' ? 'available' : h.status === 'MATCHED' ? 'talking' : 'taken',
        gameRole: (h.gameRole?.toLowerCase() || "support") as any,
        tier: h.tier || "Gold",
        mostHeroes: h.mostHeroes || [],
        bio: h.description,
        smoking: h.smoking || false,
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
    if (filterStatus !== "all" && hero.status !== filterStatus) return false
    if (filterRole !== "all" && hero.gameRole !== filterRole) return false
    return true
  })

  const handleCreateHero = async (newHero: Omit<Hero, "id">) => {
    try {
      await api.post('/blind-date/listings', {
        clanId: user.clanId,
        name: newHero.name,
        age: newHero.age,
        gender: 'FEMALE', // Default or add to modal
        location: newHero.location,
        job: newHero.job,
        description: newHero.bio,
        mbti: newHero.mbti,
        gameRole: newHero.gameRole,
        tier: newHero.tier,
        mostHeroes: newHero.mostHeroes,
        smoking: newHero.smoking
      })
      fetchHeroes()
    } catch (error) {
      console.error("Failed to create listing:", error)
    }
  }

  const handleUpdateStatus = async (heroId: string, status: Hero["status"]) => {
    // Placeholder as backend status update endpoints are different
    alert("준비 중인 기능입니다.")
  }

  const handleDeleteHero = async (heroId: string) => {
    // Placeholder
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
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
                  {status === "available" && `판매중 (${statusCounts.available})`}
                  {status === "talking" && `썸 (${statusCounts.talking})`}
                  {status === "taken" && `품절 (${statusCounts.taken})`}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">포지션:</span>
            <div className="flex gap-1">
              {(["all", "tank", "dps", "support"] as const).map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant={filterRole === role ? "default" : "ghost"}
                  className={filterRole === role ? "bg-accent text-accent-foreground" : ""}
                  onClick={() => setFilterRole(role)}
                >
                  {role === "all" && "전체"}
                  {role === "tank" && "탱커"}
                  {role === "dps" && "딜러"}
                  {role === "support" && "힐러"}
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
  )
}
