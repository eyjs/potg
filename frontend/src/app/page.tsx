"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Gavel, Wrench, Shield, ChevronRight } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { Header } from "@/common/layouts/header"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAdmin } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace("/login")
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold animate-pulse uppercase italic tracking-widest">
        접속 확인 중...
      </div>
    )
  }

  const cards: {
    href: string
    title: string
    subtitle: string
    icon: typeof Gavel
    accent: string
  }[] = [
    {
      href: "/auction",
      title: "경매",
      subtitle: "실시간 경매 진행 · 참여",
      icon: Gavel,
      accent: "bg-primary",
    },
    {
      href: "/utility",
      title: "유틸리티",
      subtitle: "팀 섞기 · 맵 추첨",
      icon: Wrench,
      accent: "bg-[var(--ow-blue)]",
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            title: "어드민",
            subtitle: "운영 · 회원 · 상점 관리",
            icon: Shield,
            accent: "bg-destructive",
          },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-wider text-foreground">
            대시보드
          </h1>
          <p className="text-muted-foreground mt-1">
            {user.username}님, 환영합니다
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group relative overflow-hidden border border-border/50 bg-card/60 p-6 transition-colors hover:border-primary/50"
            >
              <div className={cn("absolute left-0 top-0 h-full w-1", c.accent)} />
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "skew-btn flex h-12 w-12 items-center justify-center",
                    c.accent,
                  )}
                >
                  <c.icon className="h-6 w-6 text-white" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h2 className="mt-4 text-xl font-extrabold italic uppercase tracking-wide text-foreground">
                {c.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
