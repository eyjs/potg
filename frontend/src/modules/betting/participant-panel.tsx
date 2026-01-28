"use client"

import { useMemo } from "react"
import { Users, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BettingTicket {
  id: string
  userId: string
  prediction: "O" | "X"
  betAmount: number
  status: "PENDING" | "WON" | "LOST" | "CANCELLED"
  user?: {
    battleTag: string
    avatarUrl?: string
  }
}

export interface BettingQuestion {
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
  tickets?: BettingTicket[]
}

export function ParticipantPanel({ question }: { question: BettingQuestion }) {
  const tickets = question.tickets ?? []

  if (tickets.length === 0) {
    return (
      <div className="p-3 border border-border/50 rounded-lg text-center">
        <p className="text-xs text-muted-foreground font-bold">아직 참여자가 없습니다</p>
      </div>
    )
  }

  const oTickets = tickets.filter((t) => t.prediction === "O")
  const xTickets = tickets.filter((t) => t.prediction === "X")
  const oTotal = oTickets.reduce((sum, t) => sum + t.betAmount, 0)
  const xTotal = xTickets.reduce((sum, t) => sum + t.betAmount, 0)
  const totalAmount = oTotal + xTotal
  const oPercent = totalAmount > 0 ? (oTotal / totalAmount) * 100 : 50

  const isSettled = question.status === "SETTLED" && question.correctAnswer

  const sortedTickets = useMemo(() => {
    if (!isSettled) return tickets
    return [...tickets].sort((a, b) => {
      const aWon = a.prediction === question.correctAnswer ? 0 : 1
      const bWon = b.prediction === question.correctAnswer ? 0 : 1
      return aWon - bWon
    })
  }, [tickets, isSettled, question.correctAnswer])

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      {/* O vs X 요약 바 */}
      <div className="flex items-center text-xs font-bold border-b border-border/50">
        <div className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-accent/10 text-accent">
          <span className="font-black">O</span>
          <span>{oTickets.length}명</span>
          <span className="text-accent/70">{oTotal.toLocaleString('ko-KR')}P</span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-1.5 px-3 py-2 bg-destructive/10 text-destructive">
          <span className="text-destructive/70">{xTotal.toLocaleString('ko-KR')}P</span>
          <span>{xTickets.length}명</span>
          <span className="font-black">X</span>
        </div>
      </div>

      {/* 비율 프로그레스 바 */}
      <div className="flex h-1.5">
        <div
          className="bg-accent transition-all duration-300"
          style={{ width: `${oPercent}%` }}
        />
        <div
          className="bg-destructive transition-all duration-300"
          style={{ width: `${100 - oPercent}%` }}
        />
      </div>

      {/* 참여자 리스트 */}
      <div className="divide-y divide-border/30 max-h-48 overflow-y-auto">
        {sortedTickets.map((ticket) => {
          const isWinner = isSettled && ticket.prediction === question.correctAnswer
          const isLoser = isSettled && ticket.prediction !== question.correctAnswer
          const reward = isWinner
            ? Math.ceil(ticket.betAmount * question.rewardMultiplier)
            : 0

          return (
            <div
              key={ticket.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs",
                isWinner && "bg-green-500/5",
                isLoser && "bg-red-500/5"
              )}
            >
              {/* 상태 아이콘 */}
              {isSettled ? (
                isWinner ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )
              ) : (
                <span
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-sm font-black text-xs shrink-0",
                    ticket.prediction === "O"
                      ? "bg-accent/20 text-accent"
                      : "bg-destructive/20 text-destructive"
                  )}
                >
                  {ticket.prediction}
                </span>
              )}

              {/* 유저명 */}
              <span className={cn(
                "font-bold truncate flex-1",
                isWinner && "text-green-400",
                isLoser && "text-red-400/70",
                !isSettled && "text-foreground/80"
              )}>
                {ticket.user?.battleTag ?? "알 수 없음"}
              </span>

              {/* 베팅 예측 (정산 시) */}
              {isSettled && (
                <span
                  className={cn(
                    "font-black text-xs px-1 rounded-sm",
                    ticket.prediction === "O"
                      ? "bg-accent/20 text-accent"
                      : "bg-destructive/20 text-destructive"
                  )}
                >
                  {ticket.prediction}
                </span>
              )}

              {/* 금액 */}
              <span className={cn(
                "font-black tabular-nums shrink-0",
                isWinner && "text-green-400",
                isLoser && "text-red-400",
                !isSettled && "text-muted-foreground"
              )}>
                {isSettled
                  ? isWinner
                    ? `+${reward.toLocaleString('ko-KR')}P`
                    : `-${ticket.betAmount.toLocaleString('ko-KR')}P`
                  : `${ticket.betAmount.toLocaleString('ko-KR')}P`}
              </span>
            </div>
          )
        })}
      </div>

      {/* 총 참여 요약 */}
      <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-muted/20 border-t border-border/50 text-xs text-muted-foreground font-bold">
        <Users className="w-3 h-3" />
        <span>총 {tickets.length}명 참여 · {totalAmount.toLocaleString('ko-KR')}P</span>
      </div>
    </div>
  )
}
