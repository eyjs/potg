'use client'

import { useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/common/components/ui/avatar'
import { Badge } from '@/common/components/ui/badge'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { X, UserRound, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomStateParticipant } from '../../types'

interface Props {
  participants: RoomStateParticipant[]
  canRemove?: boolean
  onRemove?: (userId: string) => Promise<void>
  emptyMessage?: string
  highlightUserId?: string | null
  /** 매물 모드: 대표 영웅 세팅 버튼 + 영웅 초상화 아이콘 */
  heroPortraits?: Map<string, string>
  onPickHero?: (userId: string) => void
  /** 팀장 모드: 팀명 인라인 편집 (userId → 현재 팀명) */
  teamNames?: Map<string, string | null>
  onSaveTeamName?: (userId: string, teamName: string) => Promise<void>
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export function ParticipantList({
  participants,
  canRemove = false,
  onRemove,
  emptyMessage = '아직 없습니다.',
  highlightUserId = null,
  heroPortraits,
  onPickHero,
  teamNames,
  onSaveTeamName,
}: Props) {
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [teamDraft, setTeamDraft] = useState('')

  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {emptyMessage}
      </p>
    )
  }

  const startTeamEdit = (userId: string) => {
    setEditingTeamId(userId)
    setTeamDraft(teamNames?.get(userId) ?? '')
  }

  const saveTeamEdit = async (userId: string) => {
    if (!onSaveTeamName) return
    await onSaveTeamName(userId, teamDraft.trim())
    setEditingTeamId(null)
  }

  return (
    <ul className="space-y-1.5">
      {participants.map((p) => {
        const isMe = highlightUserId && p.userId === highlightUserId
        const roleKey = (p.user?.mainRole ?? 'flex').toLowerCase()
        const name = p.user?.nickname ?? p.user?.battleTag ?? '이름 없음'
        const heroKey = p.user?.representativeHero ?? null
        const heroPortrait = heroKey
          ? (heroPortraits?.get(heroKey) ?? null)
          : null
        const isEditingTeam = editingTeamId === p.userId
        const teamName = teamNames?.get(p.userId) ?? null

        return (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-sm border border-border/30',
              isMe ? 'bg-primary/10 border-primary/50' : 'bg-muted/20',
            )}
          >
            <Avatar className="w-7 h-7">
              {/* 아이콘 우선순위: 대표 영웅 초상화 > 디스코드 아바타 > 이니셜 */}
              <AvatarImage
                src={heroPortrait ?? p.user?.avatarUrl ?? undefined}
              />
              <AvatarFallback className="bg-muted text-xs">
                {name[0] ?? '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {isEditingTeam ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={teamDraft}
                    onChange={(e) => setTeamDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveTeamEdit(p.userId)
                      if (e.key === 'Escape') setEditingTeamId(null)
                    }}
                    maxLength={40}
                    placeholder={`${name} 팀`}
                    autoFocus
                    className="h-6 text-xs bg-background"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-primary shrink-0"
                    onClick={() => void saveTeamEdit(p.userId)}
                    aria-label="팀명 저장"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold truncate">
                    {name}
                    {isMe && (
                      <span className="text-primary text-xs ml-2">(나)</span>
                    )}
                  </p>
                  {teamNames && (
                    <button
                      type="button"
                      onClick={() =>
                        onSaveTeamName && startTeamEdit(p.userId)
                      }
                      className={cn(
                        'flex items-center gap-1 text-[11px] truncate',
                        teamName ? 'text-primary' : 'text-muted-foreground',
                        onSaveTeamName && 'hover:underline',
                      )}
                    >
                      {teamName ?? `${name} 팀`}
                      {onSaveTeamName && <Pencil className="w-2.5 h-2.5" />}
                    </button>
                  )}
                </>
              )}
            </div>

            {p.user?.mainRole && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  ROLE_COLORS[roleKey] || ROLE_COLORS.flex,
                )}
              >
                {p.user.mainRole.toUpperCase()}
              </Badge>
            )}
            {onPickHero && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6 shrink-0',
                  heroKey
                    ? 'text-primary hover:text-primary'
                    : 'text-muted-foreground',
                )}
                onClick={() => onPickHero(p.userId)}
                aria-label="대표 영웅 설정"
                title="대표 영웅 설정"
              >
                <UserRound className="w-3.5 h-3.5" />
              </Button>
            )}
            {canRemove && onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => void onRemove(p.userId)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
