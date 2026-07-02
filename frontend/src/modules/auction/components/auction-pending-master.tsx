'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card'
import { Input } from '@/common/components/ui/input'
import { Button } from '@/common/components/ui/button'
import { Plus, Play, Trash2, Crown, Users, Settings2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { handleApiError } from '@/lib/api-error'
import { auctionsApi } from '../api/auctions'
import { useConfirm } from '@/common/components/confirm-dialog'
import { UserPickerDialog } from './parts/user-picker-dialog'
import { HeroPickerDialog } from './parts/hero-picker-dialog'
import { useHeroes } from '../hooks/use-heroes'
import { ParticipantList } from './parts/participant-list'
import type { RoomState } from '../types'

interface AuctionEmitFns {
  startAuction: () => void
}

interface Props {
  auctionId: string
  roomState: RoomState | null
  emit: AuctionEmitFns
  /** 경매 시작 후 구성 열람용 — 추가/제거/시작/취소 비활성 */
  readOnly?: boolean
}

export function AuctionPendingMaster({
  auctionId,
  roomState,
  emit,
  readOnly = false,
}: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [captainPickerOpen, setCaptainPickerOpen] = useState(false)
  const [playerPickerOpen, setPlayerPickerOpen] = useState(false)
  const [heroTargetId, setHeroTargetId] = useState<string | null>(null)
  const { portraitByKey } = useHeroes()

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

  const canStart = !readOnly && captains.length === teamCount && players.length > 0

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['auction', 'current'] })

  // 경매 설정 편집 (팀 수 / 시작 포인트 / 턴 타이머) — PENDING 에서만 저장 가능
  const [settingsDraft, setSettingsDraft] = useState({
    teamCount: '',
    startingPoints: '',
    turnTimeLimit: '',
  })
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (!roomState) return
    setSettingsDraft({
      teamCount: String(roomState.auction.teamCount),
      startingPoints: String(roomState.auction.startingPoints),
      turnTimeLimit: String(roomState.auction.turnTimeLimit),
    })
  }, [roomState])

  const settingsChanged =
    roomState !== null &&
    (settingsDraft.teamCount !== String(teamCount) ||
      settingsDraft.startingPoints !== String(startingPoints) ||
      settingsDraft.turnTimeLimit !== String(turnTimeLimit))

  const handleSaveSettings = async () => {
    const nextTeamCount = Number(settingsDraft.teamCount)
    const nextPoints = Number(settingsDraft.startingPoints)
    const nextTimer = Number(settingsDraft.turnTimeLimit)
    if (
      !Number.isInteger(nextTeamCount) ||
      nextTeamCount < 2 ||
      nextTeamCount > 8
    ) {
      toast.error('팀 수는 2~8 사이의 정수여야 합니다.')
      return
    }
    if (!Number.isInteger(nextPoints) || nextPoints < 1) {
      toast.error('시작 포인트는 1 이상의 정수여야 합니다.')
      return
    }
    if (!Number.isInteger(nextTimer) || nextTimer < 10) {
      toast.error('턴 타이머는 10초 이상이어야 합니다.')
      return
    }
    if (nextTeamCount < captains.length) {
      toast.error(
        `이미 팀장이 ${captains.length}명 등록되어 있어 팀 수를 그보다 줄일 수 없습니다.`,
      )
      return
    }
    setSavingSettings(true)
    try {
      await auctionsApi.updateSettings(auctionId, {
        teamCount: nextTeamCount,
        startingPoints: nextPoints,
        turnTimeLimit: nextTimer,
      })
      toast.success('경매 설정이 저장되었습니다. (팀장 포인트 동기화됨)')
      await refresh()
    } catch (error) {
      handleApiError(error, '설정 저장 실패')
    } finally {
      setSavingSettings(false)
    }
  }

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

  const handleAddGuestPlayers = async (names: string[]) => {
    try {
      await auctionsApi.addGuestPlayers(auctionId, names)
      toast.success(`매물 ${names.length}명 추가됨`)
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

  const handleSetHero = async (heroKey: string | null) => {
    if (!heroTargetId) return
    try {
      await auctionsApi.setParticipantHero(auctionId, heroTargetId, heroKey)
      toast.success(heroKey ? '대표 영웅이 설정되었습니다.' : '대표 영웅을 해제했습니다.')
      await refresh()
    } catch (error) {
      handleApiError(error, '대표 영웅 설정 실패')
    }
  }

  const handleSaveTeamName = async (userId: string, teamName: string) => {
    try {
      await auctionsApi.setTeamName(auctionId, userId, teamName || null)
      toast.success('팀명이 저장되었습니다.')
      await refresh()
    } catch (error) {
      handleApiError(error, '팀명 저장 실패')
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

      {/* 경매 설정 — 팀 수 / 시작 포인트 / 턴 타이머 (PENDING 에서만 수정 가능) */}
      {!readOnly && (
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            경매 설정
          </CardTitle>
          <Button
            size="sm"
            onClick={handleSaveSettings}
            disabled={!settingsChanged || savingSettings}
            className="bg-primary text-black font-bold hover:bg-primary/90 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {savingSettings ? '저장 중...' : '저장'}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1 text-xs">
            <span className="uppercase tracking-widest text-muted-foreground font-bold">
              팀 수 (2~8)
            </span>
            <Input
              type="number"
              min={2}
              max={8}
              value={settingsDraft.teamCount}
              onChange={(e) =>
                setSettingsDraft((d) => ({ ...d, teamCount: e.target.value }))
              }
              className="bg-background"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="uppercase tracking-widest text-muted-foreground font-bold">
              팀장 시작 포인트
            </span>
            <Input
              type="number"
              min={1}
              value={settingsDraft.startingPoints}
              onChange={(e) =>
                setSettingsDraft((d) => ({
                  ...d,
                  startingPoints: e.target.value,
                }))
              }
              className="bg-background"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="uppercase tracking-widest text-muted-foreground font-bold">
              턴 타이머 (초, 10+)
            </span>
            <Input
              type="number"
              min={10}
              value={settingsDraft.turnTimeLimit}
              onChange={(e) =>
                setSettingsDraft((d) => ({
                  ...d,
                  turnTimeLimit: e.target.value,
                }))
              }
              className="bg-background"
            />
          </label>
          <p className="sm:col-span-3 text-[11px] text-muted-foreground">
            시작 포인트를 바꾸면 이미 등록된 모든 팀장의 보유 포인트가 새 값으로
            동기화됩니다. 설정은 경매 시작 전에만 변경할 수 있습니다.
          </p>
        </CardContent>
      </Card>
      )}

      {readOnly && (
        <Card className="bg-card border-dashed border-border">
          <CardContent className="py-3 text-xs text-muted-foreground">
            경매가 이미 시작되어 구성(팀장·매물)을 변경할 수 없습니다. 진행
            상황은 경매장 탭에서 확인하세요.
          </CardContent>
        </Card>
      )}

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
              disabled={readOnly || captains.length >= teamCount}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              추가
            </Button>
          </CardHeader>
          <CardContent>
            <ParticipantList
              participants={captains}
              canRemove={!readOnly}
              onRemove={handleRemoveCaptain}
              emptyMessage="팀장을 추가하세요"
              heroPortraits={portraitByKey}
              teamNames={
                new Map(captains.map((c) => [c.userId, c.teamName ?? null]))
              }
              onSaveTeamName={readOnly ? undefined : handleSaveTeamName}
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
              disabled={readOnly}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              추가
            </Button>
          </CardHeader>
          <CardContent>
            <ParticipantList
              participants={players}
              canRemove={!readOnly}
              onRemove={handleRemovePlayer}
              emptyMessage="경매 매물을 추가하세요"
              heroPortraits={portraitByKey}
              onPickHero={readOnly ? undefined : setHeroTargetId}
            />
          </CardContent>
        </Card>
      </div>

      {/* 하단 액션 — 시작 후에는 조작 불가이므로 숨김 */}
      {!readOnly && (
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
      )}

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
        onConfirmGuests={handleAddGuestPlayers}
      />
      <HeroPickerDialog
        open={heroTargetId !== null}
        onOpenChange={(open) => !open && setHeroTargetId(null)}
        currentHero={
          players.find((pl) => pl.userId === heroTargetId)?.user
            ?.representativeHero ?? null
        }
        targetName={
          (() => {
            const t = players.find((pl) => pl.userId === heroTargetId)
            return t?.user?.nickname ?? t?.user?.battleTag ?? '매물'
          })()
        }
        onSelect={handleSetHero}
      />
    </div>
  )
}
