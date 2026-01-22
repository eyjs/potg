"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { ScrimHeader } from "@/modules/scrim/components/scrim-header"
import { RosterSection } from "@/modules/scrim/components/roster-section"
import { MatchList } from "@/modules/scrim/components/match-list"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { AuthGuard } from "@/common/components/auth-guard"

// Type definition
interface Match {
  id: string
  gameNumber: number
  map: { name: string; image: string } | null
  result: "teamA" | "teamB" | "draw" | null
  screenshot: string | null
}

const overwatchMaps = [
  { name: "King's Row", image: "/overwatch-kings-row-map.jpg", type: "Hybrid" },
  { name: "Dorado", image: "/overwatch-dorado-map.jpg", type: "Escort" },
  { name: "Hanamura", image: "/overwatch-hanamura.jpg", type: "Assault" },
  { name: "Eichenwalde", image: "/placeholder.svg", type: "Hybrid" },
  { name: "Ilios", image: "/overwatch-ilios-map-greek-islands.jpg", type: "Control" },
  { name: "Lijiang Tower", image: "/overwatch-lijiang-tower-map-chinese-architecture-n.jpg", type: "Control" },
  { name: "Numbani", image: "/placeholder.svg", type: "Hybrid" },
  { name: "Route 66", image: "/overwatch-route-66-map-american-desert-highway.jpg", type: "Escort" },
  { name: "Watchpoint: Gibraltar", image: "/overwatch-watchpoint-gibraltar-map-rocket-base.jpg", type: "Escort" },
  { name: "Oasis", image: "/overwatch-oasis-map-futuristic-desert-city.jpg", type: "Control" },
  { name: "Busan", image: "/overwatch-busan-map-futuristic-korean-city.jpg", type: "Control" },
  { name: "Blizzard World", image: "/placeholder.svg", type: "Hybrid" },
]

import { useRouter } from "next/navigation"

