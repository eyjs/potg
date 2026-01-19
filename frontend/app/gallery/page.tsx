"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { HeroCard } from "@/components/hero-card"
import { HeroDetailModal } from "@/components/hero-detail-modal"
import { CreateHeroModal } from "@/components/create-hero-modal"
import { Button } from "@/components/ui/button"

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

const initialHeroes: Hero[] = [
  {
    id: "1",
    name: "김태희",
    age: 27,
    location: "서울 강남",
    job: "디자이너",
    mbti: "ENFP",
    status: "available",
    gameRole: "support",
    tier: "다이아몬드",
    mostHeroes: ["아나", "키리코", "모이라"],
    bio: "게임도 잘하고 요리도 잘해요. 같이 내전하실 분!",
    smoking: false,
  },
  {
    id: "2",
    name: "이준혁",
    age: 29,
    location: "서울 마포",
    job: "개발자",
    mbti: "INTJ",
    status: "talking",
    gameRole: "dps",
    tier: "마스터",
    mostHeroes: ["겐지", "트레이서", "솜브라"],
    bio: "플랭커 장인입니다. 진지하게 만날 분 찾아요.",
    smoking: false,
  },
  {
    id: "3",
    name: "박민지",
    age: 25,
    location: "경기 성남",
    job: "간호사",
    mbti: "ISFJ",
    status: "available",
    gameRole: "support",
    tier: "플래티넘",
    mostHeroes: ["메르시", "루시우", "브리기테"],
    bio: "힐러 전문! 착하고 상냥한 사람 만나고 싶어요~",
    smoking: false,
  },
  {
    id: "4",
    name: "최동현",
    age: 31,
    location: "서울 송파",
    job: "공무원",
    mbti: "ESTJ",
    status: "taken",
    gameRole: "tank",
    tier: "그랜드마스터",
    mostHeroes: ["라인하르트", "시그마", "윈스턴"],
    bio: "탱커 장인입니다. 현재 연애 중!",
    smoking: true,
  },
  {
    id: "5",
    name: "정수아",
    age: 26,
    location: "인천 연수",
    job: "마케터",
    mbti: "ENTP",
    status: "available",
    gameRole: "dps",
    tier: "다이아몬드",
    mostHeroes: ["애쉬", "위도우메이커", "한조"],
    bio: "저격 장인! 유머 감각 있는 분 환영해요 ㅎㅎ",
    smoking: false,
  },
  {
    id: "6",
    name: "강민수",
    age: 28,
    location: "서울 강서",
    job: "영업사원",
    mbti: "ESFP",
    status: "talking",
    gameRole: "tank",
    tier: "플래티넘",
    mostHeroes: ["D.Va", "오리사", "정크퀸"],
    bio: "밝고 활발한 성격! 썸 진행 중입니다~",
    smoking: true,
  },
]

export default function GalleryPage() {
  const [heroes, setHeroes] = useState<Hero[]>(initialHeroes)
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "talking" | "taken">("all")
  const [filterRole, setFilterRole] = useState<"all" | "tank" | "dps" | "support">("all")
  const isAdmin = true // TODO: 실제 권한 체크

  const filteredHeroes = heroes.filter((hero) => {
    if (filterStatus !== "all" && hero.status !== filterStatus) return false
    if (filterRole !== "all" && hero.gameRole !== filterRole) return false
    return true
  })

  const handleCreateHero = (newHero: Omit<Hero, "id">) => {
    const hero: Hero = {
      ...newHero,
      id: String(Date.now()),
    }
    setHeroes((prev) => [hero, ...prev])
  }

  const handleUpdateStatus = (heroId: string, status: Hero["status"]) => {
    setHeroes((prev) => prev.map((h) => (h.id === heroId ? { ...h, status } : h)))
    if (selectedHero?.id === heroId) {
      setSelectedHero((prev) => (prev ? { ...prev, status } : null))
    }
  }

  const handleDeleteHero = (heroId: string) => {
    setHeroes((prev) => prev.filter((h) => h.id !== heroId))
    setSelectedHero(null)
  }

  const statusCounts = {
    all: heroes.length,
    available: heroes.filter((h) => h.status === "available").length,
    talking: heroes.filter((h) => h.status === "talking").length,
    taken: heroes.filter((h) => h.status === "taken").length,
  }

  return (
    <div className="min-h-screen bg-background">
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
                  {status === "available" && `판매중 (${statusCounts.available})`}
                  {status === "talking" && `썸 (${statusCounts.talking})`}
                  {status === "taken" && `품절 (${statusCounts.taken})`}
                </Button>
              ))}
            </div>
          </div>

          {/* Role Filter */}
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

        {/* Hero Grid - Overwatch Style */}
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
