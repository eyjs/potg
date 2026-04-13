"use client"

import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PostDetail } from "@/modules/community/components/post-detail"

interface CommunityPostPageProps {
  postId: string
}

export function CommunityPostPage({ postId }: CommunityPostPageProps) {
  const router = useRouter()

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
          <h1 className="text-lg font-black italic uppercase tracking-tighter">
            게시글
          </h1>
        </div>

        <PostDetail postId={postId} />
      </main>
    </div>
  )
}
