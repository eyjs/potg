"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { AuthGuard } from "@/common/components/auth-guard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import { SendPointsForm } from "@/modules/wallet/components/send-points-form"
import { TransactionHistory } from "@/modules/wallet/components/transaction-history"
import { Wallet, Send, History, Coins } from "lucide-react"
import api from "@/lib/api"
import { handleApiError } from "@/lib/api-error"
import { useAuth } from "@/context/auth-context"
import type { ClanMemberWithUser } from "@/modules/wallet/types"

export default function WalletPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("send")
  const [clanMembers, setClanMembers] = useState<ClanMemberWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (user?.clanId) {
      fetchClanMembers()
    } else {
      setIsLoading(false)
    }
  }, [user?.clanId])

  const fetchClanMembers = async () => {
    if (!user?.clanId) return
    setIsLoading(true)
    try {
      const response = await api.get(`/clans/${user.clanId}`)
      setClanMembers(response.data.members || [])
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
    // Refresh clan members to update points
    fetchClanMembers()
  }

  const userBalance = (user?.totalPoints ?? 0) - (user?.lockedPoints ?? 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
          지갑 데이터 로딩 중...
        </div>
      </div>
    )
  }

  if (!user?.clanId) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#0B0B0B]">
          <Header />
          <div className="container px-4 py-20 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h2 className="text-xl font-bold text-foreground">
              클랜에 가입해야 지갑을 이용할 수 있습니다
            </h2>
            <p className="text-muted-foreground mt-2">
              클랜에 가입하면 포인트 전송 및 내역 조회가 가능합니다
            </p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-6 space-y-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary skew-btn flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-foreground">
                  포인트 <span className="text-primary">지갑</span>
                </h1>
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
                  CLAN WALLET & TRANSFER
                </p>
              </div>
            </div>

            {/* Balance Display */}
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-card border border-border rounded-sm">
                <span className="text-xs text-muted-foreground uppercase font-bold block">
                  총 포인트
                </span>
                <span className="text-xl font-black italic text-foreground">
                  {(user?.totalPoints ?? 0).toLocaleString()}P
                </span>
              </div>
              <div className="px-4 py-2 bg-card border border-primary/50 rounded-sm">
                <span className="text-xs text-muted-foreground uppercase font-bold block">
                  가용 포인트
                </span>
                <span className="text-xl font-black italic text-primary">
                  {userBalance.toLocaleString()}P
                </span>
              </div>
              {(user?.lockedPoints ?? 0) > 0 && (
                <div className="px-4 py-2 bg-card border border-border rounded-sm">
                  <span className="text-xs text-muted-foreground uppercase font-bold block">
                    잠금 포인트
                  </span>
                  <span className="text-xl font-black italic text-yellow-500">
                    {(user?.lockedPoints ?? 0).toLocaleString()}P
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue="send"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="p-1 h-auto w-full md:w-auto">
              <TabsTrigger
                value="send"
                className="flex-1 md:flex-none px-6 py-3 gap-2"
              >
                <Send className="w-4 h-4" />
                포인트 전송
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex-1 md:flex-none px-6 py-3 gap-2"
              >
                <History className="w-4 h-4" />
                거래 내역
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send" className="mt-6">
              <div className="max-w-lg">
                <SendPointsForm
                  clanMembers={clanMembers}
                  currentUserId={user.id}
                  clanId={user.clanId}
                  userBalance={userBalance}
                  onSendSuccess={handleSendSuccess}
                />
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <TransactionHistory
                clanId={user.clanId}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
          </Tabs>

          {/* Info Banner */}
          <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Coins className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-black italic uppercase text-lg text-foreground mb-1">
                포인트 안내
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                포인트는 내전 승리, 베팅 적중 등을 통해 획득할 수 있습니다.
                <br />
                획득한 포인트는 클랜원에게 선물하거나 상점에서 사용할 수 있습니다.
                <br />
                베팅 중인 포인트는 잠금 상태로 표시되며, 결과 확정 후 정산됩니다.
              </p>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