export default function ScrimDetailPage() {
  const params = useParams()
  const scrimId = params.id as string
  const router = useRouter()
  const { user, isAdmin, isLoading: authLoading } = useAuth()

  const [scrim, setScrim] = useState<any>(null)
  const [pool, setPool] = useState<any[]>([])
  const [teamA, setTeamA] = useState<any[]>([])
  const [teamB, setTeamB] = useState<any[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchScrimData = useCallback(async () => {
    try {
      const response = await api.get(`/scrims/${scrimId}`)
      const data = response.data
      setScrim({
        id: data.id,
        title: data.title,
        status: data.status.toLowerCase(),
        date: data.scheduledDate ? new Date(data.scheduledDate).toLocaleDateString() : "",
        startTime: data.scheduledDate ? new Date(data.scheduledDate).toLocaleTimeString() : "",
        endTime: "",
        auctionId: data.auctionId,
      })

      const participants = data.participants || []
      setPool(participants.filter((p: any) => p.assignedTeam === 'UNASSIGNED').map((p: any) => ({
        id: p.userId,
        name: p.user?.battleTag?.split('#')[0] || "선수",
        role: p.user?.mainRole?.toLowerCase() || 'flex',
      })))
      setTeamA(participants.filter((p: any) => p.assignedTeam === 'TEAM_A').map((p: any) => ({
        id: p.userId,
        name: p.user?.battleTag?.split('#')[0] || "선수",
        role: p.user?.mainRole?.toLowerCase() || 'flex',
      })))
      setTeamB(participants.filter((p: any) => p.assignedTeam === 'TEAM_B').map((p: any) => ({
        id: p.userId,
        name: p.user?.battleTag?.split('#')[0] || "선수",
        role: p.user?.mainRole?.toLowerCase() || 'flex',
      })))

      setMatches(data.matches?.map((m: any, index: number) => ({
        id: m.id,
        gameNumber: index + 1,
        map: m.mapName ? { name: m.mapName, image: "/placeholder.svg" } : null,
        result: m.teamAScore > m.teamBScore ? 'teamA' :
                m.teamBScore > m.teamAScore ? 'teamB' :
                (m.teamAScore === 0 && m.teamBScore === 0 && !m.mapName) ? null : 'draw',
        screenshot: m.screenshotUrl,
      })) || [])
    } catch (error) {
      console.error("Failed to fetch scrim data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [scrimId])

  useEffect(() => {
    fetchScrimData()
  }, [fetchScrimData])

  const handleUpdateSchedule = async (date: string, startTime: string, endTime: string) => {
    try {
      await api.patch(`/scrims/${scrimId}`, {
        scheduledDate: new Date(`${date} ${startTime}`)
      })
      fetchScrimData()
    } catch (error) {
      console.error("Failed to update schedule:", error)
    }
  }

  const handleMoveToTeam = async (memberId: string, team: "A" | "B") => {
    try {
      await api.patch(`/scrims/${scrimId}/participants/${memberId}/team`, {
        team: team === "A" ? 'TEAM_A' : 'TEAM_B'
      })
      fetchScrimData()
    } catch (error) {
      console.error("Failed to move to team:", error)
    }
  }

  const handleMoveToPool = async (memberId: string) => {
    try {
      await api.patch(`/scrims/${scrimId}/participants/${memberId}/team`, {
        team: 'UNASSIGNED'
      })
      fetchScrimData()
    } catch (error) {
      console.error("Failed to move to pool:", error)
    }
  }

  const handleImportFromAuction = async () => {
    if (!scrim?.auctionId) {
      alert("이 스크림은 경매와 연결되어 있지 않습니다.")
      return
    }

    if (!confirm("경매 참가자를 불러오면 현재 경매 출처 대기 명단이 초기화됩니다. 계속하시겠습니까?")) {
      return
    }

    try {
      await api.post(`/scrims/${scrimId}/import-auction`)
      fetchScrimData()
    } catch (error: unknown) {
      console.error("Failed to import from auction:", error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || "경매 불러오기에 실패했습니다.")
    }
  }

  const handleShuffleTeams = async () => {
    if (pool.length === 0) {
      alert("대기 명단에 참가자가 없습니다.")
      return
    }

    if (!confirm(`대기 명단 ${pool.length}명을 랜덤으로 팀에 배정하시겠습니까?`)) {
      return
    }

    try {
      await api.post(`/scrims/${scrimId}/shuffle-teams`)
      fetchScrimData()
    } catch (error: unknown) {
      console.error("Failed to shuffle teams:", error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || "팀 섞기에 실패했습니다.")
    }
  }

  const handleUpdateMatchCount = async (count: number) => {
    try {
      await api.post(`/scrims/${scrimId}/matches`, { count })
      fetchScrimData()
    } catch (error: unknown) {
      console.error("Failed to update match count:", error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || "경기 수 조절에 실패했습니다.")
    }
  }

  const handleUpdateMatch = async (matchId: string, updates: Partial<Match>) => {
    try {
      // Convert frontend format to backend format
      const backendUpdates: Record<string, unknown> = {}

      if (updates.map !== undefined) {
        backendUpdates.mapName = updates.map?.name || ''
      }

      if (updates.result !== undefined) {
        if (updates.result === 'teamA') {
          backendUpdates.teamAScore = 1
          backendUpdates.teamBScore = 0
        } else if (updates.result === 'teamB') {
          backendUpdates.teamAScore = 0
          backendUpdates.teamBScore = 1
        } else if (updates.result === 'draw') {
          backendUpdates.teamAScore = 0
          backendUpdates.teamBScore = 0
        }
      }

      if (updates.screenshot !== undefined) {
        backendUpdates.screenshotUrl = updates.screenshot
      }

      await api.patch(`/scrims/${scrimId}/matches/${matchId}`, backendUpdates)
      fetchScrimData()
    } catch (error: unknown) {
      console.error("Failed to update match:", error)
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || "경기 정보 업데이트에 실패했습니다.")
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold animate-pulse uppercase italic tracking-widest">
      내전 데이터 로딩 중...
    </div>
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-6 space-y-6">
          <ScrimHeader scrim={scrim} isAdmin={isAdmin} onUpdateSchedule={handleUpdateSchedule} />

          <RosterSection
            teamA={teamA}
            teamB={teamB}
            pool={pool}
            isAdmin={isAdmin}
            hasAuction={!!scrim?.auctionId}
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
    </AuthGuard>
  )
}
