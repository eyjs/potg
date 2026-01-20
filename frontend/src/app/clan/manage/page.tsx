"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card"
import { AuthGuard } from "@/common/components/auth-guard"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { Check, X, User } from "lucide-react"

export default function ClanManagePage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    if (!user?.clanId) return
    try {
      const response = await api.get(`/clans/${user.clanId}/requests`)
      setRequests(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.clanId])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/clans/requests/${requestId}/${action}`)
      alert(action === 'approve' ? "승인되었습니다." : "거절되었습니다.")
      fetchRequests()
    } catch (error) {
      console.error(error)
      alert("처리 실패")
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />
        <main className="container px-4 py-8 max-w-4xl mx-auto space-y-8">
          <h1 className="text-3xl font-black italic uppercase tracking-wider text-foreground">
            클랜 <span className="text-primary">관리</span>
          </h1>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>가입 신청 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8">로딩 중...</p>
              ) : requests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">대기 중인 가입 신청이 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{req.user?.battleTag}</p>
                          <p className="text-sm text-muted-foreground">{req.message || "인사말 없음"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-primary text-primary-foreground font-bold"
                          onClick={() => handleAction(req.id, 'approve')}
                        >
                          <Check className="w-4 h-4 mr-1" /> 승인
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive border-destructive hover:bg-destructive/10 font-bold"
                          onClick={() => handleAction(req.id, 'reject')}
                        >
                          <X className="w-4 h-4 mr-1" /> 거절
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
