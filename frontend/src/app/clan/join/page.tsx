"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/common/components/ui/card"
import api from "@/lib/api"

import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

interface Clan {
  id: string
  name: string
  tag: string
  description: string
}

export default function JoinClanPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clans, setClans] = useState<Clan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchClans()
  }, [])

  const fetchClans = async () => {
    try {
      const response = await api.get('/clans')
      setClans(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoin = async (clanId: string) => {
    if (!confirm("이 클랜에 가입 신청을 하시겠습니까?")) return
    try {
      await api.post(`/clans/${clanId}/join`)
      alert("가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.")
      router.push("/")
    } catch (error: any) {
      console.error(error)
      alert(error.response?.data?.message || "클랜 가입 실패")
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Header />
      <main className="container px-4 py-8">
        <h1 className="text-3xl font-black italic uppercase tracking-wider text-foreground mb-8">
          클랜 <span className="text-primary">목록</span>
        </h1>
        
        {isLoading ? (
          <div className="text-center py-20 animate-pulse text-primary font-bold">클랜 정보 불러오는 중...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clans.map((clan) => {
              const isMyClan = user?.clanId === clan.id
              const hasClan = !!user?.clanId

              return (
                <Card key={clan.id} className="bg-card border-border hover:border-primary/50 transition-all">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      {clan.name} <span className="text-primary">[{clan.tag}]</span>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground line-clamp-2">
                      {clan.description || "설명이 없습니다."}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    {isMyClan ? (
                      <Button className="w-full bg-muted text-muted-foreground cursor-not-allowed rounded-md font-bold" disabled>
                        내 클랜
                      </Button>
                    ) : hasClan ? (
                      <Button className="w-full bg-muted/50 text-muted-foreground cursor-not-allowed rounded-md font-bold" disabled title="이미 다른 클랜에 소속되어 있습니다.">
                        가입 불가
                      </Button>
                    ) : (
                      <Button onClick={() => handleJoin(clan.id)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-bold">
                        가입 신청
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
