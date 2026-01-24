"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { AuctionRoomCard } from "@/modules/auction/components/auction-room-card"
import { CreateAuctionModal } from "@/modules/auction/components/create-auction-modal"
import { Plus } from "lucide-react"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { AuthGuard } from "@/common/components/auth-guard"
import { toast } from "sonner"

export default function AuctionListPage() {
  const { isAdmin } = useAuth()
  const [auctionRooms, setAuctionRooms] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAuctions()
  }, [])

  const fetchAuctions = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/auctions')
      setAuctionRooms(response.data)
    } catch (error) {
      console.error("Failed to fetch auctions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAuction = async (newAuction: {
    title: string
    maxParticipants: number
    teamCount: number
  }) => {
    try {
      // Backend CreateAuctionDto now includes maxParticipants and teamCount
      await api.post('/auctions', {
        title: newAuction.title,
        startingPoints: 10000,
        turnTimeLimit: 60,
        maxParticipants: newAuction.maxParticipants,
        teamCount: newAuction.teamCount,
      })
      fetchAuctions()
    } catch (error) {
      console.error("Failed to create auction:", error)
      alert("경매 생성 실패")
    }
  }

  const handleDeleteAuction = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      await api.post(`/auctions/${id}/delete`)
      toast.success("경매가 삭제되었습니다.")
      fetchAuctions()
    } catch (error: unknown) {
      console.error("Failed to delete auction:", error)
      const axiosError = error as { response?: { data?: { message?: string } } }
      const message = axiosError.response?.data?.message || "경매 삭제 실패"
      toast.error(message)
    }
  }

  const mapStatus = (status: string): "live" | "waiting" | "ended" => {
    switch (status) {
      case 'ONGOING': return 'live'
      case 'PENDING': return 'waiting'
      case 'COMPLETED': return 'ended'
      default: return 'ended'
    }
  }

  const liveRooms = auctionRooms.filter((r) => mapStatus(r.status) === "live")
  const waitingRooms = auctionRooms.filter((r) => mapStatus(r.status) === "waiting")
  const endedRooms = auctionRooms.filter((r) => mapStatus(r.status) === "ended")

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
        경매 목록 로딩 중...
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
                    id={room.id}
                    title={room.title}
                    status="live"
                    participants={room.participants?.length || 0}
                    maxParticipants={20} // Mocked as backend doesn't have it
                    teamCount={room.teamCount || 2} // Mocked or derived
                    createdAt={new Date(room.createdAt).toLocaleDateString()}
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
                    id={room.id}
                    title={room.title}
                    status="waiting"
                    participants={room.participants?.length || 0}
                    maxParticipants={20}
                    teamCount={room.teamCount || 2}
                    createdAt={new Date(room.createdAt).toLocaleDateString()}
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
                    id={room.id}
                    title={room.title}
                    status="ended"
                    participants={room.participants?.length || 0}
                    maxParticipants={20}
                    teamCount={room.teamCount || 2}
                    createdAt={new Date(room.createdAt).toLocaleDateString()}
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
    </AuthGuard>
  )
}
