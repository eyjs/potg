"use client"

import { useState } from "react"
import { Header } from "@/common/layouts/header"
import { ScrimHeader } from "@/modules/scrim/components/scrim-header"
import { RosterSection } from "@/modules/scrim/components/roster-section"
import { MatchList } from "@/modules/scrim/components/match-list"

// Type definition
interface Match {
  id: string
  gameNumber: number
  map: { name: string; image: string } | null
  result: "teamA" | "teamB" | "draw" | null
  screenshot: string | null
}

// Mock data
const mockScrim = {
  id: "1",
  title: "금요일 내전",
  status: "finished" as const,
  date: "2026-01-14",
  startTime: "20:00",
  endTime: "22:00",
}

const mockMembers = [
  { id: "1", name: "김철수", avatar: "/avatar-male-gamer.jpg", role: "tank" as const },
  { id: "2", name: "이영희", avatar: "/avatar-female-gamer.jpg", role: "dps" as const },
  { id: "3", name: "박지민", avatar: "/avatar-male-esports.jpg", role: "dps" as const },
  { id: "4", name: "최수연", avatar: "/avatar-female-player.jpg", role: "support" as const },
  { id: "5", name: "정민호", avatar: "/avatar-male-streamer.jpg", role: "support" as const },
  { id: "6", name: "한소희", avatar: "/avatar-female-korean.jpg", role: "tank" as const },
  { id: "7", name: "윤성민", avatar: "/avatar-male-korean-gamer.jpg", role: "dps" as const },
  { id: "8", name: "강지우", avatar: "/avatar-female-streamer.jpg", role: "dps" as const },
  { id: "9", name: "조현우", avatar: "/avatar-male-esports-player.jpg", role: "support" as const },
  { id: "10", name: "임세라", avatar: "/avatar-female-gamer-korean.jpg", role: "support" as const },
  { id: "11", name: "오지현", avatar: "/avatar-person.png", role: "tank" as const },
  { id: "12", name: "신동욱", avatar: "/male-avatar.png", role: "dps" as const },
]

const mockMatches: Match[] = [
  {
    id: "1",
    gameNumber: 1,
    map: { name: "King's Row", image: "/overwatch-kings-row-map.jpg" },
    result: "teamA",
    screenshot: "/overwatch-scoreboard-screenshot-tab.jpg",
  },
  {
    id: "2",
    gameNumber: 2,
    map: { name: "Dorado", image: "/overwatch-dorado-map.jpg" },
    result: "teamB",
    screenshot: "/overwatch-match-result-scoreboard.jpg",
  },
  {
    id: "3",
    gameNumber: 3,
    map: null,
    result: null,
    screenshot: null,
  },
]

const overwatchMaps = [
  { name: "King's Row", image: "/overwatch-kings-row.jpg", type: "Hybrid" },
  { name: "Dorado", image: "/overwatch-dorado.jpg", type: "Escort" },
  { name: "Hanamura", image: "/overwatch-hanamura.jpg", type: "Assault" },
  { name: "Eichenwalde", image: "/placeholder.svg?height=80&width=140", type: "Hybrid" },
  { name: "Ilios", image: "/placeholder.svg?height=80&width=140", type: "Control" },
  { name: "Lijiang Tower", image: "/placeholder.svg?height=80&width=140", type: "Control" },
  { name: "Numbani", image: "/placeholder.svg?height=80&width=140", type: "Hybrid" },
  { name: "Route 66", image: "/placeholder.svg?height=80&width=140", type: "Escort" },
  { name: "Watchpoint: Gibraltar", image: "/placeholder.svg?height=80&width=140", type: "Escort" },
  { name: "Oasis", image: "/placeholder.svg?height=80&width=140", type: "Control" },
  { name: "Busan", image: "/placeholder.svg?height=80&width=140", type: "Control" },
  { name: "Blizzard World", image: "/placeholder.svg?height=80&width=140", type: "Hybrid" },
]

export default function ScrimDetailPage() {
  const [scrim, setScrim] = useState(mockScrim)
  const [pool, setPool] = useState(mockMembers)
  const [teamA, setTeamA] = useState<typeof mockMembers>([])
  const [teamB, setTeamB] = useState<typeof mockMembers>([])
  const [matches, setMatches] = useState<Match[]>(mockMatches)
  const [isAdmin] = useState(true)

  const handleUpdateSchedule = (date: string, startTime: string, endTime: string) => {
    setScrim((prev) => ({ ...prev, date, startTime, endTime }))
  }

  const handleMoveToTeam = (memberId: string, team: "A" | "B") => {
    const member = pool.find((m) => m.id === memberId)
    if (!member) return

    setPool((prev) => prev.filter((m) => m.id !== memberId))
    if (team === "A") {
      setTeamA((prev) => [...prev, member])
    } else {
      setTeamB((prev) => [...prev, member])
    }
  }

  const handleMoveToPool = (memberId: string) => {
    let member = teamA.find((m) => m.id === memberId)
    if (member) {
      setTeamA((prev) => prev.filter((m) => m.id !== memberId))
      setPool((prev) => [...prev, member!])
      return
    }

    member = teamB.find((m) => m.id === memberId)
    if (member) {
      setTeamB((prev) => prev.filter((m) => m.id !== memberId))
      setPool((prev) => [...prev, member!])
    }
  }

  const handleImportFromAuction = () => {
    // Reset and apply auction results
    const auctionTeamA = mockMembers.slice(0, 5)
    const auctionTeamB = mockMembers.slice(5, 10)
    const remaining = mockMembers.slice(10)

    setTeamA(auctionTeamA)
    setTeamB(auctionTeamB)
    setPool(remaining)
  }

  const handleShuffleTeams = () => {
    const allMembers = [...pool, ...teamA, ...teamB]
    const shuffled = [...allMembers].sort(() => Math.random() - 0.5)
    const half = Math.ceil(shuffled.length / 2)

    setTeamA(shuffled.slice(0, half))
    setTeamB(shuffled.slice(half))
    setPool([])
  }

  const handleUpdateMatchCount = (count: number) => {
    const currentCount = matches.length
    if (count > currentCount) {
      const newMatches = Array.from({ length: count - currentCount }, (_, i) => ({
        id: String(Date.now() + i),
        gameNumber: currentCount + i + 1,
        map: null,
        result: null,
        screenshot: null,
      }))
      setMatches((prev) => [...prev, ...newMatches])
    } else {
      setMatches((prev) => prev.slice(0, count))
    }
  }

  const handleUpdateMatch = (matchId: string, updates: Partial<Match>) => {
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...updates } : m)))
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-6 space-y-6">
        <ScrimHeader scrim={scrim} isAdmin={isAdmin} onUpdateSchedule={handleUpdateSchedule} />

        <RosterSection
          teamA={teamA}
          teamB={teamB}
          pool={pool}
          isAdmin={isAdmin}
          onMoveToTeam={handleMoveToTeam}
          onMoveToPool={handleMoveToPool}
          onImportFromAuction={handleImportFromAuction}
          onShuffleTeams={handleShuffleTeams}
        />

        <MatchList
          matches={matches}
          isAdmin={isAdmin}
          maps={overwatchMaps}
          onUpdateMatchCount={handleUpdateMatchCount}
          onUpdateMatch={handleUpdateMatch}
        />
      </main>
    </div>
  )
}
