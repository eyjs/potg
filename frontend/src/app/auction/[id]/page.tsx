"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { PlayerPool } from "@/modules/auction/components/player-pool"
import { AuctionStage } from "@/modules/auction/components/auction-stage"
import { TeamPanel } from "@/modules/scrim/components/team-panel"
import { ChatPanel } from "@/modules/chat/components/chat-panel"
import { AdminControls } from "@/modules/auction/components/admin-controls"
import { Button } from "@/common/components/ui/button"
import { ArrowLeft } from "lucide-react"

// 샘플 데이터 타입
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

// 샘플 데이터
const initialPlayers: Player[] = [
  { id: "p1", name: "김탱커", role: "tank", tier: "다이아" },
  { id: "p2", name: "박돌격", role: "tank", tier: "플래티넘" },
  { id: "p3", name: "이딜러", role: "dps", tier: "마스터" },
  { id: "p4", name: "최딜러", role: "dps", tier: "다이아" },
  { id: "p5", name: "정힐러", role: "support", tier: "그마" },
  { id: "p6", name: "홍힐러", role: "support", tier: "다이아" },
  { id: "p7", name: "강탱커", role: "tank", tier: "플래티넘" },
  { id: "p8", name: "윤딜러", role: "dps", tier: "다이아" },
  { id: "p9", name: "장힐러", role: "support", tier: "마스터" },
  { id: "p10", name: "임딜러", role: "dps", tier: "플래티넘" },
]

const initialTeams: Team[] = [
  { id: "t1", name: "팀 1", captainId: null, captainName: null, points: 10000, members: [], color: "#F99E1A" },
  { id: "t2", name: "팀 2", captainId: null, captainName: null, points: 10000, members: [], color: "#00C3FF" },
]

