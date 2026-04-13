"use client"

import { useState } from "react"
import { Header } from "@/common/layouts/header"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import {
  useScrimRanking,
  useActivityRanking,
} from "@/modules/scrim-result/hooks/use-scrim-result"
import { ScrimRankingTable } from "@/modules/scrim-result/components/scrim-ranking-table"

type TabType = "activity" | "scrim"

export default function RankingPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("activity")

  const { data: activityRanking, isLoading: isActivityLoading } =
    useActivityRanking(user?.clanId)
  const { data: scrimRanking, isLoading: isScrimLoading } =
    useScrimRanking(user?.clanId)

  const tabs: { key: TabType; label: string }[] = [
    { key: "activity", label: "활동 포인트" },
    { key: "scrim", label: "내전 포인트" },
  ]

  const isLoading = activeTab === "activity" ? isActivityLoading : isScrimLoading

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter mb-6">
          랭킹
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/30 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-md text-sm font-bold transition-all",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-muted/20 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : activeTab === "activity" ? (
          <ScrimRankingTable
            rankings={activityRanking ?? []}
            pointField="totalPoints"
            pointLabel="활동"
          />
        ) : (
          <ScrimRankingTable
            rankings={scrimRanking ?? []}
            pointField="scrimPoints"
            pointLabel="내전"
          />
        )}
      </main>
    </div>
  )
}
