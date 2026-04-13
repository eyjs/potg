"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { ArrowLeft, Loader2, Trophy } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useScrimResult } from "@/modules/scrim-result/hooks/use-scrim-result"
import { ScrimResultView } from "@/modules/scrim-result/components/scrim-result-view"
import { ScrimResultForm } from "@/modules/scrim-result/components/scrim-result-form"
import { ShareButton } from "@/modules/community/components/share-button"
import api from "@/lib/api"

interface AuctionInfo {
  id: string
  title: string
  status: string
  createdAt: string
}

interface AuctionResultPageProps {
  auctionId: string
}

export function AuctionResultPage({ auctionId }: AuctionResultPageProps) {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { data: scrimResult, isLoading: isResultLoading } = useScrimResult(auctionId)
  const [auction, setAuction] = useState<AuctionInfo | null>(null)
  const [isAuctionLoading, setIsAuctionLoading] = useState(true)

  useEffect(() => {
    loadAuction()
  }, [auctionId])

  const loadAuction = async () => {
    try {
      const res = await api.get(`/auctions/${auctionId}`)
      setAuction(res.data)
    } catch {
      // Auction may not be accessible
    } finally {
      setIsAuctionLoading(false)
    }
  }

  const isLoading = isResultLoading || isAuctionLoading

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-6 flex-1 max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">
                내전 결과
              </h1>
              {auction && (
                <p className="text-sm text-muted-foreground">{auction.title}</p>
              )}
            </div>
          </div>
          <ShareButton />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : scrimResult ? (
          <ScrimResultView result={scrimResult} />
        ) : isAdmin ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-bold mb-1">
                아직 내전 결과가 등록되지 않았습니다
              </p>
              <p className="text-xs text-muted-foreground">
                관리자로서 결과를 입력할 수 있습니다
              </p>
            </div>
            <ScrimResultForm auctionId={auctionId} />
          </div>
        ) : (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-bold">
              아직 내전 결과가 등록되지 않았습니다
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              관리자가 결과를 입력하면 여기에 표시됩니다
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