export default function DraftRoomPage() {
  const router = useRouter()

  // Role states
  const [userRole, setUserRole] = useState<"admin" | "captain" | "spectator">("admin")
  const [myCaptainTeamId, setMyCaptainTeamId] = useState<string | null>(null)

  // Draft data
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [currentBid, setCurrentBid] = useState<{ teamId: string; amount: number } | null>(null)
  const [auctionStatus, setAuctionStatus] = useState<"waiting" | "bidding" | "paused" | "ended">("waiting")
  const [timer, setTimer] = useState(10)

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      userId: "system",
      userName: "시스템",
      message: "경매방에 입장했습니다.",
      timestamp: new Date(),
      type: "system",
    },
  ])

  // Timer effect
  useEffect(() => {
    if (auctionStatus !== "bidding" || timer <= 0) return

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // Auto confirm when timer ends
          if (currentBid && currentPlayer) {
            handleConfirmBid()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [auctionStatus, timer])

  // Admin functions
  const handleSelectPlayer = (player: Player) => {
    if (userRole !== "admin") return
    setCurrentPlayer(player)
    setCurrentBid(null)
    setTimer(10)
    setAuctionStatus("bidding")
    addSystemMessage(`${player.name} 선수 경매를 시작합니다!`)
  }

  const handleStartAuction = () => {
    if (!currentPlayer) return
    setAuctionStatus("bidding")
    setTimer(10)
    addSystemMessage("경매가 시작되었습니다!")
  }

  const handlePauseAuction = () => {
    setAuctionStatus("paused")
    addSystemMessage("경매가 일시 중지되었습니다.")
  }

  const handleResumeAuction = () => {
    setAuctionStatus("bidding")
    addSystemMessage("경매가 재개되었습니다!")
  }

  const handleConfirmBid = () => {
    if (!currentBid || !currentPlayer) return

    const winningTeam = teams.find((t) => t.id === currentBid.teamId)
    if (!winningTeam) return

    // Update teams
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id === currentBid.teamId) {
          return {
            ...team,
            points: team.points - currentBid.amount,
            members: [...team.members, currentPlayer],
          }
        }
        return team
      }),
    )

    // Remove from player pool
    setPlayers((prev) => prev.filter((p) => p.id !== currentPlayer.id))

    addSystemMessage(`${currentPlayer.name} 선수가 ${winningTeam.name}에 ${currentBid.amount}P로 낙찰되었습니다!`)

    // Reset
    setCurrentPlayer(null)
    setCurrentBid(null)
    setAuctionStatus("waiting")
    setTimer(10)
  }

  const handleCancelBid = () => {
    if (!currentPlayer) return
    addSystemMessage(`${currentPlayer.name} 선수 경매가 유찰되었습니다.`)
    setCurrentPlayer(null)
    setCurrentBid(null)
    setAuctionStatus("waiting")
    setTimer(10)
  }

  const handleForceAssign = (player: Player, teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, members: [...t.members, player] }
        }
        return t
      }),
    )
    setPlayers((prev) => prev.filter((p) => p.id !== player.id))
    addSystemMessage(`${player.name} 선수가 ${team.name}에 강제 배정되었습니다.`)
  }

  const handleRemoveMember = (teamId: string, playerId: string) => {
    const team = teams.find((t) => t.id === teamId)
    const player = team?.members.find((m) => m.id === playerId)
    if (!team || !player) return

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, members: t.members.filter((m) => m.id !== playerId) }
        }
        return t
      }),
    )
    setPlayers((prev) => [...prev, player])
    addSystemMessage(`${player.name} 선수가 ${team.name}에서 제거되었습니다.`)
  }

  const handleSetCaptain = (teamId: string, player: Player) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, captainId: player.id, captainName: player.name }
        }
        return t
      }),
    )
    setPlayers((prev) => prev.filter((p) => p.id !== player.id))
    addSystemMessage(`${player.name}님이 ${teams.find((t) => t.id === teamId)?.name} 팀장으로 지정되었습니다.`)
  }

  const handleAddTeam = () => {
    const newTeamNumber = teams.length + 1
    const colors = ["#F99E1A", "#00C3FF", "#FF4649", "#00FF88", "#FF00FF", "#FFFF00"]
    const newTeam: Team = {
      id: `t${Date.now()}`,
      name: `팀 ${newTeamNumber}`,
      captainId: null,
      captainName: null,
      points: 10000,
      members: [],
      color: colors[newTeamNumber % colors.length],
    }
    setTeams((prev) => [...prev, newTeam])
    addSystemMessage(`${newTeam.name}이 생성되었습니다.`)
  }

  // Captain functions
  const handleBid = (amount: number) => {
    if (userRole !== "captain" && userRole !== "admin") return
    if (!currentPlayer || auctionStatus !== "bidding") return

    const teamId = userRole === "admin" ? teams[0]?.id : myCaptainTeamId
    if (!teamId) return

    const team = teams.find((t) => t.id === teamId)
    if (!team || team.points < (currentBid?.amount || 0) + amount) return

    const newBidAmount = (currentBid?.amount || 0) + amount
    setCurrentBid({ teamId, amount: newBidAmount })
    setTimer(10) // Reset timer on new bid
    addBidMessage(team.name, newBidAmount)
  }

  // Chat functions
  const addSystemMessage = (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        userId: "system",
        userName: "시스템",
        message,
        timestamp: new Date(),
        type: "system",
      },
    ])
  }

  const addBidMessage = (teamName: string, amount: number) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        userId: "bid",
        userName: teamName,
        message: `${amount}P 베팅!`,
        timestamp: new Date(),
        type: "bid",
      },
    ])
  }

  const handleSendMessage = (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        userId: "me",
        userName: "나",
        message,
        timestamp: new Date(),
        type: "chat",
      },
    ])
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Sub Header with Controls */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/auction")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-bold text-lg italic uppercase tracking-wide text-foreground">
              드래프트 <span className="text-primary">룸</span>
            </h1>
          </div>

          {/* Role Switcher (Demo) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ROLE:</span>
            <div className="flex gap-1">
              {(["admin", "captain", "spectator"] as const).map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant={userRole === role ? "default" : "ghost"}
                  className={userRole === role ? "bg-primary text-primary-foreground" : ""}
                  onClick={() => {
                    setUserRole(role)
                    if (role === "captain") setMyCaptainTeamId(teams[0]?.id || null)
                  }}
                >
                  {role.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Draft Room Layout */}
      <div className="flex-1 container px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Left: Player Pool */}
          <div className="lg:col-span-3">
            <PlayerPool
              players={players}
              isAdmin={userRole === "admin"}
              teams={teams}
              onSelectPlayer={handleSelectPlayer}
              onForceAssign={handleForceAssign}
              onSetCaptain={handleSetCaptain}
            />
          </div>

          {/* Center: Auction Stage */}
          <div className="lg:col-span-5">
            <AuctionStage
              currentPlayer={currentPlayer}
              currentBid={currentBid}
              auctionStatus={auctionStatus}
              timer={timer}
              teams={teams}
              userRole={userRole}
              myCaptainTeamId={myCaptainTeamId}
              onBid={handleBid}
            />

            {/* Admin Controls */}
            {userRole === "admin" && (
              <AdminControls
                auctionStatus={auctionStatus}
                currentPlayer={currentPlayer}
                onStart={handleStartAuction}
                onPause={handlePauseAuction}
                onResume={handleResumeAuction}
                onConfirm={handleConfirmBid}
                onCancel={handleCancelBid}
              />
            )}
          </div>

          {/* Right: Teams & Chat */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <TeamPanel
              teams={teams}
              isAdmin={userRole === "admin"}
              onAddTeam={handleAddTeam}
              onRemoveMember={handleRemoveMember}
            />
            <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  )
}
