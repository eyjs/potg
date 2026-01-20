"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { VoteCard } from "@/modules/vote/components/vote-card"
import { CreateVoteModal } from "@/modules/vote/components/create-vote-modal"
import { CreateScrimModal } from "@/modules/scrim/components/create-scrim-modal"
import { PenaltyTracker } from "@/modules/user/components/penalty-tracker"
import { Announcements } from "@/components/dashboard/announcements"
import { HallOfFame } from "@/components/dashboard/hall-of-fame"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import Link from "next/link"
import { Button } from "@/common/components/ui/button"
import { toast } from "sonner"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAdmin } = useAuth()
  const [votes, setVotes] = useState([])
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
      const votesRes = await api.get(`/votes?clanId=${user?.clanId}`)
      setVotes(votesRes.data)
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
            {/* Announcements */}
            <Announcements />

            {/* Vote Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground">
                  진행 중인 <span className="text-primary">투표</span>
                </h2>
                {isAdmin && (
                  <div className="flex gap-2">
                    <CreateScrimModal onCreateScrim={handleCreateScrim} />
                    <CreateVoteModal onCreateVote={handleCreateVote} />
                  </div>
                )}
              </div>

              {votes.length === 0 ? (
                <div className="p-8 md:p-12 border-2 border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🗳️</span>
                  </div>
                  <div>
                    <p className="text-foreground font-bold uppercase italic">등록된 투표가 없습니다</p>
                    <p className="text-muted-foreground text-sm">새로운 투표를 생성하여 의견을 모아보세요.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {votes.map((vote: any) => {
                    const selectionMap: Record<string, "attend" | "absent" | "late"> = {
                      "참석": "attend",
                      "불참": "absent",
                      "지각": "late"
                    }

                    return (
                      <VoteCard
                        key={vote.id}
                        id={vote.id}
                        title={vote.title}
                        deadline={new Date(vote.deadline).toLocaleDateString()}
                        currentVotes={vote.options?.reduce((sum: number, opt: any) => sum + opt.count, 0) || 0}
                        maxVotes={vote.maxParticipants || 20}
                        status={vote.status === 'OPEN' ? 'open' : 'closed'}
                        isAdmin={isAdmin}
                        userVote={vote.userSelection ? selectionMap[vote.userSelection] : null}
                        onVote={(type) => handleCastVote(vote.id, type)}
                        onDelete={() => handleDeleteVote(vote.id)}
                        onClose={() => handleCloseVote(vote.id)}
                        onEdit={() => handleEditVote(vote.id)}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Penalty Tracker */}
            <PenaltyTracker users={[]} />

            {/* Hall of Fame & Donors */}
            <HallOfFame />
          </div>
        </div>
      </main>
    </div>
  )
}
