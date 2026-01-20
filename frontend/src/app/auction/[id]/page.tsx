"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { PlayerPool } from "@/modules/auction/components/player-pool"
import { AuctionStage } from "@/modules/auction/components/auction-stage"
import { TeamPanel } from "@/modules/scrim/components/team-panel"
import { ChatPanel } from "@/modules/chat/components/chat-panel"
import { AdminControls } from "@/modules/auction/components/admin-controls"
import { Button } from "@/common/components/ui/button"
import { Badge } from "@/common/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

// 샘플 데이터 타입 유지 (UI 호환성 위해)
export interface Player {
  id: string
  name: string
  role: "tank" | "dps" | "support"
  tier: string
  avatar?: string
}

export interface Team {
  id: string
  name: string
  captainId: string | null
  captainName: string | null
  points: number
  members: Player[]
  color: string
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  type: "chat" | "system" | "bid"
}

export default function DraftRoomPage() {
  const params = useParams()
  const auctionId = params.id as string
  const router = useRouter()
  const { user } = useAuth()

  const [auctionData, setAuctionData] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [bids, setBids] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timer, setTimer] = useState(0)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const fetchRoomData = useCallback(async () => {
    try {
      const response = await api.get(`/auctions/${auctionId}`)
      const data = response.data
      setAuctionData(data)
      setParticipants(data.participants || [])
      setBids(data.bids || [])
      
      // Update timer based on backend end time
      if (data.currentBiddingEndTime) {
        const remaining = Math.max(0, Math.floor((new Date(data.currentBiddingEndTime).getTime() - Date.now()) / 1000))
        setTimer(remaining)
      } else {
        setTimer(0)
      }
    } catch (error) {
      console.error("Failed to fetch room data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    fetchRoomData()
    // Polling every 3 seconds as fallback for WebSocket
    const interval = setInterval(fetchRoomData, 3000)
    return () => clearInterval(interval)
  }, [fetchRoomData])

  // Map backend to frontend models
  const teams: Team[] = useMemo(() => {
    const captains = participants.filter(p => p.role === 'CAPTAIN')
    return captains.map((c, index) => {
      const colors = ["#F99E1A", "#00C3FF", "#FF4649", "#00FF88", "#FF00FF", "#FFFF00"]
      
      // Members are those who were target of a bid from this captain that is the highest for that player
      // This is a simplification. Ideally, backend should return finalized assignments.
      const teamMembers: Player[] = []
      
      // Find won players: for each player, find if this captain has the highest bid
      const playerBids: Record<string, any> = {}
      bids.forEach(bid => {
        if (!playerBids[bid.targetPlayerId] || playerBids[bid.targetPlayerId].amount < bid.amount) {
          playerBids[bid.targetPlayerId] = bid
        }
      })
      
      Object.values(playerBids).forEach((bid: any) => {
        if (bid.bidderId === c.userId && auctionData?.status === 'COMPLETED') {
          // Find player info from participants
          const playerPart = participants.find(p => p.userId === bid.targetPlayerId)
          if (playerPart) {
            teamMembers.push({
              id: playerPart.userId,
              name: playerPart.user?.battleTag?.split('#')[0] || "알 수 없음",
              role: playerPart.user?.mainRole?.toLowerCase() || 'flex',
              tier: "Gold", // Default or fetch from user
            })
          }
        }
      })

      return {
        id: c.userId,
        name: `${c.user?.battleTag?.split('#')[0] || "팀"} 팀`,
        captainId: c.userId,
        captainName: c.user?.battleTag || null,
        points: c.currentPoints,
        members: teamMembers,
        color: colors[index % colors.length],
      }
    })
  }, [participants, bids, auctionData?.status])

  const players: Player[] = useMemo(() => {
    // Players are those with role PLAYER who are not yet assigned to any team
    // (In our simplified logic, they are just all participants with role PLAYER)
    const playerParticipants = participants.filter(p => p.role === 'PLAYER')
    
    // Filter out those who are already won by someone (highest bid exists and auction for them might be over)
    const wonPlayerIds = new Set()
    if (auctionData?.status === 'COMPLETED') {
      const playerBids: Record<string, any> = {}
      bids.forEach(bid => {
        if (!playerBids[bid.targetPlayerId] || playerBids[bid.targetPlayerId].amount < bid.amount) {
          playerBids[bid.targetPlayerId] = bid
        }
      })
      Object.keys(playerBids).forEach(id => wonPlayerIds.add(id))
    }

    return playerParticipants
      .filter(p => !wonPlayerIds.has(p.userId) && p.userId !== auctionData?.currentBiddingPlayerId)
      .map(p => ({
        id: p.userId,
        name: p.user?.battleTag?.split('#')[0] || "선수",
        role: p.user?.mainRole?.toLowerCase() || 'flex',
        tier: "Gold",
      }))
  }, [participants, bids, auctionData?.status, auctionData?.currentBiddingPlayerId])

  const currentPlayer: Player | null = useMemo(() => {
    if (!auctionData?.currentBiddingPlayerId) return null
    const p = participants.find(part => part.userId === auctionData.currentBiddingPlayerId)
    if (!p) return null
    return {
      id: p.userId,
      name: p.user?.battleTag?.split('#')[0] || "선수",
      role: p.user?.mainRole?.toLowerCase() || 'flex',
      tier: "Gold",
    }
  }, [auctionData?.currentBiddingPlayerId, participants])

  const currentBid = useMemo(() => {
    if (!auctionData?.currentBiddingPlayerId) return null
    const playerBids = bids.filter(b => b.targetPlayerId === auctionData.currentBiddingPlayerId)
    if (playerBids.length === 0) return null
    const highest = playerBids.reduce((prev, current) => (prev.amount > current.amount ? prev : current))
    return { teamId: highest.bidderId, amount: highest.amount }
  }, [auctionData?.currentBiddingPlayerId, bids])

  const userRole = useMemo(() => {
    if (user?.role === 'ADMIN') return 'admin'
    const myPart = participants.find(p => p.userId === user?.id)
    if (myPart?.role === 'CAPTAIN') return 'captain'
    return 'spectator'
  }, [user, participants])

  const myCaptainTeamId = useMemo(() => {
    if (userRole === 'captain') return user?.id || null
    return null
  }, [userRole, user])

  // Auction actions
  const handleSelectPlayer = async (player: Player) => {
    if (userRole !== "admin") return
    try {
      await api.patch(`/auctions/${auctionId}/select-player`, { playerId: player.id })
      fetchRoomData()
    } catch (error) {
      console.error("Failed to select player:", error)
    }
  }

  const handleStartAuction = async () => {
    try {
      await api.patch(`/auctions/${auctionId}/start`)
      fetchRoomData()
    } catch (error) {
      console.error("Failed to start auction:", error)
    }
  }

  const handlePauseAuction = () => {
    // Placeholder as backend doesn't support pause yet
    alert("준비 중인 기능입니다.")
  }

  const handleResumeAuction = () => {
    // Placeholder
  }

  const handleConfirmBid = async () => {
    try {
      await api.patch(`/auctions/${auctionId}/complete`)
      fetchRoomData()
    } catch (error) {
      console.error("Failed to complete auction:", error)
    }
  }

  const handleCancelBid = () => {
    // Placeholder
  }

  const handleBid = async (amount: number) => {
    if (!currentPlayer || (userRole !== 'captain' && userRole !== 'admin')) return
    
    const bidAmount = (currentBid?.amount || 0) + amount
    try {
      await api.post(`/auctions/${auctionId}/bid`, {
        targetPlayerId: currentPlayer.id,
        amount: bidAmount
      })
      fetchRoomData()
    } catch (error: any) {
      alert(error.response?.data?.message || "입찰 실패")
    }
  }

  const handleSendMessage = (message: string) => {
    // Local only chat for now
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        userId: user?.id || "anon",
        userName: user?.battleTag?.split('#')[0] || "익명",
        message,
        timestamp: new Date(),
        type: "chat",
      },
    ])
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold animate-pulse uppercase italic tracking-widest">
      드래프트 룸 입장 중...
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      <Header />

      {/* Sub Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/auction")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-bold text-lg italic uppercase tracking-wide text-foreground">
              {auctionData?.title} <span className="text-primary">드래프트</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">내 역할:</span>
            <Badge className={cn(
              "skew-btn",
              userRole === 'admin' ? "bg-destructive" : userRole === 'captain' ? "bg-primary" : "bg-muted"
            )}>
              {userRole.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 container px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          <div className="lg:col-span-3">
            <PlayerPool
              players={players}
              isAdmin={userRole === "admin"}
              teams={teams}
              onSelectPlayer={handleSelectPlayer}
              onForceAssign={() => {}} // TODO
              onSetCaptain={() => {}} // TODO
            />
          </div>

          <div className="lg:col-span-5">
            <AuctionStage
              currentPlayer={currentPlayer}
              currentBid={currentBid}
              auctionStatus={
                auctionData?.status === 'ONGOING' ? 'bidding' : 
                auctionData?.status === 'PENDING' ? 'waiting' : 'ended'
              }
              timer={timer}
              teams={teams}
              userRole={userRole}
              myCaptainTeamId={myCaptainTeamId}
              onBid={handleBid}
            />

            {userRole === "admin" && (
              <AdminControls
                auctionStatus={auctionData?.status === 'ONGOING' ? 'bidding' : 'waiting'}
                currentPlayer={currentPlayer}
                onStart={handleStartAuction}
                onPause={handlePauseAuction}
                onResume={handleResumeAuction}
                onConfirm={handleConfirmBid}
                onCancel={handleCancelBid}
              />
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <TeamPanel
              teams={teams}
              isAdmin={userRole === "admin"}
              onAddTeam={() => {}} // TODO
              onRemoveMember={() => {}} // TODO
            />
            <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  )
}
