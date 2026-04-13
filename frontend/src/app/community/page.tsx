"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { PenSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useCommunityFeed } from "@/modules/community/hooks/use-community"
import { PostCard } from "@/modules/community/components/post-card"

export default function CommunityPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCommunityFeed(user?.clanId, page);

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1 max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">
            커뮤니티
          </h1>
          {user && (
            <Link href="/community/write">
              <Button size="sm" className="gap-2 font-bold">
                <PenSquare className="w-4 h-4" />
                글쓰기
              </Button>
            </Link>
          )}
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted/20 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          <div className="space-y-3">
            {data.data.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-bold mb-2">아직 게시글이 없습니다</p>
            <p className="text-sm">첫 게시글을 작성해보세요!</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
