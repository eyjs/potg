"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { VoteCard } from "@/components/vote-card"
import { PenaltyTracker } from "@/components/penalty-tracker"
import { AuctionBanner } from "@/components/auction-banner"
import { CreateVoteModal } from "@/components/create-vote-modal"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LobbyPage() {
  const { user, isLoading } = useAuth()
  const [votes, setVotes] = useState([])
  const [liveAuctions, setLiveAuctions] = useState([])
  const [isDataLoading, setIsDataLoading] = useState(true)

  useEffect(() => {
    if (user?.clanId) {
      fetchDashboardData()
    } else {
      setIsDataLoading(false)
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      const [votesRes, auctionsRes] = await Promise.all([
        api.get(`/votes?clanId=${user?.clanId}`),
        api.get(`/auctions?clanId=${user?.clanId}`) // Assuming filter exists or we filter client side
      ])
      setVotes(votesRes.data)
      setLiveAuctions(auctionsRes.data.filter((a: any) => a.status === 'PENDING')) // Map status correctly
    } catch (error) {
      console.error(error)
    } finally {
      setIsDataLoading(false)
    }
  }

  if (isLoading || isDataLoading) return <div className="min-h-screen bg-background flex items-center justify-center">로딩 중...</div>

  if (!user?.clanId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container flex-1 flex flex-col items-center justify-center gap-6">
          <h1 className="text-3xl font-bold">소속된 클랜이 없습니다</h1>
          <div className="flex gap-4">
            <Link href="/clan/create">
              <Button size="lg">클랜 생성</Button>
            </Link>
            <Link href="/clan/join">
              <Button size="lg" variant="outline">클랜 가입</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold italic uppercase tracking-wider text-foreground">
              작전 <span className="text-primary">로비</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">내전 투표 현황 및 모임 상태를 확인하세요</p>
          </div>
          {/* {isAdmin && <CreateVoteModal onCreateVote={handleCreateVote} />} */}
        </div>

        {/* Auction Banner */}
        <AuctionBanner hasLiveAuction={liveAuctions.length > 0} roomCount={liveAuctions.length} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vote Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-primary pl-3">
              투표 현황
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {votes.map((vote: any) => (
                <VoteCard
                  key={vote.id}
                  {...vote}
                  isAdmin={user?.role === 'ADMIN'}
                  // userVote={userVotes[vote.id]}
                  // onVote={(v) => handleVote(vote.id, v)}
                  // onClose={() => handleCloseVote(vote.id)}
                  // onDelete={() => handleDeleteVote(vote.id)}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-destructive pl-3">
              패널티 트래커
            </h2>
            <PenaltyTracker users={[]} />
          </div>
        </div>
      </main>
    </div>
  )
}
