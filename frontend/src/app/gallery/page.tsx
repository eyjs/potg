"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/common/layouts/header"
import { HeroCard } from "@/modules/blind-date/components/hero-card"
import { HeroDetailModal } from "@/modules/blind-date/components/hero-detail-modal"
import { CreateHeroModal } from "@/modules/blind-date/components/create-hero-modal"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { ChevronDown, ChevronUp, Filter } from "lucide-react"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/common/components/auth-guard"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface Hero {
  id: string
  registerId: string
  registerNickname?: string
  name: string
  age: number
  gender: 'MALE' | 'FEMALE'
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
  const [isLoading, setIsLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterGender, setFilterGender] = useState<"all" | "MALE" | "FEMALE">("all")
  const [filterAgeMin, setFilterAgeMin] = useState("")
  const [filterAgeMax, setFilterAgeMax] = useState("")
  const [filterMbti, setFilterMbti] = useState("all")
  const [filterLocation, setFilterLocation] = useState("")
  const [filterSmoking, setFilterSmoking] = useState<"all" | "true" | "false">("all")

  useEffect(() => {
    if (!user) return
    if (user.clanId) {
      fetchHeroes()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const fetchHeroes = async () => {
    if (!user?.clanId) return
    try {
      setIsLoading(true)
      const response = await api.get(`/blind-date/listings?clanId=${user.clanId}`)

      const data = Array.isArray(response.data) ? response.data : []
      const mapped: Hero[] = data.map((h: any) => ({
        id: h.id,
        registerId: h.registerId,
        registerNickname: h.register?.nickname || h.register?.username || "Unknown",
        name: h.name || "",
        age: h.age || 0,
        gender: h.gender || "MALE",
        location: h.location || "",
        job: h.job || "",
        mbti: h.mbti || "",
        status: (h.status === 'OPEN' ? 'available' : h.status === 'MATCHED' ? 'talking' : 'taken') as Hero["status"],
        bio: h.description || "",
        idealType: h.idealType || "",
        smoking: h.smoking || false,
        education: h.education || "",
        height: h.height,
        avatar: h.photos?.[0]
      }))
      setHeroes(mapped)
    } catch (error) {
      console.error("Failed to fetch heroes:", error)
      toast.error("소개팅 목록을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredHeroes = useMemo(() => heroes.filter((hero) => {
    if (viewMode === "my" && hero.registerId !== user?.id) return false
    if (filterGender !== "all" && hero.gender !== filterGender) return false
    if (filterAgeMin && hero.age < Number(filterAgeMin)) return false
    if (filterAgeMax && hero.age > Number(filterAgeMax)) return false
    if (filterMbti !== "all" && hero.mbti.toUpperCase() !== filterMbti) return false
    if (filterLocation && !hero.location.includes(filterLocation)) return false
    if (filterSmoking !== "all" && String(hero.smoking) !== filterSmoking) return false
    return true
  }), [heroes, viewMode, user?.id, filterGender, filterAgeMin, filterAgeMax, filterMbti, filterLocation, filterSmoking])

  const myHeroesCount = heroes.filter(h => h.registerId === user?.id).length
  const allHeroesCount = heroes.length

  const handleCreateHero = async (newHero: Omit<Hero, "id" | "registerId">) => {
    if (!user?.clanId) return
    try {
      await api.post('/blind-date/listings', {
        clanId: user.clanId,
        name: newHero.name,
        age: newHero.age,
        gender: newHero.gender,
        location: newHero.location,
        job: newHero.job,
        description: newHero.bio,
        idealType: newHero.idealType,
        mbti: newHero.mbti,
        education: newHero.education,
        height: newHero.height,
        smoking: newHero.smoking
      })
      toast.success("소개팅 매물이 등록되었습니다.")
      fetchHeroes()
    } catch (error: any) {
      console.error("Failed to create listing:", error)
      toast.error(error.response?.data?.message || "매물 등록에 실패했습니다.")
    }
  }

  const handleUpdateStatus = async (heroId: string, status: Hero["status"]) => {
    try {
      const backendStatus = status === 'available' ? 'OPEN' : status === 'talking' ? 'MATCHED' : 'CLOSED'
      await api.patch(`/blind-date/listings/${heroId}`, {
        status: backendStatus
      })
      toast.success("상태가 업데이트되었습니다.")
      fetchHeroes()
    } catch (error) {
      console.error("Failed to update status:", error)
      toast.error("상태 변경에 실패했습니다.")
    }
  }

  const handleDeleteHero = async (heroId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.delete(`/blind-date/listings/${heroId}`)
      toast.success("삭제되었습니다.")
      setSelectedHero(null) // Close the modal
      fetchHeroes()
    } catch (error: any) {
      console.error("Failed to delete hero:", error)
      toast.error(error.response?.data?.message || "매물 삭제에 실패했습니다.")
    }
  }

  const mbtiTypes = [
    "ISTJ", "ISFJ", "INFJ", "INTJ",
    "ISTP", "ISFP", "INFP", "INTP",
    "ESTP", "ESFP", "ENFP", "ENTP",
    "ESTJ", "ESFJ", "ENFJ", "ENTJ"
  ]

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
        소개팅 데이터 로딩 중...
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
                소개팅 <span className="text-primary">GALLERY</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">소개팅 매물 관리 - 마음에 드는 상대방을 찾아보세요</p>
            </div>
            <CreateHeroModal onCreateHero={handleCreateHero} />
          </div>

          {/* View Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 border-b border-border pb-4">
            <Button
              variant={viewMode === "all" ? "default" : "ghost"}
              onClick={() => setViewMode("all")}
              className={cn("w-full", viewMode === "all" ? "bg-primary text-black font-bold" : "")}
            >
              전체 매물 ({allHeroesCount})
            </Button>
            <Button
              variant={viewMode === "my" ? "default" : "ghost"}
              onClick={() => setViewMode("my")}
              className={cn("w-full", viewMode === "my" ? "bg-primary text-black font-bold" : "")}
            >
              내 등록 매물 ({myHeroesCount})
            </Button>
          </div>

          {/* Filters */}
          <div className="border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                필터 ({filteredHeroes.length}명)
              </span>
              {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {filtersOpen && (
              <div className="p-4 border-t border-border space-y-4 bg-muted/20">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* 성별 */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-bold">성별</span>
                    <Select value={filterGender} onValueChange={(v) => setFilterGender(v as "all" | "MALE" | "FEMALE")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="MALE">남성</SelectItem>
                        <SelectItem value="FEMALE">여성</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* MBTI */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-bold">MBTI</span>
                    <Select value={filterMbti} onValueChange={setFilterMbti}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        {mbtiTypes.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 흡연여부 */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-bold">흡연여부</span>
                    <Select value={filterSmoking} onValueChange={(v) => setFilterSmoking(v as "all" | "true" | "false")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="false">비흡연</SelectItem>
                        <SelectItem value="true">흡연</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* 나이 범위 */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-bold">최소 나이</span>
                    <Input
                      type="number"
                      placeholder="예: 20"
                      value={filterAgeMin}
                      onChange={(e) => setFilterAgeMin(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-bold">최대 나이</span>
                    <Input
                      type="number"
                      placeholder="예: 35"
                      value={filterAgeMax}
                      onChange={(e) => setFilterAgeMax(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* 지역 */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-bold">지역</span>
                    <Input
                      placeholder="예: 서울"
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    setFilterGender("all")
                    setFilterAgeMin("")
                    setFilterAgeMax("")
                    setFilterMbti("all")
                    setFilterLocation("")
                    setFilterSmoking("all")
                  }}
                >
                  필터 초기화
                </Button>
              </div>
            )}
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
