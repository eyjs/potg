"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { PenaltyTracker } from "@/modules/user/components/penalty-tracker"
import { AuctionBanner } from "@/modules/auction/components/auction-banner"
import { CreateVoteModal } from "@/modules/vote/components/create-vote-modal"
import { CreateScrimModal } from "@/modules/scrim/components/create-scrim-modal"
import { QuickActionGrid } from "@/components/dashboard/quick-action-grid"
import { VotePreview } from "@/components/dashboard/vote-preview"
import { PriorityAlerts } from "@/components/dashboard/priority-alerts"
import { MyStatsCard } from "@/components/dashboard/my-stats-card"
import { CountdownCard } from "@/components/dashboard/countdown-card"
import { ClanOverviewBanner } from "@/components/dashboard/clan-overview-banner"
import { ActivitySummary } from "@/components/dashboard/activity-summary"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import Link from "next/link"
import { Button } from "@/common/components/ui/button"
import { toast } from "sonner"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAdmin } = useAuth()
  const [votes, setVotes] = useState([])
  const [liveAuctions, setLiveAuctions] = useState([])
  const [bettingQuestions, setBettingQuestions] = useState([])
  const [myPoints, setMyPoints] = useState(0)
  const [clanDetails, setClanDetails] = useState<any>(null)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [pendingRequest, setPendingRequest] = useState<any>(null)

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
      const [votesRes, auctionsRes, bettingRes, walletRes, clanRes] = await Promise.all([
        api.get(`/votes?clanId=${user?.clanId}`),
        api.get(`/auctions?clanId=${user?.clanId}`),
        api.get('/betting/questions').catch(() => ({ data: [] })),
        api.get('/wallet/balance').catch(() => ({ data: { balance: 0 } })),
        api.get(`/clans/${user?.clanId}`).catch(() => ({ data: null }))
      ])

      setVotes(votesRes.data)
      setLiveAuctions(auctionsRes.data.filter((a: any) => a.status === 'ONGOING' || a.status === 'PENDING'))
      setBettingQuestions(bettingRes.data.filter((b: any) => b.status === 'OPEN'))
      setMyPoints(walletRes.data.balance || 0)
      setClanDetails(clanRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsDataLoading(false)
    }
  }

  const handleCreateVote = async (voteData: { title: string; deadline: string }) => {
    try {
      await api.post('/votes', {
        clanId: user?.clanId,
        title: voteData.title,
        deadline: new Date(voteData.deadline).toISOString(),
        scrimType: 'NORMAL',
        multipleChoice: false,
        anonymous: false,
        options: [
          { label: "참석" },
          { label: "불참" },
          { label: "지각" },
        ]
      })
      fetchDashboardData()
    } catch (error) {
      console.error("Failed to create vote:", error)
      alert("투표 생성 실패")
    }
  }

  const handleCreateScrim = async (scrimData: { title: string; scheduledDate: string }) => {
    try {
      await api.post('/votes', {
        clanId: user?.clanId,
        title: scrimData.title,
        deadline: new Date(scrimData.scheduledDate).toISOString(),
        scrimType: 'NORMAL',
        multipleChoice: false,
        anonymous: false,
        options: [
          { label: "참석" },
          { label: "불참" },
          { label: "지각" },
        ]
      })
      toast.success("내전 투표가 생성되었습니다.")
      fetchDashboardData()
    } catch (error: any) {
      console.error("Failed to create scrim:", error)
      toast.error(error.response?.data?.message || "내전 생성 실패")
    }
  }

  const handleCastVote = async (voteId: string, type: "attend" | "absent" | "late") => {
    const vote = votes.find((v: any) => v.id === voteId) as any
    if (!vote) return

    const labelMap = {
      attend: "참석",
      absent: "불참",
      late: "지각",
    }

    const option = vote.options?.find((opt: any) => opt.label === labelMap[type])
    if (!option) {
      alert("해당 투표 옵션을 찾을 수 없습니다.")
      return
    }

    try {
      await api.post(`/votes/${voteId}/cast`, { optionId: option.id })
      toast.success("투표가 완료되었습니다.")
      fetchDashboardData()
    } catch (error: any) {
      console.error("Failed to cast vote:", error)
      alert(error.response?.data?.message || "투표 실패")
    }
  }

  const handleDeleteVote = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.delete(`/votes/${id}`)
      toast.success("투표가 삭제되었습니다.")
      fetchDashboardData()
    } catch (error) {
      console.error(error)
      toast.error("삭제 실패")
    }
  }

  const handleCloseVote = async (id: string) => {
    if (!confirm("투표를 마감하시겠습니까?")) return
    try {
      const response = await api.patch(`/votes/${id}/close`)
      toast.success("투표가 마감되었습니다.")

      // If a scrim was generated, notify and redirect
      if (response.data.generatedScrimId) {
        if (confirm("10명 이상이 참석하여 내전이 생성되었습니다! 내전 관리 페이지로 이동하시겠습니까?")) {
          router.push(`/scrim/${response.data.generatedScrimId}`)
        }
      }

      fetchDashboardData()
    } catch (error) {
      console.error(error)
      toast.error("마감 실패")
    }
  }

  const handleEditVote = (id: string) => {
    router.push(`/vote/${id}`)
  }

  const getTier = (rating: number = 0) => {
    if (rating >= 4500) return "Champion"
    if (rating >= 4000) return "Grandmaster"
    if (rating >= 3500) return "Master"
    if (rating >= 3000) return "Diamond"
    if (rating >= 2500) return "Platinum"
    if (rating >= 2000) return "Gold"
    if (rating >= 1500) return "Silver"
    return "Bronze"
  }

  // Calculate priority alerts
  const priorityAlerts: Array<{
    type: "vote" | "auction" | "betting"
    title: string
    description: string
    href: string
    urgency: "high" | "medium" | "low"
  }> = []

  // Urgent votes (closing in 24 hours)
  const urgentVotes = votes.filter((v: any) => {
    if (v.status !== 'OPEN') return false
    const timeLeft = new Date(v.deadline).getTime() - new Date().getTime()
    return timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000
  })

  urgentVotes.forEach((vote: any) => {
    const hours = Math.floor((new Date(vote.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60))
    priorityAlerts.push({
      type: "vote" as const,
      title: vote.title,
      description: `${hours}시간 후 마감`,
      href: `/vote/${vote.id}`,
      urgency: hours < 6 ? "high" as const : "medium" as const
    })
  })

  // Live auctions
  if (liveAuctions.length > 0) {
    priorityAlerts.push({
      type: "auction" as const,
      title: "진행 중인 경매",
      description: `${liveAuctions.length}개의 경매가 진행중입니다`,
      href: "/auction",
      urgency: "medium" as const
    })
  }

  // Find next event for countdown
  const nextEvent: any = votes
    .filter((v: any) => v.status === 'OPEN' && new Date(v.deadline) > new Date())
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0]

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

      <main className="container px-4 py-6 space-y-6 md:space-y-8 flex-1">
        {/* Clan Overview Banner */}
        <ClanOverviewBanner
          clanName={clanDetails?.name || "클랜"}
          voteCount={votes.filter((v: any) => v.status === 'OPEN').length}
          auctionCount={liveAuctions.length}
          bettingCount={bettingQuestions.length}
        />

        {/* Auction Banner */}
        <section>
          <AuctionBanner
            hasLiveAuction={liveAuctions.length > 0}
            roomCount={liveAuctions.length}
          />
        </section>

        {/* Quick Action Grid */}
        <QuickActionGrid
          voteCount={votes.filter((v: any) => v.status === 'OPEN').length}
          auctionCount={liveAuctions.length}
          bettingCount={bettingQuestions.length}
          scrimCount={0}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Priority Alerts */}
            {priorityAlerts.length > 0 && (
              <PriorityAlerts alerts={priorityAlerts} />
            )}

            {/* Vote Preview */}
            <div className="flex items-center justify-between">
              {isAdmin && (
                <div className="flex gap-2 ml-auto">
                  <CreateScrimModal onCreateScrim={handleCreateScrim} />
                  <CreateVoteModal onCreateVote={handleCreateVote} />
                </div>
              )}
            </div>
            <VotePreview
              votes={votes}
              isAdmin={isAdmin}
              onVote={handleCastVote}
              onDelete={handleDeleteVote}
              onClose={handleCloseVote}
              onEdit={handleEditVote}
            />

            {/* Activity Summary - Only on larger screens */}
            <div className="hidden md:block">
              <ActivitySummary
                scrimCount={0}
                bettingCount={bettingQuestions.length}
                totalParticipants={0}
              />
            </div>
          </div>

          {/* Right Column: Sidebar Widgets */}
          <div className="space-y-6">
            {/* My Stats Card */}
            <MyStatsCard
              userRole={user.role}
              userTier={getTier(user.rating)}
              points={myPoints}
              isAdmin={isAdmin}
            />

            {/* Countdown Card */}
            {nextEvent && (
              <CountdownCard
                nextEventDate={nextEvent.deadline}
                nextEventTitle={nextEvent.title}
              />
            )}

            {/* Penalty Tracker */}
            <PenaltyTracker users={[]} />

            {/* Shop Promotion */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-4xl">🎁</span>
              </div>
              <h3 className="font-bold text-foreground mb-1 uppercase italic">포인트 상점</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                모은 포인트로 기프티콘이나<br />특별 아이템을 구매하세요!
              </p>
              <Link href="/shop" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 text-black font-bold uppercase italic text-sm h-10 rounded-md">
                  상점 바로가기 →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
