"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { VoteCard } from "@/components/vote-card"
import { PenaltyTracker } from "@/components/penalty-tracker"
import { AuctionBanner } from "@/components/auction-banner"
import { CreateVoteModal } from "@/components/create-vote-modal"

// 샘플 데이터
const initialVotes = [
  {
    id: "1",
    title: "금요일 내전",
    deadline: "2026-01-17 20:00",
    currentVotes: 14,
    maxVotes: 20,
    status: "open" as const,
  },
  {
    id: "2",
    title: "토요일 외부전",
    deadline: "2026-01-18 15:00",
    currentVotes: 8,
    maxVotes: 12,
    status: "open" as const,
  },
  {
    id: "3",
    title: "수요일 연습경기",
    deadline: "2026-01-14 21:00",
    currentVotes: 10,
    maxVotes: 10,
    status: "closed" as const,
  },
]

const penaltyUsers = [
  { id: "1", name: "김철수", points: -100, reason: "미투표 (금요일 내전)" },
  { id: "2", name: "이영희", points: -200, reason: "노쇼 2회" },
]

export default function LobbyPage() {
  const [votes, setVotes] = useState(initialVotes)
  const [userVotes, setUserVotes] = useState<Record<string, "attend" | "absent" | "late" | null>>({})
  const isAdmin = true // TODO: 실제 권한 체크

  const handleVote = (voteId: string, vote: "attend" | "absent" | "late") => {
    setUserVotes((prev) => ({ ...prev, [voteId]: vote }))
    // 투표 수 업데이트 (실제로는 서버에서 처리)
    setVotes((prev) =>
      prev.map((v) => (v.id === voteId && !userVotes[voteId] ? { ...v, currentVotes: v.currentVotes + 1 } : v)),
    )
  }

  const handleCreateVote = (newVote: { title: string; deadline: string; maxVotes: number }) => {
    const vote = {
      id: String(Date.now()),
      ...newVote,
      currentVotes: 0,
      status: "open" as const,
    }
    setVotes((prev) => [vote, ...prev])
  }

  const handleCloseVote = (voteId: string) => {
    setVotes((prev) => prev.map((v) => (v.id === voteId ? { ...v, status: "closed" as const } : v)))
  }

  const handleDeleteVote = (voteId: string) => {
    setVotes((prev) => prev.filter((v) => v.id !== voteId))
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
          {isAdmin && <CreateVoteModal onCreateVote={handleCreateVote} />}
        </div>

        {/* Auction Banner */}
        <AuctionBanner hasLiveAuction={true} roomCount={2} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vote Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-primary pl-3">
              투표 현황
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {votes.map((vote) => (
                <VoteCard
                  key={vote.id}
                  {...vote}
                  isAdmin={isAdmin}
                  userVote={userVotes[vote.id]}
                  onVote={(v) => handleVote(vote.id, v)}
                  onClose={() => handleCloseVote(vote.id)}
                  onDelete={() => handleDeleteVote(vote.id)}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-destructive pl-3">
              패널티 트래커
            </h2>
            <PenaltyTracker users={penaltyUsers} />
          </div>
        </div>
      </main>
    </div>
  )
}
