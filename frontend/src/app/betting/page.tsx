"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { Coins, Trophy, Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/common/components/ui/badge"

export default function BettingPage() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/betting/questions')
      setQuestions(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBet = async (questionId: string, prediction: 'O' | 'X') => {
    const amount = prompt("베팅할 금액을 입력하세요 (최소 100P):", "100")
    if (!amount || isNaN(Number(amount)) || Number(amount) < 100) {
      alert("올바른 금액을 입력하세요.")
      return
    }

    try {
      await api.post(`/betting/questions/${questionId}/bet`, {
        prediction,
        betAmount: Number(amount)
      })
      alert("베팅이 완료되었습니다!")
      fetchQuestions()
    } catch (error: any) {
      alert(error.response?.data?.message || "베팅 실패")
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
                <Coins className="text-black w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                  베팅 <span className="text-primary">BETTING</span>
                </h1>
                <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Predict and Win Points</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-primary font-bold animate-pulse">베팅 문항 로딩 중...</div>
          ) : questions.length === 0 ? (
            <div className="bg-card border border-border border-dashed p-20 text-center rounded-lg">
              <AlertCircle className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">진행 중인 베팅 문항이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {questions.map((q) => (
                <Card key={q.id} className="bg-card border-border overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="border-primary text-primary font-bold">
                        {q.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                        <Clock className="w-3 h-3" /> {new Date(q.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold italic">{q.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">보상 배율</span>
                      <span className="text-primary font-black">x{q.rewardMultiplier}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        onClick={() => handleBet(q.id, 'O')}
                        className="h-16 text-2xl font-black bg-ow-blue hover:bg-ow-blue/90 text-black rounded-md"
                        disabled={q.status !== 'OPEN'}
                      >
                        O
                      </Button>
                      <Button 
                        onClick={() => handleBet(q.id, 'X')}
                        className="h-16 text-2xl font-black bg-destructive hover:bg-destructive/90 text-white rounded-md"
                        disabled={q.status !== 'OPEN'}
                      >
                        X
                      </Button>
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
