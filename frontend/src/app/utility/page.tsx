"use client"

import { useState } from "react"
import { Shuffle, Map, ChevronRight } from "lucide-react"
import TeamShuffler from "@/modules/utility/components/team-shuffler"
import MapRandomizer from "@/modules/utility/components/map-randomizer"
import Link from "next/link"

type UtilityTool = "shuffle" | "map" | null

export default function UtilityPage() {
  const [activeTool, setActiveTool] = useState<UtilityTool>(null)

  const tools = [
    {
      id: "shuffle" as const,
      title: "팀 섞기",
      subtitle: "Team Shuffle",
      description: "참가자들을 랜덤하게 두 팀으로 나눕니다",
      icon: Shuffle,
      color: "bg-[#00c3ff]",
    },
    {
      id: "map" as const,
      title: "맵 추첨기",
      subtitle: "Map Randomizer",
      description: "오버워치 맵을 랜덤하게 선택합니다",
      icon: Map,
      color: "bg-[#f99e1a]",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      {/* Header */}
      <div className="border-b border-[#333] bg-[#1a1a1a]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-wider text-[#f99e1a]">Utility</h1>
              <p className="text-muted-foreground text-sm">유틸리티 도구 모음</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!activeTool ? (
          /* Tool Selection Grid */
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="group relative bg-[#1a1a1a] border border-[#333] hover:border-[#f99e1a] transition-all duration-300 overflow-hidden text-left"
              >
                {/* Skewed accent bar */}
                <div className={`absolute top-0 left-0 w-2 h-full ${tool.color} -skew-x-12 -translate-x-1`} />

                <div className="p-8 pl-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-4 ${tool.color} skew-btn`}>
                      <tool.icon className="w-8 h-8 text-black" />
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-[#f99e1a] group-hover:translate-x-1 transition-all" />
                  </div>

                  <h2 className="text-2xl font-black italic uppercase tracking-wide mb-1">{tool.title}</h2>
                  <p className="text-sm text-muted-foreground uppercase tracking-widest mb-3">{tool.subtitle}</p>
                  <p className="text-muted-foreground">{tool.description}</p>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#f99e1a]/0 to-[#f99e1a]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : (
          /* Active Tool View */
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setActiveTool(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>도구 선택으로 돌아가기</span>
            </button>

            {activeTool === "shuffle" && <TeamShuffler />}
            {activeTool === "map" && <MapRandomizer />}
          </div>
        )}
      </div>
    </div>
  )
}
