"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { VoteCard } from "@/modules/vote/components/vote-card"
import { PenaltyTracker } from "@/modules/user/components/penalty-tracker"
import { AuctionBanner } from "@/modules/auction/components/auction-banner"
import { CreateVoteModal } from "@/modules/vote/components/create-vote-modal"
import { CreateScrimModal } from "@/modules/scrim/components/create-scrim-modal"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import Link from "next/link"
import { Button } from "@/common/components/ui/button"
import { toast } from "sonner"

export default function LobbyPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [votes, setVotes] = useState([])
  const [liveAuctions, setLiveAuctions] = useState([])
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
      const [votesRes, auctionsRes] = await Promise.all([
        api.get(`/votes?clanId=${user?.clanId}`),
        api.get(`/auctions?clanId=${user?.clanId}`)
      ])
      setVotes(votesRes.data)
      setLiveAuctions(auctionsRes.data.filter((a: any) => a.status === 'ONGOING' || a.status === 'PENDING'))
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
    // ...
  }

  const handleCastVote = async (voteId: string, type: "attend" | "absent" | "late") => {
    // ... same as before
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
      await api.patch(`/votes/${id}/close`)
      toast.success("투표가 마감되었습니다.")
      fetchDashboardData()
    } catch (error) {
      console.error(error)
      toast.error("마감 실패")
    }
  }

  const handleEditVote = (id: string) => {
    // Redirect to a dedicated edit page or open a modal
    // For now, redirect to detail page where edit can be implemented or just show a message
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
          {/* Background decoration */}
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
      
      <main className="container px-4 py-6 space-y-8 flex-1">
        {/* Top Section: Auction Banner */}
        <section>
          <AuctionBanner 
            hasLiveAuction={liveAuctions.length > 0} 
            roomCount={liveAuctions.length} 
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Votes (Main Content) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
                진행 중인 <span className="text-primary">투표</span>
              </h2>
              {user.role === 'ADMIN' && (
                <div className="flex gap-2">
                  <CreateScrimModal onCreateScrim={handleCreateScrim} />
                  <CreateVoteModal onCreateVote={handleCreateVote} />
                </div>
              )}
            </div>

            {votes.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center text-center space-y-4">
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
                {votes.map((vote: any) => (
                  <VoteCard
                    key={vote.id}
                    id={vote.id}
                    title={vote.title}
                    deadline={new Date(vote.deadline).toLocaleDateString()}
                    currentVotes={vote.options?.reduce((sum: number, opt: any) => sum + opt.count, 0) || 0}
                    maxVotes={vote.maxParticipants || 20}
                    status={vote.status === 'OPEN' ? 'open' : 'closed'}
                    isAdmin={user.role === 'ADMIN'}
                    onVote={(type) => handleCastVote(vote.id, type)}
                    onDelete={() => handleDeleteVote(vote.id)}
                    onClose={() => handleCloseVote(vote.id)}
                    onEdit={() => handleEditVote(vote.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Sidebar (Widgets) */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-foreground mb-4">
                클랜 <span className="text-primary">정보</span>
              </h2>
              <div className="bg-card border border-border p-4 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase font-bold">내 등급</span>
                  <span className="text-primary font-black italic">{user.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm uppercase font-bold">활동 포인트</span>
                  <span className="text-foreground font-black italic">0P</span>
                </div>
                <div className="pt-2 space-y-2">
                  <Button className="w-full bg-muted hover:bg-muted/80 text-foreground font-bold uppercase italic text-xs h-10 rounded-md">
                    클랜 상세 보기
                  </Button>
                  {user.role === 'ADMIN' && (
                    <Link href="/clan/manage" className="block">
                      <Button className="w-full bg-primary hover:bg-primary/90 text-black font-bold uppercase italic text-xs h-10 rounded-md">
                        클랜 가입 승인
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <PenaltyTracker users={[]} />

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
