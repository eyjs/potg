"use client"

import { Button } from "@/common/components/ui/button"
import { Check, X, SkipForward, Play, Pause } from "lucide-react"

interface MobileAdminBarProps {
  isPaused: boolean
  isTimerPaused: boolean
  hasCurrentPlayer: boolean
  isBidding: boolean
  hasCurrentBid: boolean
  canShowNextPlayer: boolean
  onConfirmBid: () => void
  onPassPlayer: () => void
  onNextPlayer: () => void
  onPauseAuction: () => void
  onResumeAuction: () => void
  onPauseTimer: () => void
  onResumeTimer: () => void
}

/**
 * 모바일 관리자용 floating 컨트롤 바.
 * 낙찰/유찰/다음/타이머/일시정지 액션.
 */
export function MobileAdminBar({
  isPaused,
  isTimerPaused,
  hasCurrentPlayer,
  isBidding,
  hasCurrentBid,
  canShowNextPlayer,
  onConfirmBid,
  onPassPlayer,
  onNextPlayer,
  onPauseAuction,
  onResumeAuction,
  onPauseTimer,
  onResumeTimer,
}: MobileAdminBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-destructive/10 backdrop-blur-sm border-t border-destructive/30 p-4 safe-area-pb">
      <div className="space-y-2">
        {hasCurrentPlayer && isBidding && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              className="skew-btn bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={onConfirmBid}
              disabled={!hasCurrentBid}
            >
              <Check className="w-4 h-4 mr-2" />
              낙찰
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="skew-btn border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-bold"
              onClick={onPassPlayer}
            >
              <X className="w-4 h-4 mr-2" />
              유찰
            </Button>
          </div>
        )}

        {canShowNextPlayer && (
          <Button
            size="lg"
            className="w-full skew-btn bg-primary hover:bg-primary/90 font-bold"
            onClick={onNextPlayer}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            다음 선수
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {isPaused ? (
            <Button
              size="sm"
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={onResumeAuction}
            >
              <Play className="w-4 h-4 mr-1" />
              경매 재개
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
              onClick={onPauseAuction}
            >
              <Pause className="w-4 h-4 mr-1" />
              일시정지
            </Button>
          )}
          {isTimerPaused ? (
            <Button
              size="sm"
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={onResumeTimer}
            >
              <Play className="w-4 h-4 mr-1" />
              타이머 재개
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onPauseTimer}
            >
              <Pause className="w-4 h-4 mr-1" />
              타이머 정지
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
