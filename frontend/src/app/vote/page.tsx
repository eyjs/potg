"use client"

import { Header } from "@/common/layouts/header"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import { BarChart3, Calendar, Medal, TrendingUp } from "lucide-react"
import { useStatistics } from "@/modules/statistics/hooks/use-statistics"
import { SummaryCards } from "@/modules/statistics/components/summary-cards"
import { HistoryTab } from "@/modules/statistics/components/history-tab"
import { LeaderboardTab } from "@/modules/statistics/components/leaderboard-tab"
import { MonthlyTab } from "@/modules/statistics/components/monthly-tab"

export default function StatisticsPage() {
  const { user } = useAuth()
  const {
    scrims,
    playerStats,
    monthlyStats,
    isLoading,
    filter,
    setFilter,
    filteredScrims,
    finishedCount,
    totalParticipations,
  } = useStatistics({ clanId: user?.clanId })

  if (!user?.clanId) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background pb-20 md:pb-0">
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
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
              <BarChart3 className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                통계 <span className="text-primary">STATS</span>
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                Scrim Records & Analytics
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-primary font-bold animate-pulse">
              통계 로딩 중...
            </div>
          ) : (
            <>
              <SummaryCards
                totalScrims={scrims.length}
                finishedCount={finishedCount}
                playerCount={playerStats.length}
                totalParticipations={totalParticipations}
              />

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

                <TabsContent value="history">
                  <HistoryTab
                    filteredScrims={filteredScrims}
                    filter={filter}
                    onFilterChange={setFilter}
                  />
                </TabsContent>

                <TabsContent value="leaderboard">
                  <LeaderboardTab playerStats={playerStats} />
                </TabsContent>

                <TabsContent value="monthly">
                  <MonthlyTab monthlyStats={monthlyStats} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
