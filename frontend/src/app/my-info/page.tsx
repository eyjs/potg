"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { Badge } from "@/common/components/ui/badge"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/common/components/confirm-dialog"
import { handleApiError } from "@/lib/api-error"
import { User, Shield, LogOut, Wallet, ChevronRight } from "lucide-react"
import Link from "next/link"
import {
  ProfileBanner,
  CompetitiveRankCard,
  HeroStatsCard,
  CareerStatsCard,
  OverwatchProfile,
} from "@/modules/overwatch"
import { AccountSettingsCard, SecuritySettingsCard } from "@/modules/my-info"

export default function MyInfoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const confirm = useConfirm()
  const [clanDetails, setClanDetails] = useState<Record<string, unknown> | null>(null)
  const [owProfile, setOwProfile] = useState<OverwatchProfile | null>(null)
  const [owLoading, setOwLoading] = useState(true)

  useEffect(() => {
    if (user) {
      if (user.clanId) {
        fetchClanDetails(user.clanId)
      }
      fetchOwProfile()
    }
  }, [user])

  const fetchOwProfile = async () => {
    setOwLoading(true)
    try {
      const response = await api.get("/overwatch/profile/me")
      setOwProfile(response.data)
    } catch {
      setOwProfile(null)
    } finally {
      setOwLoading(false)
    }
  }

  const fetchClanDetails = async (clanId: string) => {
    try {
      const response = await api.get(`/clans/${clanId}`)
      setClanDetails(response.data)
    } catch (error) {
      handleApiError(error)
    }
  }

  const handleLeaveClan = async () => {
    const ok = await confirm({
      title: "정말 클랜을 탈퇴하시겠습니까?",
      description: "보유 포인트가 소멸되며 즉시 반영됩니다.",
      variant: "destructive",
      confirmText: "탈퇴",
    })
    if (!ok) return

    try {
      await api.post("/clans/leave")
      toast.success("클랜에서 탈퇴했습니다.")
      window.location.href = "/"
    } catch (error) {
      handleApiError(error, "탈퇴 실패")
    }
  }

  const handleProfileSuccess = () => {
    window.location.reload()
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-8 max-w-6xl mx-auto space-y-6">
          {/* 페이지 타이틀 */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
              <User className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                내 정보 <span className="text-primary">MY INFO</span>
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                Profile & Account Settings
              </p>
            </div>
          </div>

          {/* 프로필 배너 */}
          <ProfileBanner
            battleTag={user?.battleTag || "Unknown"}
            avatar={user?.avatarUrl}
            profile={owProfile}
            onSync={fetchOwProfile}
            isLoading={owLoading}
          />

          {/* 메인 그리드 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽 열: 랭크, 영웅, 통계 */}
            <div className="space-y-6">
              {/* 경쟁전 랭크 */}
              <CompetitiveRankCard competitive={owProfile?.competitiveRank} />

              {/* 주력 영웅 */}
              <HeroStatsCard topHeroes={owProfile?.topHeroes} />

              {/* 커리어 통계 */}
              <CareerStatsCard
                statsSummary={owProfile?.statsSummary}
                endorsementLevel={owProfile?.endorsementLevel || 0}
              />
            </div>

            {/* 오른쪽 열: 설정, 포인트, 클랜 */}
            <div className="space-y-6">
              {/* 계정 설정 */}
              <AccountSettingsCard
                username={user?.username || ""}
                battleTag={user?.battleTag || ""}
                avatarUrl={user?.avatarUrl || ""}
                onSuccess={handleProfileSuccess}
              />

              {/* 보안 설정 */}
              <SecuritySettingsCard />

              {/* 포인트 관리 */}
              <Card className="bg-card border-border border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-yellow-500" /> 포인트 관리
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 포인트 표시 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/30 p-3 rounded-md text-center border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">Total</p>
                        <p className="text-lg font-black italic text-foreground">
                          {(user?.totalPoints ?? 0).toLocaleString()}P
                        </p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-md text-center border border-yellow-500/30">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">
                          Available
                        </p>
                        <p className="text-lg font-black italic text-yellow-500">
                          {((user?.totalPoints ?? 0) - (user?.lockedPoints ?? 0)).toLocaleString()}P
                        </p>
                      </div>
                    </div>

                    {(user?.lockedPoints ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground uppercase font-bold">잠금 포인트</span>
                        <span className="font-bold text-orange-500">
                          {(user?.lockedPoints ?? 0).toLocaleString()}P
                        </span>
                      </div>
                    )}

                    <Link href="/wallet">
                      <Button
                        variant="outline"
                        className="w-full rounded-md font-bold h-10 gap-2 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                      >
                        포인트 전송 / 내역 <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* 소속 클랜 */}
              <Card className="bg-card border-border border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> 소속 클랜
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user?.clanId && clanDetails ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-muted/20 rounded-md border border-border/50">
                        <p className="text-lg font-black italic text-foreground mb-1">
                          {clanDetails.name as string}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                          멤버 {(clanDetails.members as unknown[])?.length || 0}명 · 마스터{" "}
                          {((
                            (clanDetails.members as Record<string, unknown>[])?.find(
                              (m) => m.role === "MASTER"
                            )?.user as Record<string, unknown>
                          )?.battleTag as string) || "미지정"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">운영진</p>
                        <div className="flex flex-wrap gap-1">
                          {(clanDetails.members as Record<string, unknown>[])
                            ?.filter((m) => m.role === "MASTER" || m.role === "MANAGER")
                            .slice(0, 3)
                            .map((m) => (
                              <Badge
                                key={m.id as string}
                                variant="outline"
                                className="text-[10px] border-primary/30 text-primary"
                              >
                                {(m.user as Record<string, unknown>)?.battleTag as string}
                              </Badge>
                            ))}
                          {(clanDetails.members as Record<string, unknown>[])?.filter(
                            (m) => m.role === "MASTER" || m.role === "MANAGER"
                          ).length > 3 && (
                            <span className="text-[10px] text-muted-foreground">...</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground uppercase font-bold">내 권한</span>
                        <span className="text-xs font-bold text-primary italic uppercase">
                          {user?.clanRole || "MEMBER"}
                        </span>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleLeaveClan}
                        className="w-full rounded-md font-bold h-10 gap-2"
                      >
                        <LogOut className="w-4 h-4" /> 클랜 탈퇴
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">소속된 클랜이 없습니다.</p>
                      <Button
                        onClick={() => router.push("/clan/join")}
                        className="w-full bg-primary text-black font-bold rounded-md"
                      >
                        클랜 찾기
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
