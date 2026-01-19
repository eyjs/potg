"use client"

import { Play, Pause, Check, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Player } from "@/app/auction/[id]/page"

interface AdminControlsProps {
  auctionStatus: "waiting" | "bidding" | "paused" | "ended"
  currentPlayer: Player | null
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onConfirm: () => void
  onCancel: () => void
}

export function AdminControls({
  auctionStatus,
  currentPlayer,
  onStart,
  onPause,
  onResume,
  onConfirm,
  onCancel,
}: AdminControlsProps) {
  return (
    <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
      <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-3">관리자 컨트롤</p>

      <div className="flex flex-wrap gap-2">
        {auctionStatus === "waiting" && currentPlayer && (
          <Button onClick={onStart} className="skew-btn bg-primary hover:bg-primary/90 text-primary-foreground">
            <Play className="w-4 h-4 mr-2" />
            <span>경매 시작</span>
          </Button>
        )}

        {auctionStatus === "bidding" && (
          <>
            <Button onClick={onPause} variant="secondary" className="skew-btn">
              <Pause className="w-4 h-4 mr-2" />
              <span>일시 정지</span>
            </Button>
            <Button onClick={onConfirm} className="skew-btn bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              <span>낙찰 확정</span>
            </Button>
            <Button onClick={onCancel} variant="destructive" className="skew-btn">
              <X className="w-4 h-4 mr-2" />
              <span>유찰</span>
            </Button>
          </>
        )}

        {auctionStatus === "paused" && (
          <>
            <Button onClick={onResume} className="skew-btn bg-primary hover:bg-primary/90 text-primary-foreground">
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>재개</span>
            </Button>
            <Button onClick={onCancel} variant="destructive" className="skew-btn">
              <X className="w-4 h-4 mr-2" />
              <span>유찰</span>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
