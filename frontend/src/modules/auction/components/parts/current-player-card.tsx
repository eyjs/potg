import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
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
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <Avatar className="w-48 h-48 border-4 border-primary/40">
          <AvatarImage src={player.avatarUrl ?? undefined} alt={player.name} />
          <AvatarFallback className="bg-muted text-6xl font-black">
            {player.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              ROLE_COLORS[roleKey] || ROLE_COLORS.flex,
            )}
          >
            {player.role.toUpperCase()}
          </Badge>
          <h3 className="text-4xl font-black italic uppercase tracking-tighter">
            {player.name}
          </h3>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {PHASE_LABEL[biddingPhase]}
          </p>
        </div>
        <div className="w-full pt-3 border-t border-border/40 flex items-baseline justify-center gap-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            현재가
          </span>
          <span className="text-5xl font-black tabular-nums text-primary">
            {currentBid ? currentBid.amount.toLocaleString() : '0'}
            <span className="text-2xl ml-1">P</span>
          </span>
        </div>
        {currentBid && (
          <p className="text-sm text-muted-foreground">
            입찰자: <span className="text-primary font-bold">{currentBid.bidderName}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
