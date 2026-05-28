'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Trophy, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { handleApiError } from '@/lib/api-error'
import { auctionsApi } from '../api/auctions'
import { TeamRosters } from './parts/team-rosters'
import type { RoomState } from '../types'

interface Props {
  roomState: RoomState
  canRestart: boolean
}

export function AuctionCompleted({ roomState, canRestart }: Props) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleNewAuction = async () => {
    setIsDeleting(true)
    try {
      // 현재 COMPLETED 경매를 삭제하면 useCurrentAuction 이 다음 PENDING/없음 으로 전환
      await auctionsApi.delete(roomState.auction.id)
      await queryClient.invalidateQueries({ queryKey: ['auction', 'current'] })
      toast.success('정리되었습니다. 새 경매를 시작하세요.')
    } catch (error) {
      handleApiError(error, '경매 정리 실패')
    } finally {
      setIsDeleting(false)
    }
  }

  const unsold = roomState.unsoldPlayers

  return (
    <div className="space-y-6">
      <Card className="bg-card border-primary/30">
        <CardContent className="py-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black italic uppercase tracking-tighter">
              경매 완료 — <span className="text-primary">{roomState.auction.title}</span>
            </h2>
            <p className="text-muted-foreground text-xs">
              팀 {roomState.teams.length}개 · 영입{' '}
              {roomState.teams.reduce((sum, t) => sum + t.members.length, 0)}명 · 미낙찰{' '}
              {unsold.length}명
            </p>
          </div>
          {canRestart && (
            <Button
              onClick={handleNewAuction}
              disabled={isDeleting}
              className={cn(
                'skew-x-[-10deg] bg-primary px-4 py-2 text-sm font-bold text-black',
                'hover:bg-primary/90 transition-colors',
              )}
            >
              <span className="skew-x-[10deg] flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />새 경매
              </span>
            </Button>
          )}
        </CardContent>
      </Card>

      <TeamRosters teams={roomState.teams} showPrice />

      {unsold.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase">
              미낙찰 선수 ({unsold.length})
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {unsold.map((p) => (
                <li
                  key={p.id}
                  className="bg-muted/20 rounded px-2 py-1 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted-foreground uppercase text-[10px]">
                    {p.role}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
