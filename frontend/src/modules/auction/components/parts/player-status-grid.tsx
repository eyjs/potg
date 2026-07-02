'use client'

import { Card, CardContent } from '@/common/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHeroes } from '../../hooks/use-heroes'
import type { RoomState } from '../../types'

type PlayerStatus = 'current' | 'waiting' | 'unsold' | 'sold'

interface GridPlayer {
  id: string
  name: string
  avatarUrl: string | null
  status: PlayerStatus
  soldPrice: number | null
}

interface Props {
  roomState: RoomState
}

const STATUS_ORDER: Record<PlayerStatus, number> = {
  current: 0,
  waiting: 1,
  unsold: 2,
  sold: 3,
}

const STATUS_LABEL: Record<PlayerStatus, string> = {
  current: '경매중',
  waiting: '대기',
  unsold: '유찰',
  sold: '낙찰',
}

const STATUS_BADGE: Record<PlayerStatus, string> = {
  current: 'bg-primary text-black',
  waiting: 'bg-muted text-muted-foreground',
  unsold: 'bg-ow-red/20 text-ow-red',
  sold: 'bg-emerald-500/20 text-emerald-400',
}

/**
 * 우측 사이드 — 전체 매물 3열 그리드.
 * 유저 아이콘 아래 상태 라벨(경매중/대기/유찰/낙찰)을 표시하고,
 * 낙찰자는 낙찰가를 함께 보여준다. 진행 중 매물은 강조 테두리.
 */
export function PlayerStatusGrid({ roomState }: Props) {
  const { portraitByKey } = useHeroes()
  const currentId = roomState.auction.currentBiddingPlayerId
  const priceByUserId = new Map<string, number>()
  for (const team of roomState.teams) {
    for (const m of team.members) priceByUserId.set(m.id, m.price)
  }

  const players: GridPlayer[] = roomState.participants
    .filter((p) => p.role === 'PLAYER')
    .map((p) => {
      const status: PlayerStatus =
        p.userId === currentId
          ? 'current'
          : p.assignedTeamCaptainId !== null
            ? 'sold'
            : p.wasUnsold
              ? 'unsold'
              : 'waiting'
      const heroPortrait = p.user?.representativeHero
        ? (portraitByKey.get(p.user.representativeHero) ?? null)
        : null
      return {
        id: p.userId,
        name:
          p.user?.nickname || p.user?.battleTag?.split('#')[0] || '선수',
        // 아이콘 우선순위: 대표 영웅 초상화 > 디스코드 아바타 > 이니셜
        avatarUrl: heroPortrait ?? p.user?.avatarUrl ?? null,
        status,
        soldPrice:
          status === 'sold' ? (priceByUserId.get(p.userId) ?? null) : null,
      }
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  const waitingCount = players.filter((p) => p.status === 'waiting').length

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            매물 현황
          </h3>
          <span className="text-xs tabular-nums">
            <span className="text-primary font-bold">{waitingCount}</span>
            <span className="text-muted-foreground"> 대기</span>
            <span className="text-muted-foreground"> / {players.length}</span>
          </span>
        </div>

        {players.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            등록된 매물이 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 max-h-[32rem] overflow-y-auto pr-0.5">
            {players.map((p) => (
              <li
                key={p.id}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-sm p-2 text-center',
                  'transition-transform duration-150 hover:-translate-y-0.5',
                  p.status === 'current'
                    ? 'neon-frame-gold bg-primary/10 pulse-live'
                    : 'bg-muted/20 border border-transparent hover:border-ow-blue/30',
                  p.status === 'sold' && 'bg-emerald-500/[0.07]',
                  p.status === 'unsold' && 'opacity-75',
                )}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={p.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-muted text-sm">
                    {p.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-semibold leading-tight truncate w-full">
                  {p.name}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5',
                    'text-[9px] font-bold uppercase tracking-wider',
                    STATUS_BADGE[p.status],
                  )}
                >
                  {p.status === 'current' && <Gavel className="w-2.5 h-2.5" />}
                  {STATUS_LABEL[p.status]}
                  {p.soldPrice !== null && (
                    <span className="tabular-nums">
                      {p.soldPrice.toLocaleString()}P
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
