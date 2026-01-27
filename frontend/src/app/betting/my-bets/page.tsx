"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { Coins, Clock, AlertCircle, ArrowLeft, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { useRouter } from "next/navigation"
import { handleApiError } from "@/lib/api-error"

interface BettingTicket {
  id: string
  questionId: string
  userId: string
  clanId: string
  prediction: "O" | "X"
  betAmount: number
  status: "PENDING" | "WON" | "LOST" | "CANCELLED"
  createdAt: string
  question: {
    id: string
    question: string
    status: "OPEN" | "CLOSED" | "SETTLED"
    correctAnswer?: "O" | "X"
    rewardMultiplier: number
    createdAt: string
  }
}

export default function MyBetsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tickets, setTickets] = useState<BettingTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "won" | "lost">("all")

  useEffect(() => {
    fetchMyBets()
  }, [])

  const fetchMyBets = async () => {
    try {
      const response = await api.get('/betting/tickets/my')
      setTickets(response.data)
    } catch (error) {
      handleApiError(error, "베팅 내역을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500"
      case "WON":
        return "bg-green-500/10 text-green-500 border-green-500"
      case "LOST":
        return "bg-red-500/10 text-red-500 border-red-500"
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-500 border-gray-500"
      default:
        return "bg-muted/10 text-muted-foreground border-muted"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "진행 중"
      case "WON":
        return "당첨"
      case "LOST":
        return "낙첨"
      case "CANCELLED":
        return "취소됨"
      default:
        return status
    }
  }

  const calculateReward = (ticket: BettingTicket) => {
    if (ticket.status === "WON") {
      return Math.ceil(ticket.betAmount * ticket.question.rewardMultiplier)
    }
    return 0
  }

  const filteredTickets = tickets.filter(ticket => {
    if (filter === "all") return true
    return ticket.status.toLowerCase() === filter
  })

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === "PENDING").length,
    won: tickets.filter(t => t.status === "WON").length,
    lost: tickets.filter(t => t.status === "LOST").length,
    totalBet: tickets.reduce((sum, t) => sum + t.betAmount, 0),
    totalWon: tickets.filter(t => t.status === "WON").reduce((sum, t) => sum + calculateReward(t), 0),
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-6xl mx-auto space-y-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/betting")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            베팅 페이지로
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
              <Coins className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                내 베팅 <span className="text-primary">MY BETS</span>
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Betting History</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-primary">{stats.total}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase mt-1">총 베팅</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-yellow-500">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase mt-1">진행 중</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-green-500">{stats.won}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase mt-1">당첨</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-red-500">{stats.lost}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase mt-1">낙첨</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-bold">총 베팅 금액</span>
                  <span className="text-xl font-black text-foreground">{stats.totalBet}P</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-bold">총 획득 포인트</span>
                  <span className="text-xl font-black text-primary">{stats.totalWon}P</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-primary text-black" : ""}
            >
              전체 ({stats.total})
            </Button>
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
              className={filter === "pending" ? "bg-primary text-black" : ""}
            >
              진행 중 ({stats.pending})
            </Button>
            <Button
              variant={filter === "won" ? "default" : "outline"}
              onClick={() => setFilter("won")}
              className={filter === "won" ? "bg-primary text-black" : ""}
            >
              당첨 ({stats.won})
            </Button>
            <Button
              variant={filter === "lost" ? "default" : "outline"}
              onClick={() => setFilter("lost")}
              className={filter === "lost" ? "bg-primary text-black" : ""}
            >
              낙첨 ({stats.lost})
            </Button>
          </div>

          {/* Bets List */}
          {isLoading ? (
            <div className="text-center py-20 text-primary font-bold flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              베팅 내역 로딩 중...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-card border border-border border-dashed p-20 text-center rounded-lg">
              <AlertCircle className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">
                {filter === "all" ? "베팅 내역이 없습니다." : `${getStatusLabel(filter.toUpperCase())} 베팅이 없습니다.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="bg-card border-border overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={getStatusColor(ticket.status)}>
                            {getStatusLabel(ticket.status)}
                          </Badge>
                          {ticket.question.status === "SETTLED" && ticket.question.correctAnswer && (
                            <Badge variant="secondary" className="text-xs">
                              정답: {ticket.question.correctAnswer}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold">{ticket.question.question}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">내 예측</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-black ${ticket.prediction === 'O' ? 'text-ow-blue' : 'text-destructive'}`}>
                            {ticket.prediction}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">베팅 금액</span>
                        <span className="text-lg font-black text-foreground">{ticket.betAmount}P</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">배율</span>
                        <span className="text-lg font-black text-primary">x{ticket.question.rewardMultiplier}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">
                          {ticket.status === "WON" ? "획득" : ticket.status === "PENDING" ? "예상 수령" : "손실"}
                        </span>
                        <div className="flex items-center gap-1">
                          {ticket.status === "WON" && (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-lg font-black text-green-500">+{calculateReward(ticket)}P</span>
                            </>
                          )}
                          {ticket.status === "PENDING" && (
                            <span className="text-lg font-black text-yellow-500">{calculateReward(ticket) || Math.ceil(ticket.betAmount * ticket.question.rewardMultiplier)}P</span>
                          )}
                          {ticket.status === "LOST" && (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-lg font-black text-red-500">-{ticket.betAmount}P</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
