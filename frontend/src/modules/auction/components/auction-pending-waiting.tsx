'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Crown, Users, Hourglass } from 'lucide-react'
import { ParticipantList } from './parts/participant-list'
import type { RoomState } from '../types'

interface Props {
  roomState: RoomState | null
  userId: string | null
}

export function AuctionPendingWaiting({ roomState, userId }: Props) {
  const captains = useMemo(
    () => roomState?.participants.filter((p) => p.role === 'CAPTAIN') ?? [],
    [roomState],
  )
  const players = useMemo(
    () => roomState?.participants.filter((p) => p.role === 'PLAYER') ?? [],
    [roomState],
  )

  const isCaptain = captains.some((c) => c.userId === userId)
  const title = roomState?.auction.title ?? '경매방 준비 중'

  return (
    <div className="space-y-4">
      <Card className="bg-card border-primary/30">
        <CardContent className="py-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
            <Hourglass className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isCaptain
                ? '당신은 팀장으로 배정되었습니다. 마스터의 시작을 기다려주세요.'
                : '마스터가 경매를 준비 중입니다.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              팀장{' '}
              <span className="tabular-nums text-sm text-muted-foreground">
                {captains.length}명
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantList
              participants={captains}
              highlightUserId={userId}
              emptyMessage="아직 팀장이 없습니다"
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              매물 풀{' '}
              <span className="tabular-nums text-sm text-muted-foreground">
                {players.length}명
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantList
              participants={players}
              highlightUserId={userId}
              emptyMessage="아직 매물이 없습니다"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
