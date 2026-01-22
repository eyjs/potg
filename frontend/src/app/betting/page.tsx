"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { Coins, Clock, AlertCircle, Plus, TrendingUp, History } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface BettingQuestion {
  id: string
  scrimId?: string
  creatorId: string
  question: string
  status: "OPEN" | "CLOSED" | "SETTLED"
  correctAnswer?: "O" | "X"
  bettingDeadline?: string
  minBetAmount: number
  rewardMultiplier: number
  createdAt: string
}

export default function BettingPage() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<BettingQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false)
  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<BettingQuestion | null>(null)
  const [betPrediction, setBetPrediction] = useState<"O" | "X">("O")
  const [betAmount, setBetAmount] = useState("100")
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    minBetAmount: 100,
    rewardMultiplier: 2.0,
    bettingDeadline: ""
  })

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/betting/questions')
      setQuestions(response.data)
    } catch (error) {
      console.error(error)
      toast.error("베팅 문항을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateQuestion = async () => {
    if (!newQuestion.question.trim()) {
      toast.error("베팅 문항을 입력하세요.")
      return
    }

    try {
      await api.post('/betting/questions', {
        question: newQuestion.question,
        minBetAmount: newQuestion.minBetAmount,
        rewardMultiplier: newQuestion.rewardMultiplier,
        bettingDeadline: newQuestion.bettingDeadline ? new Date(newQuestion.bettingDeadline).toISOString() : null
      })

      toast.success("베팅 문항이 생성되었습니다.")
      setIsCreateDialogOpen(false)
      setNewQuestion({
        question: "",
        minBetAmount: 100,
        rewardMultiplier: 2.0,
        bettingDeadline: ""
      })
      fetchQuestions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "베팅 문항 생성에 실패했습니다.")
    }
  }

  const handlePlaceBet = async () => {
    if (!selectedQuestion || !user?.clanId) return

    const amount = Number(betAmount)
    if (isNaN(amount) || amount < selectedQuestion.minBetAmount) {
      toast.error(`최소 베팅 금액은 ${selectedQuestion.minBetAmount}P 입니다.`)
      return
    }

    try {
      await api.post(`/betting/questions/${selectedQuestion.id}/bet`, {
        prediction: betPrediction,
        amount: amount,
        clanId: user.clanId
      })

      toast.success(`${betPrediction}에 ${amount}P를 베팅했습니다!`)
      setIsBetDialogOpen(false)
      setBetAmount("100")
      fetchQuestions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "베팅에 실패했습니다.")
    }
  }

  const handleSettleQuestion = async (result: "O" | "X") => {
    if (!selectedQuestion) return

    try {
      await api.post(`/betting/questions/${selectedQuestion.id}/settle`, { result })
      toast.success(`베팅이 ${result}로 정산되었습니다.`)
      setIsSettleDialogOpen(false)
      fetchQuestions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "정산에 실패했습니다.")
    }
  }

  const openBetDialog = (question: BettingQuestion, prediction: "O" | "X") => {
    setSelectedQuestion(question)
    setBetPrediction(prediction)
    setBetAmount(question.minBetAmount.toString())
    setIsBetDialogOpen(true)
  }

  const openSettleDialog = (question: BettingQuestion) => {
    setSelectedQuestion(question)
    setIsSettleDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-600 text-white border-green-500"
      case "CLOSED":
        return "bg-ow-orange text-black border-ow-orange"
      case "SETTLED":
        return "bg-accent text-black border-accent"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "OPEN":
        return "진행 중"
      case "CLOSED":
        return "마감됨"
      case "SETTLED":
        return "정산 완료"
      default:
        return status
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0 text-foreground">
        <Header />
        <main className="container px-4 py-8 max-w-5xl mx-auto space-y-8">
          <div className="space-y-4">
            {/* 타이틀 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                <Coins className="text-black w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-foreground">
                  베팅 <span className="text-primary">BETTING</span>
                </h1>
                <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Predict and Win Points</p>
              </div>
            </div>

            {/* 기능 버튼 */}
            <div className={cn("grid gap-2", user?.role === "ADMIN" ? "grid-cols-2" : "grid-cols-1")}>
              <Link href="/betting/my-bets">
                <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10 font-bold text-sm">
                  <History className="w-4 h-4 mr-2" />
                  내 베팅 내역
                </Button>
              </Link>
              {user?.role === "ADMIN" && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-black font-bold text-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    베팅 문항 생성
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">새 베팅 문항 생성</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="question">베팅 문항 (O/X 질문)</Label>
                      <Input
                        id="question"
                        placeholder="예: 이번 스크림에서 우리 팀이 승리할 것이다"
                        value={newQuestion.question}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                        className="bg-[#050505] border-border focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minBet">최소 베팅 금액 (P)</Label>
                        <Input
                          id="minBet"
                          type="number"
                          min="100"
                          step="100"
                          value={newQuestion.minBetAmount}
                          onChange={(e) => setNewQuestion({ ...newQuestion, minBetAmount: Number(e.target.value) })}
                          className="bg-[#050505] border-border focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="multiplier">보상 배율</Label>
                        <Input
                          id="multiplier"
                          type="number"
                          min="1"
                          step="0.1"
                          value={newQuestion.rewardMultiplier}
                          onChange={(e) => setNewQuestion({ ...newQuestion, rewardMultiplier: Number(e.target.value) })}
                          className="bg-[#050505] border-border focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deadline">베팅 마감 시간 (선택)</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={newQuestion.bettingDeadline}
                        onChange={(e) => setNewQuestion({ ...newQuestion, bettingDeadline: e.target.value })}
                        className="bg-[#050505] border-border focus:border-primary"
                      />
                    </div>

                    <Button
                      onClick={handleCreateQuestion}
                      className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                    >
                      생성
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-primary font-bold animate-pulse">베팅 문항 로딩 중...</div>
          ) : questions.length === 0 ? (
            <div className="bg-card border border-border border-dashed p-20 text-center rounded-lg">
              <AlertCircle className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground mb-4">진행 중인 베팅 문항이 없습니다.</p>
              {user?.role === "ADMIN" && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-black font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 베팅 문항 만들기
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {questions.map((q) => (
                <Card key={q.id} className="bg-card border-border overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={cn("px-2 py-0.5 rounded-sm font-black", getStatusColor(q.status))}>
                        {getStatusLabel(q.status)}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                        <Clock className="w-3 h-3" /> {new Date(q.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold italic text-foreground">{q.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1 font-bold">최소 베팅</span>
                        <span className="text-primary font-black text-lg">{q.minBetAmount}P</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1 font-bold">보상 배율</span>
                        <span className="text-primary font-black text-lg">x{q.rewardMultiplier}</span>
                      </div>
                    </div>

                    {q.status === "SETTLED" && q.correctAnswer && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
                        <span className="text-sm text-muted-foreground font-bold">정답: </span>
                        <span className="text-2xl font-black text-primary">{q.correctAnswer}</span>
                      </div>
                    )}

                    {q.status === "OPEN" ? (
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={() => openBetDialog(q, 'O')}
                          className="h-16 text-2xl font-black bg-accent hover:bg-accent/90 text-black rounded-md"
                        >
                          O
                        </Button>
                        <Button
                          onClick={() => openBetDialog(q, 'X')}
                          className="h-16 text-2xl font-black bg-destructive hover:bg-destructive/90 text-white rounded-md"
                        >
                          X
                        </Button>
                      </div>
                    ) : user?.role === "ADMIN" && q.status === "CLOSED" ? (
                      <Button
                        onClick={() => openSettleDialog(q)}
                        className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        정산하기
                      </Button>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm font-bold bg-muted/20 rounded-md">
                        {q.status === "CLOSED" ? "정산 대기 중" : "정산 완료"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Bet Dialog */}
        <Dialog open={isBetDialogOpen} onOpenChange={setIsBetDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                <span className={cn("px-2 py-1 rounded mx-1", betPrediction === 'O' ? "bg-accent text-black" : "bg-destructive text-white")}>
                  {betPrediction}
                </span>
                에 베팅하기
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <p className="text-sm font-bold mb-2">{selectedQuestion?.question}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>보상 배율</span>
                  <span className="text-primary font-black">x{selectedQuestion?.rewardMultiplier}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="betAmount" className="font-bold">베팅 금액 (P)</Label>
                <Input
                  id="betAmount"
                  type="number"
                  min={selectedQuestion?.minBetAmount || 100}
                  step="100"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="bg-[#050505] border-border focus:border-primary h-12 text-lg font-black"
                />
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs text-muted-foreground">
                    최소 베팅: <span className="font-bold">{selectedQuestion?.minBetAmount}P</span>
                  </p>
                  {selectedQuestion && Number(betAmount) >= selectedQuestion.minBetAmount && (
                    <p className="text-xs text-primary font-black">
                      예상 수령: {Math.floor(Number(betAmount) * selectedQuestion.rewardMultiplier)}P
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handlePlaceBet}
                disabled={!betAmount || Number(betAmount) < (selectedQuestion?.minBetAmount || 100)}
                className="w-full bg-primary hover:bg-primary/90 text-black font-black text-lg h-14 skew-btn"
              >
                베팅하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settle Dialog */}
        <Dialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary">베팅 정산</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <p className="font-bold mb-2">{selectedQuestion?.question}</p>
              </div>

              <p className="text-sm text-muted-foreground font-bold italic">최종 결과를 선택하면 포인트가 즉시 정산됩니다.</p>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleSettleQuestion('O')}
                  className="h-20 text-3xl font-black bg-accent hover:bg-accent/90 text-black rounded-md"
                >
                  O
                </Button>
                <Button
                  onClick={() => handleSettleQuestion('X')}
                  className="h-20 text-3xl font-black bg-destructive hover:bg-destructive/90 text-white rounded-md"
                >
                  X
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}
