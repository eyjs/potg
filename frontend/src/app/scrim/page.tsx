"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import api from "@/lib/api"
import { handleApiError } from "@/lib/api-error"
import { useAuth } from "@/context/auth-context"
import { Swords, Calendar, Users, ChevronRight, AlertCircle } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Scrim {
  id: string
  title: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  scheduledDate: string
  participantCount: number
  matchCount: number
}

export default function ScrimListPage() {
  const { user } = useAuth()
  const [scrims, setScrims] = useState<Scrim[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.clanId) {
      fetchScrims()
    } else {
      setIsLoading(false)
    }
  }, [user?.clanId])

  const fetchScrims = async () => {
    try {
      const response = await api.get(`/scrims?clanId=${user?.clanId}`)
      setScrims(response.data)
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-600 text-black"
      case "IN_PROGRESS":
        return "bg-green-600 text-white"
      case "COMPLETED":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "대기 중"
      case "IN_PROGRESS":
        return "진행 중"
      case "COMPLETED":
        return "완료"
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
          내전 데이터 로딩 중...
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-6 space-y-6">
          {/* 타이틀 */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
              <Swords className="text-black w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-foreground">
                내전 <span className="text-primary">SCRIM</span>
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Team Scrimmages</p>
            </div>
          </div>

          {/* 내전 목록 */}
          {scrims.length === 0 ? (
            <div className="bg-card border border-border border-dashed p-20 text-center rounded-lg">
              <AlertCircle className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground mb-2">등록된 내전이 없습니다.</p>
              <p className="text-xs text-muted-foreground">경매가 완료되면 내전이 자동 생성됩니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scrims.map((scrim) => (
                <Link key={scrim.id} href={`/scrim/${scrim.id}`}>
                  <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={cn("text-xs font-bold", getStatusColor(scrim.status))}>
                              {getStatusLabel(scrim.status)}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-bold text-foreground truncate">{scrim.title}</h3>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{scrim.scheduledDate ? new Date(scrim.scheduledDate).toLocaleDateString() : "미정"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{scrim.participantCount || 0}명 참가</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Swords className="w-4 h-4" />
                              <span>{scrim.matchCount || 0}경기</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
