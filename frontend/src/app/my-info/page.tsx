"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/avatar"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { useRouter } from "next/navigation"

export default function MyInfoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    avatarUrl: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, avatarUrl: user.avatarUrl || "" }))
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
      alert("새 비밀번호가 일치하지 않습니다.")
      setIsLoading(false)
      return
    }

    try {
      const payload: any = {
        avatarUrl: formData.avatarUrl,
      }
      if (formData.newPassword) {
        payload.password = formData.newPassword
        payload.currentPassword = formData.currentPassword
      }

      await api.patch("/users/me", payload)
      alert("프로필이 업데이트되었습니다.")
      window.location.reload() // Refresh to update context
    } catch (error: any) {
      console.error(error)
      alert(error.response?.data?.message || "업데이트 실패")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveClan = async () => {
    if (!confirm("정말 클랜을 탈퇴하시겠습니까? 보유 포인트가 소멸될 수 있습니다.")) return
    
    try {
      await api.post("/clans/leave")
      alert("클랜에서 탈퇴했습니다.")
      router.push("/")
      window.location.reload()
    } catch (error: any) {
      console.error(error)
      alert(error.response?.data?.message || "탈퇴 실패")
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-8 max-w-2xl mx-auto space-y-8">
          <h1 className="text-3xl font-black italic uppercase tracking-wider text-foreground">
            내 <span className="text-primary">정보</span>
          </h1>

          {/* Profile Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24 border-2 border-primary">
                  <AvatarImage src={formData.avatarUrl} />
                  <AvatarFallback className="bg-muted text-2xl font-bold">
                    {user?.battleTag?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="w-full max-w-xs">
                  <Label>프로필 이미지 URL</Label>
                  <Input 
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({...formData, avatarUrl: e.target.value})}
                    placeholder="https://example.com/image.png"
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>아이디</Label>
                  <Input value={user?.username || ""} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label>배틀태그</Label>
                  <Input value={user?.battleTag || ""} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label>주 포지션</Label>
                  <Input value={user?.mainRole || ""} disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label>티어 (Rating)</Label>
                  <Input value={user?.rating?.toString() || ""} disabled className="bg-muted/50" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label>현재 비밀번호</Label>
                  <Input 
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                    placeholder="변경하려면 입력하세요"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <Label>새 비밀번호</Label>
                  <Input 
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <Label>새 비밀번호 확인</Label>
                  <Input 
                    type="password"
                    value={formData.confirmNewPassword}
                    onChange={(e) => setFormData({...formData, confirmNewPassword: e.target.value})}
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground font-bold">
                    저장하기
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Clan Info */}
          {user?.clanId && (
            <Card className="bg-card border-border border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">클랜 관리</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">현재 소속된 클랜에서 탈퇴합니다.</p>
                  <p className="text-xs text-muted-foreground">탈퇴 시 포인트가 초기화될 수 있습니다.</p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleLeaveClan}
                  className="font-bold"
                >
                  탈퇴하기
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
