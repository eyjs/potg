"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight, ArrowDownLeft, Gift, Clock } from "lucide-react"
import api from "@/lib/api"
import type { PointLog, ParsedTransaction } from "../types"

interface TransactionHistoryProps {
  clanId: string
  refreshTrigger: number
}

function parseReason(reason: string): ParsedTransaction {
  if (reason.startsWith("SEND_TO:")) {
    const parts = reason.replace("SEND_TO:", "").split(" - ")
    return {
      type: "send",
      targetUserId: parts[0],
      message: parts[1] || "",
    }
  }
  if (reason.startsWith("RECEIVE_FROM:")) {
    const parts = reason.replace("RECEIVE_FROM:", "").split(" - ")
    return {
      type: "receive",
      targetUserId: parts[0],
      message: parts[1] || "",
    }
  }
  // Handle other reason types
  if (reason.startsWith("SCRIM_WIN:")) {
    return { type: "other", message: "내전 승리 보상" }
  }
  if (reason.startsWith("BETTING_WIN:")) {
    return { type: "other", message: "베팅 적중" }
  }
  if (reason.startsWith("BETTING_LOSS:")) {
    return { type: "other", message: "베팅 실패" }
  }
  if (reason.startsWith("SHOP_PURCHASE:")) {
    return { type: "other", message: "상점 구매" }
  }
  return { type: "other", message: reason }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString("ko-KR")
}

export function TransactionHistory({
  clanId,
  refreshTrigger,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<PointLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (clanId) {
      fetchHistory()
    }
  }, [clanId, refreshTrigger])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/wallet/history?clanId=${clanId}`)
      setTransactions(response.data)
    } catch (error) {
      console.error("Failed to fetch transaction history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-primary font-bold uppercase italic animate-pulse">
        거래 내역 로딩 중...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center border-2 border-dashed border-border/30 rounded-lg">
        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
        <h3 className="font-bold italic uppercase text-foreground">
          거래 내역이 없습니다
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          포인트 전송, 베팅, 내전 참여 시 내역이 표시됩니다
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const parsed = parseReason(tx.reason)
        const isPositive = tx.amount > 0

        return (
          <div
            key={tx.id}
            className="p-4 bg-card border border-border rounded-lg flex items-center gap-4"
          >
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isPositive
                  ? "bg-green-500/10 text-green-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {parsed.type === "send" ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : parsed.type === "receive" ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <Gift className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-foreground">
                {parsed.type === "send"
                  ? "포인트 전송"
                  : parsed.type === "receive"
                    ? "포인트 수신"
                    : parsed.message}
              </div>
              {parsed.message && parsed.type !== "other" && (
                <div className="text-xs text-muted-foreground truncate">
                  {parsed.message}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatRelativeTime(tx.createdAt)}
              </div>
            </div>

            {/* Amount */}
            <div
              className={`text-lg font-black italic shrink-0 ${
                isPositive ? "text-green-500" : "text-destructive"
              }`}
            >
              {isPositive ? "+" : ""}
              {tx.amount.toLocaleString()}P
            </div>
          </div>
        )
      })}
    </div>
  )
}
