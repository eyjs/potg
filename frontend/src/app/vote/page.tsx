"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import {
  BarChart3,
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Medal,
  Target,
  Swords,
  ChevronRight,
  Filter
} from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { Button } from "@/common/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import Link from "next/link"
import { handleApiError } from "@/lib/api-error"

interface ScrimHistory {
  id: string
  title: string
  scheduledDate: string
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED"
  teamAScore: number
  teamBScore: number
  recruitmentType: "VOTE" | "AUCTION" | "MANUAL"
  participantsCount: number
}

interface PlayerStats {
  rank: number
  userId: string
  battleTag: string
  avatarUrl?: string
  wins: number
  losses: number
  participations: number
  winRate: number
  totalPoints: number
}

interface MonthlyStats {
  month: string
  scrimCount: number
  totalParticipants: number
  averageParticipants: number
}

export default function StatisticsPage() {
  const { user } = useAuth()
  const [scrims, setScrims] = useState<ScrimHistory[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "finished" | "upcoming">("all")

  useEffect(() => {
    if (user?.clanId) {
      fetchData()
    } else {
      setIsLoading(false)
    }
  }, [user?.clanId])

  const fetchData = async () => {
    try {
      const [scrimsRes, statsRes] = await Promise.all([
        api.get(`/scrims?clanId=${user?.clanId}`),
        api.get(`/clans/${user?.clanId}/members`).catch(() => ({ data: [] })),
      ])

      // Process scrims
      const scrimsData = scrimsRes.data || []
      setScrims(scrimsData)

      // Calculate player stats from clan members
      const members = statsRes.data || []
      const stats: PlayerStats[] = members.map((member: {
        userId: string
        user?: { battleTag: string; avatarUrl?: string }
        totalPoints: number
      }, index: number) => ({
        rank: index + 1,
        userId: member.userId,
        battleTag: member.user?.battleTag || "Unknown",
        avatarUrl: member.user?.avatarUrl,
        wins: 0, // Will be calculated from scrims
        losses: 0,
        participations: 0,
        winRate: 0,
        totalPoints: member.totalPoints || 0,
      }))

      // Sort by totalPoints descending and recalculate rank
      stats.sort((a, b) => b.totalPoints - a.totalPoints)
      stats.forEach((stat, index) => { stat.rank = index + 1 })

      setPlayerStats(stats)

      // Calculate monthly stats
      const monthlyMap = new Map<string, { count: number; participants: number }>()
      scrimsData.forEach((scrim: ScrimHistory) => {
        const date = new Date(scrim.scheduledDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const existing = monthlyMap.get(monthKey) || { count: 0, participants: 0 }
        monthlyMap.set(monthKey, {
          count: existing.count + 1,
          participants: existing.participants + (scrim.participantsCount || 0),
        })
      })

      const monthly: MonthlyStats[] = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          scrimCount: data.count,
          totalParticipants: data.participants,
          averageParticipants: data.count > 0 ? Math.round(data.participants / data.count) : 0,
        }))
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 6)

      setMonthlyStats(monthly)
    } catch (error) {
      handleApiError(error, "통계 데이터를 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredScrims = scrims.filter(scrim => {
    if (filter === "finished") return scrim.status === "FINISHED"
    if (filter === "upcoming") return scrim.status === "SCHEDULED" || scrim.status === "DRAFT"
    return true
  }).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())

  const finishedCount = scrims.filter(s => s.status === "FINISHED").length
  const totalParticipations = scrims.reduce((sum, s) => sum + (s.participantsCount || 0), 0)

  if (!user?.clanId) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
          <Header />
          <main className="container px-4 py-8 max-w-6xl mx-auto">
            <div className="bg-card border border-border border-dashed p-20 text-center rounded-lg">
              <BarChart3 className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">클랜에 가입하면 통계를 확인할 수 있습니다.</p>
            </div>
          </main>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
              <BarChart3 className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                통계 <span className="text-primary">STATS</span>
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Scrim Records & Analytics</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-primary font-bold animate-pulse">통계 로딩 중...</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-primary/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Swords className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-foreground">{scrims.length}</p>
                      <p className="text-xs text-muted-foreground">총 내전</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-green-500/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-foreground">{finishedCount}</p>
                      <p className="text-xs text-muted-foreground">완료된 내전</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-blue-500/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-foreground">{playerStats.length}</p>
                      <p className="text-xs text-muted-foreground">클랜원</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-accent/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-foreground">{totalParticipations}</p>
                      <p className="text-xs text-muted-foreground">총 참가</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="history" className="space-y-6">
                <TabsList className="h-10">
                  <TabsTrigger value="history">
                    <Calendar className="w-4 h-4 mr-2" />
                    내전 기록
                  </TabsTrigger>
                  <TabsTrigger value="leaderboard">
                    <Medal className="w-4 h-4 mr-2" />
                    리더보드
                  </TabsTrigger>
                  <TabsTrigger value="monthly">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    월별 통계
                  </TabsTrigger>
                </TabsList>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4">
                  <div className="flex justify-end">
                    <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                      <SelectTrigger className="w-[140px] bg-muted/30">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="finished">완료</SelectItem>
                        <SelectItem value="upcoming">예정</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredScrims.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-12 text-center">
                        <Swords className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <p className="text-muted-foreground">내전 기록이 없습니다.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {filteredScrims.map((scrim) => (
                        <Link key={scrim.id} href={`/scrim/${scrim.id}`}>
                          <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[60px]">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(scrim.scheduledDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(scrim.scheduledDate).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                      variant="outline"
                                      className={
                                        scrim.status === "FINISHED" ? "border-green-500/50 text-green-500" :
                                        scrim.status === "IN_PROGRESS" ? "border-yellow-500/50 text-yellow-500 animate-pulse" :
                                        scrim.status === "SCHEDULED" ? "border-blue-500/50 text-blue-500" :
                                        "border-muted-foreground/50"
                                      }
                                    >
                                      {scrim.status === "FINISHED" ? "완료" :
                                       scrim.status === "IN_PROGRESS" ? "진행중" :
                                       scrim.status === "SCHEDULED" ? "예정" : "준비중"}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {scrim.recruitmentType === "AUCTION" ? "경매" :
                                       scrim.recruitmentType === "VOTE" ? "투표" : "일반"}
                                    </Badge>
                                  </div>
                                  <h3 className="font-bold text-foreground">{scrim.title}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {scrim.participantsCount || 0}명 참가
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {scrim.status === "FINISHED" && (
                                  <div className="text-center">
                                    <p className="text-2xl font-black">
                                      <span className={scrim.teamAScore > scrim.teamBScore ? "text-primary" : ""}>{scrim.teamAScore}</span>
                                      <span className="text-muted-foreground mx-1">:</span>
                                      <span className={scrim.teamBScore > scrim.teamAScore ? "text-primary" : ""}>{scrim.teamBScore}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">A vs B</p>
                                  </div>
                                )}
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Leaderboard Tab */}
                <TabsContent value="leaderboard" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" />
                        포인트 랭킹
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {playerStats.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">데이터가 없습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {playerStats.slice(0, 20).map((player) => (
                            <div
                              key={player.userId}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                player.rank <= 3 ? "bg-accent/10 border border-accent/30" : "bg-muted/20"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                                player.rank === 1 ? "bg-yellow-500 text-yellow-950" :
                                player.rank === 2 ? "bg-gray-400 text-gray-950" :
                                player.rank === 3 ? "bg-amber-600 text-amber-950" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {player.rank}
                              </div>
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={player.avatarUrl} />
                                <AvatarFallback className="bg-muted">{player.battleTag[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-bold text-foreground">{player.battleTag}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-primary">{player.totalPoints.toLocaleString()}P</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Monthly Stats Tab */}
                <TabsContent value="monthly" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        월별 내전 통계
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {monthlyStats.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">데이터가 없습니다.</p>
                      ) : (
                        <div className="space-y-4">
                          {monthlyStats.map((stat) => (
                            <div key={stat.month} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-foreground">{stat.month}</span>
                                <span className="text-sm text-muted-foreground">{stat.scrimCount}회 진행</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/20 rounded-lg p-3">
                                  <p className="text-xs text-muted-foreground">총 참가자</p>
                                  <p className="text-xl font-black text-foreground">{stat.totalParticipants}명</p>
                                </div>
                                <div className="bg-muted/20 rounded-lg p-3">
                                  <p className="text-xs text-muted-foreground">평균 참가</p>
                                  <p className="text-xl font-black text-foreground">{stat.averageParticipants}명</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
