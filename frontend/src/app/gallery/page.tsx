"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { HeroCard } from "@/modules/blind-date/components/hero-card"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { ChevronDown, ChevronUp, Filter, Plus } from "lucide-react"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { AuthGuard } from "@/common/components/auth-guard"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Hero } from "@/modules/blind-date/types"

export default function GalleryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [heroes, setHeroes] = useState<Hero[]>([])
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
      const mapped: Hero[] = data.map((h: Record<string, unknown>) => ({
        id: h.id as string,
        registerId: h.registerId as string,
        registerNickname: ((h.register as Record<string, unknown>)?.nickname || (h.register as Record<string, unknown>)?.username || "Unknown") as string,
        name: (h.name as string) || "",
        age: (h.age as number) || 0,
        gender: ((h.gender as string) || "MALE") as Hero["gender"],
        location: (h.location as string) || "",
        job: (h.job as string) || "",
        mbti: (h.mbti as string) || "",
        status: (h.status === "OPEN" ? "available" : h.status === "MATCHED" ? "talking" : "taken") as Hero["status"],
        bio: (h.description as string) || "",
        idealType: (h.idealType as string) || "",
        smoking: (h.smoking as boolean) || false,
        education: (h.education as string) || "",
        height: h.height as number | undefined,
        avatar: (h.photos as string[] | undefined)?.[0],
      }))
      setHeroes(mapped)
    } catch {
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
            <Button
              onClick={() => router.push("/gallery/register")}
              className="bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wide rounded-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>소개팅 등록</span>
            </Button>
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

          {/* Gender Quick Filter */}
          <div className="flex items-center gap-2">
            {(["all", "MALE", "FEMALE"] as const).map((g) => (
              <Button
                key={g}
                variant={filterGender === g ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterGender(g)}
                className={cn(
                  "text-xs font-bold",
                  filterGender === g && g === "MALE" && "bg-blue-500 hover:bg-blue-600 text-white",
                  filterGender === g && g === "FEMALE" && "bg-pink-500 hover:bg-pink-600 text-white",
                  filterGender === g && g === "all" && "bg-primary text-black",
                )}
              >
                {g === "all" ? "전체" : g === "MALE" ? "남성" : "여성"}
              </Button>
            ))}
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
              <HeroCard key={hero.id} hero={hero} />
            ))}
          </div>

          {/* Empty State */}
          {filteredHeroes.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">조건에 맞는 영웅이 없습니다</p>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
