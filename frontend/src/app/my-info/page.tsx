"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/common/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { Badge } from "@/common/components/ui/badge"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { useRouter } from "next/navigation"
import { User, Shield, Lock, LogOut, Camera, Save, Wallet, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function MyInfoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    battleTag: "",
    avatarUrl: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  })
  const [clanDetails, setClanDetails] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        battleTag: user.battleTag || "",
        avatarUrl: user.avatarUrl || ""
      }))
      if (user.clanId) {
        fetchClanDetails(user.clanId)
      }
    }
  }, [user])

  const fetchClanDetails = async (clanId: string) => {
    try {
      const response = await api.get(`/clans/${clanId}`)
      setClanDetails(response.data)
    } catch (error) {
      console.error("Failed to fetch clan details:", error)
    }
  }

  const getTier = (rating: number = 0) => {
    if (rating >= 4500) return "Champion"
    if (rating >= 4000) return "Grandmaster"
    if (rating >= 3500) return "Master"
    if (rating >= 3000) return "Diamond"
    if (rating >= 2500) return "Platinum"
    if (rating >= 2000) return "Gold"
    if (rating >= 1500) return "Silver"
    return "Bronze"
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload: Record<string, string> = {
        battleTag: formData.battleTag,
        avatarUrl: formData.avatarUrl,
      }
      
      await api.patch("/users/me", payload)
      alert("프로필 정보가 저장되었습니다.")
      window.location.reload()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || "저장 실패")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.newPassword) return
    if (formData.newPassword !== formData.confirmNewPassword) {
      alert("새 비밀번호가 일치하지 않습니다.")
      return
    }

    setIsLoading(true)
    try {
      await api.patch("/users/me", {
        password: formData.newPassword,
        currentPassword: formData.currentPassword
      })
      alert("비밀번호가 변경되었습니다.")
      setFormData(p => ({ ...p, currentPassword: "", newPassword: "", confirmNewPassword: "" }))
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || "비밀번호 변경 실패")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveClan = async () => {
    if (!confirm("정말 클랜을 탈퇴하시겠습니까? 보유 포인트가 소멸되며 즉시 반영됩니다.")) return
    
    try {
      await api.post("/clans/leave")
      alert("클랜에서 탈퇴했습니다.")
      window.location.href = "/"
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || "탈퇴 실패")
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-8 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
              <User className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                설정 <span className="text-primary">SETTINGS</span>
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Account & Profile Management</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar / Profile Summary */}
            <div className="space-y-6">
              <Card className="bg-card border-border overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20" />
                <CardContent className="pt-0 -mt-12 flex flex-col items-center">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 border-4 border-[#0B0B0B] shadow-xl">
                      <AvatarImage src={formData.avatarUrl} />
                      <AvatarFallback className="bg-muted text-2xl font-bold">{user?.battleTag?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-foreground italic uppercase">{user?.battleTag}</h2>
                  <p className="text-primary text-sm font-bold uppercase tracking-widest">{user?.role}</p>
                  
                  <div className="w-full grid grid-cols-2 gap-2 mt-6">
                    <div className="bg-muted/30 p-3 rounded-md text-center border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Tier</p>
                      <p className="text-lg font-black italic text-foreground">{getTier(user?.rating)}</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-md text-center border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Position</p>
                      <p className="text-lg font-black italic text-primary">{user?.mainRole}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Point Management Section */}
              <Card className="bg-card border-border border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-yellow-500" /> 포인트 관리
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Balance Display */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/30 p-3 rounded-md text-center border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">Total</p>
                        <p className="text-lg font-black italic text-foreground">
                          {(user?.totalPoints ?? 0).toLocaleString()}P
                        </p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-md text-center border border-yellow-500/30">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">Available</p>
                        <p className="text-lg font-black italic text-yellow-500">
                          {((user?.totalPoints ?? 0) - (user?.lockedPoints ?? 0)).toLocaleString()}P
                        </p>
                      </div>
                    </div>

                    {(user?.lockedPoints ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground uppercase font-bold">잠금 포인트</span>
                        <span className="font-bold text-orange-500">{(user?.lockedPoints ?? 0).toLocaleString()}P</span>
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

              {/* Clan Section */}
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
                        <p className="text-lg font-black italic text-foreground mb-1">{clanDetails.name as string}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                          멤버 {(clanDetails.members as unknown[])?.length || 0}명 · 마스터 {(clanDetails.owner as Record<string, unknown>)?.nickname as string || (clanDetails.owner as Record<string, unknown>)?.username as string || "미지정"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">운영진</p>
                        <div className="flex flex-wrap gap-1">
                          {(clanDetails.members as Record<string, unknown>[])?.filter((m) => m.role === 'ADMIN' || m.role === 'OWNER').slice(0, 3).map((m) => (
                            <Badge key={m.id as string} variant="outline" className="text-[10px] border-primary/30 text-primary">
                              {(m.user as Record<string, unknown>)?.nickname as string || (m.user as Record<string, unknown>)?.username as string}
                            </Badge>
                          ))}
                          {(clanDetails.members as Record<string, unknown>[])?.filter((m) => m.role === 'ADMIN' || m.role === 'OWNER').length > 3 && (
                            <span className="text-[10px] text-muted-foreground">...</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground uppercase font-bold">내 권한</span>
                        <span className="text-xs font-bold text-primary italic uppercase">{user?.role}</span>
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
                      <Button onClick={() => router.push("/clan/join")} className="w-full bg-primary text-black font-bold rounded-md">
                        클랜 찾기
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content Areas */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Modification */}
              <Card className="bg-card border-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Save className="w-5 h-5 text-primary" /> 프로필 수정
                  </CardTitle>
                  <CardDescription>공개적으로 표시되는 정보를 변경합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">아이디 (변경 불가)</Label>
                        <Input value={user?.username || ""} disabled className="bg-muted/20 border-border/50 opacity-50" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="battleTag" className="text-xs uppercase font-bold text-primary">배틀태그</Label>
                        <Input 
                          id="battleTag"
                          value={formData.battleTag}
                          onChange={(e) => setFormData({...formData, battleTag: e.target.value})}
                          className="bg-input border-border focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avatarUrl" className="text-xs uppercase font-bold text-primary">프로필 이미지 URL</Label>
                      <Input 
                        id="avatarUrl"
                        value={formData.avatarUrl}
                        onChange={(e) => setFormData({...formData, avatarUrl: e.target.value})}
                        placeholder="https://..."
                        className="bg-input border-border focus:border-primary transition-all"
                      />
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={isLoading} className="bg-primary text-black font-black uppercase px-8 rounded-md h-11 transition-transform active:scale-95">
                        변경사항 저장
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Password Change */}
              <Card className="bg-card border-border shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-ow-blue" /> 보안 설정
                  </CardTitle>
                  <CardDescription>계정의 비밀번호를 안전하게 변경합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-ow-blue">현재 비밀번호</Label>
                      <Input 
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                        className="bg-input border-border focus:border-ow-blue"
                        placeholder="현재 비밀번호 입력"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-ow-blue">새 비밀번호</Label>
                        <Input 
                          type="password"
                        value={formData.newPassword}
                          onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                          className="bg-input border-border focus:border-ow-blue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-ow-blue">새 비밀번호 확인</Label>
                        <Input 
                          type="password"
                        value={formData.confirmNewPassword}
                          onChange={(e) => setFormData({...formData, confirmNewPassword: e.target.value})}
                          className="bg-input border-border focus:border-ow-blue"
                        />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={isLoading || !formData.newPassword} className="bg-ow-blue text-black font-black uppercase px-8 rounded-md h-11 transition-transform active:scale-95">
                        비밀번호 업데이트
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
