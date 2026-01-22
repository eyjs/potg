"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { PenaltyTracker } from "@/modules/user/components/penalty-tracker"
import { TodayScrims } from "@/components/dashboard/today-scrims"
import { Announcements } from "@/components/dashboard/announcements"
import { HallOfFame } from "@/components/dashboard/hall-of-fame"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import Link from "next/link"
import { Button } from "@/common/components/ui/button"
import { toast } from "sonner"

interface Scrim {
  id: string
  title: string
  scheduledDate: string
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED"
  recruitmentType: "VOTE" | "AUCTION" | "MANUAL"
  teamAScore: number
  teamBScore: number
  participantsCount?: number
}

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
  isPinned?: boolean
  author?: { battleTag: string }
}

interface HallOfFameEntry {
  id: string
  type: "MVP" | "DONOR" | "WANTED"
  title: string
  description?: string
  amount: number
  imageUrl?: string
  user?: { id?: string; battleTag: string; avatarUrl?: string }
}

interface Membership {
  role: "MASTER" | "MANAGER" | "MEMBER"
  clanId: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAdmin } = useAuth()
  const [scrims, setScrims] = useState<Scrim[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [pendingRequest, setPendingRequest] = useState<{ clan?: { name: string } } | null>(null)

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login")
      } else if (!user.clanId) {
        // Check for pending request
        api.get('/clans/requests/me')
          .then(res => setPendingRequest(res.data))
          .catch(console.error)
          .finally(() => setIsDataLoading(false))
      } else {
        fetchDashboardData()
      }
    }
  }, [user, isLoading, router])

  const fetchDashboardData = async () => {
    try {
      const [scrimsRes, announcementsRes, hallOfFameRes, membershipRes] = await Promise.all([
        api.get(`/scrims?clanId=${user?.clanId}&today=true`).catch(() => ({ data: [] })),
        api.get(`/clans/${user?.clanId}/announcements`).catch(() => ({ data: [] })),
        api.get(`/clans/${user?.clanId}/hall-of-fame`).catch(() => ({ data: [] })),
        api.get('/clans/membership/me').catch(() => ({ data: null })),
      ])
      setScrims(scrimsRes.data)
      setAnnouncements(announcementsRes.data)
      setHallOfFame(hallOfFameRes.data)
      setMembership(membershipRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsDataLoading(false)
    }
  }

  // Check if user can manage (admin, master, or manager)
  const canManage = isAdmin || membership?.role === "MASTER" || membership?.role === "MANAGER"

  const handleCreateScrim = async (scrimData: { title: string; scheduledDate: string }) => {
    try {
      await api.post('/scrims', {
        clanId: user?.clanId,
        title: scrimData.title,
        scheduledDate: new Date(scrimData.scheduledDate).toISOString(),
        recruitmentType: 'MANUAL',
      })
      toast.success("내전이 생성되었습니다.")
      fetchDashboardData()
    } catch (error: unknown) {
      console.error("Failed to create scrim:", error)
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(errorMessage || "내전 생성 실패")
    }
  }

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold animate-pulse uppercase italic tracking-widest">접속 확인 중...</div>

  if (!user) return null // Will redirect

  if (!user.clanId) {
    if (pendingRequest) {
      return (
        <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
          <Header />
          <main className="container flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
            <div className="space-y-4">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground">
                가입 승인 <span className="text-primary">대기 중</span>
              </h1>
              <p className="text-muted-foreground text-lg uppercase tracking-widest">
                {pendingRequest.clan?.name} 클랜의 승인을 기다리고 있습니다.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                상태 확인 (새로고침)
              </Button>
            </div>
          </main>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
        <Header />
        <main className="container flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

          <div className="space-y-2 mb-8">
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-foreground">
              대기 <span className="text-primary">상태</span>
            </h1>
            <p className="text-muted-foreground text-lg uppercase tracking-widest">소속된 클랜이 없습니다</p>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <Link href="/clan/create" className="block">
              <Button size="lg" className="w-full h-16 text-xl font-black italic uppercase tracking-wide bg-primary text-primary-foreground skew-btn hover:bg-primary/90">
                클랜 생성 (Create Clan)
              </Button>
            </Link>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
            </div>
            <Link href="/clan/join" className="block">
              <Button size="lg" variant="outline" className="w-full h-16 text-xl font-black italic uppercase tracking-wide border-primary text-primary skew-btn hover:bg-primary/10">
                클랜 가입 (Join Clan)
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (isDataLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold animate-pulse uppercase italic tracking-widest">데이터 로딩 중...</div>

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Today's Scrims */}
            <TodayScrims scrims={scrims} canManage={canManage} onCreateScrim={handleCreateScrim} />

            {/* Announcements */}
            <Announcements
              announcements={announcements}
              clanId={user?.clanId}
              canManage={canManage}
              onRefresh={fetchDashboardData}
            />

          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Penalty Tracker */}
            <PenaltyTracker users={[]} />

            {/* Hall of Fame & Donors & Wanted */}
            <HallOfFame
              entries={hallOfFame}
              clanId={user?.clanId}
              canManage={canManage}
              onRefresh={fetchDashboardData}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
