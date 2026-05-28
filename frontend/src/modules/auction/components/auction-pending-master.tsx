'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Plus, Play, Trash2, Crown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { handleApiError } from '@/lib/api-error'
import { auctionsApi } from '../api/auctions'
import { useConfirm } from '@/common/components/confirm-dialog'
import { UserPickerDialog } from './parts/user-picker-dialog'
import { ParticipantList } from './parts/participant-list'
import type { RoomState } from '../types'

interface AuctionEmitFns {
  startAuction: () => void
}

interface Props {
  auctionId: string
  roomState: RoomState | null
  emit: AuctionEmitFns
}

export function AuctionPendingMaster({ auctionId, roomState, emit }: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [captainPickerOpen, setCaptainPickerOpen] = useState(false)
  const [playerPickerOpen, setPlayerPickerOpen] = useState(false)

  const captains = useMemo(
    () => roomState?.participants.filter((p) => p.role === 'CAPTAIN') ?? [],
    [roomState],
  )
  const players = useMemo(
    () => roomState?.participants.filter((p) => p.role === 'PLAYER') ?? [],
    [roomState],
  )
  const allParticipantUserIds = useMemo(
    () => roomState?.participants.map((p) => p.userId) ?? [],
    [roomState],
  )

  const teamCount = roomState?.auction.teamCount ?? 0
  const startingPoints = roomState?.auction.startingPoints ?? 0
  const turnTimeLimit = roomState?.auction.turnTimeLimit ?? 0
  const title = roomState?.auction.title ?? '경매방 준비 중'

  const canStart = captains.length === teamCount && players.length > 0

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['auction', 'current'] })

  const handleAddCaptains = async (userIds: string[]) => {
    try {
      await Promise.all(
        userIds.map((uid) => auctionsApi.addCaptain(auctionId, uid)),
      )
      toast.success(`팀장 ${userIds.length}명 추가됨`)
      await refresh()
    } catch (error) {
      handleApiError(error, '팀장 추가 실패')
    }
  }

  const handleAddPlayers = async (userIds: string[]) => {
    try {
      await auctionsApi.addPlayersBulk(auctionId, userIds)
      toast.success(`매물 ${userIds.length}명 추가됨`)
      await refresh()
    } catch (error) {
      handleApiError(error, '매물 추가 실패')
    }
  }

  const handleRemoveCaptain = async (userId: string) => {
    try {
      await auctionsApi.removeCaptain(auctionId, userId)
      await refresh()
    } catch (error) {
      handleApiError(error, '팀장 제거 실패')
    }
  }

  const handleRemovePlayer = async (userId: string) => {
    try {
      await auctionsApi.removeParticipant(auctionId, userId)
      await refresh()
    } catch (error) {
      handleApiError(error, '매물 제거 실패')
    }
  }

  const handleCancel = async () => {
    const ok = await confirm({
      title: '경매를 취소하시겠습니까?',
      description: '등록한 팀장과 매물 정보가 모두 사라집니다.',
      variant: 'destructive',
      confirmText: '취소',
    })
    if (!ok) return
    try {
      await auctionsApi.delete(auctionId)
      await refresh()
      toast.success('경매가 취소되었습니다.')
    } catch (error) {
      handleApiError(error, '경매 취소 실패')
    }
  }

  const handleStart = async () => {
    if (!canStart) return
    const ok = await confirm({
      title: '경매를 시작하시겠습니까?',
      description: `팀장 ${captains.length}명 · 매물 ${players.length}명으로 진행됩니다.`,
      confirmText: '시작',
    })
    if (!ok) return
    emit.startAuction()
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="bg-card border-primary/30">
        <CardContent className="py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black italic uppercase tracking-tighter truncate">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              경매방 준비 — 마스터
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>
              팀:{' '}
              <span className="text-primary font-bold tabular-nums">
                {teamCount}
              </span>
            </span>
            <span>
              시작 P:{' '}
              <span className="text-primary font-bold tabular-nums">
                {startingPoints.toLocaleString()}
              </span>
            </span>
            <span>
              턴:{' '}
              <span className="text-primary font-bold tabular-nums">
                {turnTimeLimit}s
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 팀장 */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              팀장{' '}
              <span
                className={cn(
                  'tabular-nums text-sm',
                  captains.length === teamCount
                    ? 'text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {captains.length}/{teamCount}
              </span>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCaptainPickerOpen(true)}
              disabled={captains.length >= teamCount}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              추가
            </Button>
          </CardHeader>
          <CardContent>
            <ParticipantList
              participants={captains}
              canRemove
              onRemove={handleRemoveCaptain}
              emptyMessage="팀장을 추가하세요"
            />
          </CardContent>
        </Card>

        {/* 매물 */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              매물 풀{' '}
              <span className="tabular-nums text-sm text-muted-foreground">
                {players.length}명
              </span>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPlayerPickerOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              추가
            </Button>
          </CardHeader>
          <CardContent>
            <ParticipantList
              participants={players}
              canRemove
              onRemove={handleRemovePlayer}
              emptyMessage="경매 매물을 추가하세요"
            />
          </CardContent>
        </Card>
      </div>

      {/* 하단 액션 */}
      <Card className="bg-card border-border">
        <CardContent className="py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            경매 취소
          </Button>
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className={cn(
              'skew-x-[-10deg] bg-primary px-6 py-3 text-base font-bold text-black',
              'hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
          >
            <span className="skew-x-[10deg] flex items-center gap-2">
              <Play className="w-4 h-4" />
              경매 시작
            </span>
          </Button>
        </CardContent>
      </Card>

      <UserPickerDialog
        open={captainPickerOpen}
        onOpenChange={setCaptainPickerOpen}
        mode="captains"
        excludeIds={allParticipantUserIds}
        onConfirm={handleAddCaptains}
      />
      <UserPickerDialog
        open={playerPickerOpen}
        onOpenChange={setPlayerPickerOpen}
        mode="players"
        excludeIds={allParticipantUserIds}
        onConfirm={handleAddPlayers}
      />
    </div>
  )
}
