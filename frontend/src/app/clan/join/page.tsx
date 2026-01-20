"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/common/components/ui/card"
import api from "@/lib/api"

interface Clan {
  id: string
  name: string
  tag: string
  description: string
}

export default function JoinClanPage() {
  const router = useRouter()
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
    try {
      await api.post(`/clans/${clanId}/join`)
      router.push("/")
    } catch (error) {
      console.error(error)
      alert("클랜 가입 실패")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">클랜 가입</h1>
        {isLoading ? (
          <p>로딩 중...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clans.map((clan) => (
              <Card key={clan.id}>
                <CardHeader>
                  <CardTitle>{clan.name} [{clan.tag}]</CardTitle>
                  <CardDescription>{clan.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button onClick={() => handleJoin(clan.id)} className="w-full">
                    가입 신청
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
