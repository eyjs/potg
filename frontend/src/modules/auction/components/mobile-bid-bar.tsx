"use client"

import { Button } from "@/common/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileBidBarProps {
  myTeamPoints?: number
  currentBidAmount?: number
  selectedBidAmount: number
  onSelectAmount: (amount: number) => void
  onBid: () => void
}

const BID_INCREMENTS = [100, 200, 500, 1000]

/**
 * 모바일 캡틴용 floating 입찰 바.
 * 화면 하단 고정.
 */
export function MobileBidBar({
  myTeamPoints,
  currentBidAmount = 0,
  selectedBidAmount,
  onSelectAmount,
  onBid,
}: MobileBidBarProps) {
  const nextBidAmount = currentBidAmount + selectedBidAmount
  const isInsufficient =
    typeof myTeamPoints === "number" && myTeamPoints < nextBidAmount

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 safe-area-pb">
      {typeof myTeamPoints === "number" && (
        <p className="text-center text-sm text-muted-foreground mb-2">
          보유: <span className="text-primary font-bold">{myTeamPoints.toLocaleString()}P</span>
        </p>
      )}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {BID_INCREMENTS.map((amount) => (
          <Button
            key={amount}
            size="sm"
            variant={selectedBidAmount === amount ? "default" : "outline"}
            className={cn(
              "font-bold",
              selectedBidAmount === amount && "bg-primary text-primary-foreground",
            )}
            onClick={() => onSelectAmount(amount)}
          >
            +{amount}
          </Button>
        ))}
      </div>
      <Button
        size="lg"
        className="w-full skew-btn bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
        onClick={onBid}
        disabled={isInsufficient}
      >
        {nextBidAmount.toLocaleString()}P 입찰
      </Button>
    </div>
  )
}
