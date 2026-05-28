import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Avatar, AvatarFallback } from '@/common/components/ui/avatar'
import { Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomStateBid, RoomStatePlayer } from '../../types'

interface Props {
  player: RoomStatePlayer | null
  currentBid: RoomStateBid | null
  biddingPhase: 'WAITING' | 'BIDDING' | 'SOLD'
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const PHASE_LABEL: Record<Props['biddingPhase'], string> = {
  WAITING: '다음 매물 대기',
  BIDDING: '입찰 진행 중',
  SOLD: '낙찰',
}

export function CurrentPlayerCard({ player, currentBid, biddingPhase }: Props) {
  if (!player) {
    return (
      <Card className="bg-card border-border border-dashed">
        <CardContent className="py-12 text-center">
          <Gavel className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-muted-foreground text-sm">
            마스터가 매물을 선택하기를 기다리는 중...
          </p>
        </CardContent>
      </Card>
    )
  }

  const roleKey = player.role.toLowerCase()

  return (
    <Card
      className={cn(
        'bg-card border-2',
        biddingPhase === 'BIDDING' && 'border-primary',
        biddingPhase === 'SOLD' && 'border-green-500',
        biddingPhase === 'WAITING' && 'border-border',
      )}
    >
      <CardContent className="p-6 flex items-center gap-6">
        <Avatar className="w-24 h-24 border-2 border-primary/40">
          <AvatarFallback className="bg-muted text-3xl font-black">
            {player.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Badge
            variant="outline"
            className={cn(
              'mb-2 text-[10px]',
              ROLE_COLORS[roleKey] || ROLE_COLORS.flex,
            )}
          >
            {player.role.toUpperCase()}
          </Badge>
          <h3 className="text-3xl font-black italic uppercase tracking-tighter truncate">
            {player.name}
          </h3>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
            {PHASE_LABEL[biddingPhase]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            현재가
          </p>
          <p className="text-4xl font-black tabular-nums text-primary">
            {currentBid ? currentBid.amount.toLocaleString() : '0'}
          </p>
          {currentBid && (
            <p className="text-xs text-muted-foreground mt-1">
              입찰자: <span className="text-primary">{currentBid.bidderName}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
