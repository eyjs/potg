"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { AuctionRoomCard } from "@/components/auction-room-card"
import { CreateAuctionModal } from "@/components/create-auction-modal"
import { Plus } from "lucide-react"

// 샘플 데이터
const initialAuctionRooms = [
  {
    id: "1",
    title: "금요일 내전 경매",
    status: "live" as const,
    participants: 12,
    maxParticipants: 20,
    teamCount: 2,
    createdAt: "2026-01-13 19:00",
  },
  {
    id: "2",
    title: "토요일 외부전 드래프트",
    status: "waiting" as const,
    participants: 8,
    maxParticipants: 16,
    teamCount: 4,
    createdAt: "2026-01-14 15:00",
  },
  {
    id: "3",
    title: "지난주 내전 기록",
    status: "ended" as const,
    participants: 20,
    maxParticipants: 20,
    teamCount: 2,
    createdAt: "2026-01-10 20:00",
  },
]

export default function AuctionListPage() {
  const [auctionRooms, setAuctionRooms] = useState(initialAuctionRooms)
  const isAdmin = true // TODO: 실제 권한 체크

  const handleCreateAuction = (newAuction: {
    title: string
    maxParticipants: number
    teamCount: number
  }) => {
    const auction = {
      id: String(Date.now()),
      ...newAuction,
      status: "waiting" as const,
      participants: 0,
      createdAt: new Date().toISOString(),
    }
    setAuctionRooms((prev) => [auction, ...prev])
  }

  const handleDeleteAuction = (id: string) => {
    setAuctionRooms((prev) => prev.filter((room) => room.id !== id))
  }

  const liveRooms = auctionRooms.filter((r) => r.status === "live")
  const waitingRooms = auctionRooms.filter((r) => r.status === "waiting")
  const endedRooms = auctionRooms.filter((r) => r.status === "ended")

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold italic uppercase tracking-wider text-foreground">
              경매 <span className="text-primary">목록</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">진행 중인 경매방에 입장하거나 새로운 경매를 생성하세요</p>
          </div>
          {isAdmin && <CreateAuctionModal onCreateAuction={handleCreateAuction} />}
        </div>

        {/* Live Auctions */}
        {liveRooms.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-destructive pl-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              진행 중
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveRooms.map((room) => (
                <AuctionRoomCard
                  key={room.id}
                  {...room}
                  isAdmin={isAdmin}
                  onDelete={() => handleDeleteAuction(room.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Waiting Auctions */}
        {waitingRooms.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bold text-lg italic uppercase tracking-wide text-foreground border-l-4 border-accent pl-3">
              대기 중
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingRooms.map((room) => (
                <AuctionRoomCard
                  key={room.id}
                  {...room}
                  isAdmin={isAdmin}
                  onDelete={() => handleDeleteAuction(room.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Ended Auctions */}
        {endedRooms.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bold text-lg italic uppercase tracking-wide text-muted-foreground border-l-4 border-muted pl-3">
              종료됨
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {endedRooms.map((room) => (
                <AuctionRoomCard
                  key={room.id}
                  {...room}
                  isAdmin={isAdmin}
                  onDelete={() => handleDeleteAuction(room.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {auctionRooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">경매가 없습니다</h3>
            <p className="text-muted-foreground">새로운 경매를 생성해보세요</p>
          </div>
        )}
      </main>
    </div>
  )
}
