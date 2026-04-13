"use client"

import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { PostWriteForm } from "@/modules/community/components/post-write-form"
import { useEffect } from "react"

export default function CommunityWritePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-primary font-bold">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1 max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">
            글쓰기
          </h1>
        </div>

        <PostWriteForm />
      </main>
    </div>
  )
}
