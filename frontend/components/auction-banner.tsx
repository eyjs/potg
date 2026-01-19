import Link from "next/link"
import { Gavel, ChevronRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuctionBannerProps {
  hasLiveAuction?: boolean
  roomCount?: number
}

export function AuctionBanner({ hasLiveAuction = false, roomCount = 0 }: AuctionBannerProps) {
  return (
    <div
      className={`
      relative overflow-hidden rounded-lg border-2 p-6
      ${
        hasLiveAuction
          ? "border-primary bg-gradient-to-r from-primary/20 to-primary/5 pulse-live"
          : "border-border bg-card"
      }
    `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(249, 158, 26, 0.1) 10px,
              rgba(249, 158, 26, 0.1) 20px
            )`,
          }}
        />
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`
            w-14 h-14 rounded flex items-center justify-center skew-btn
            ${hasLiveAuction ? "bg-primary" : "bg-muted"}
          `}
          >
            <Gavel className={`w-7 h-7 ${hasLiveAuction ? "text-primary-foreground" : "text-muted-foreground"}`} />
          </div>
          <div>
            <h3 className="font-extrabold text-xl italic uppercase tracking-wide text-foreground">경매장</h3>
            {hasLiveAuction ? (
              <p className="text-sm text-primary flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span className="font-semibold">{roomCount}개 경매 진행중</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">예정된 경매가 없습니다</p>
            )}
          </div>
        </div>

        <Link href="/auction">
          <Button
            className={`
              skew-btn font-bold uppercase tracking-wide
              ${
                hasLiveAuction
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }
            `}
          >
            <span className="flex items-center gap-1">
              입장 <ChevronRight className="w-4 h-4" />
            </span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
