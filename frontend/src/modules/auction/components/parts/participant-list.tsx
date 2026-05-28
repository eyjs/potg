'use client'

import { Avatar, AvatarFallback } from '@/common/components/ui/avatar'
import { Badge } from '@/common/components/ui/badge'
import { Button } from '@/common/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomStateParticipant } from '../../types'

interface Props {
  participants: RoomStateParticipant[]
  canRemove?: boolean
  onRemove?: (userId: string) => Promise<void>
  emptyMessage?: string
  highlightUserId?: string | null
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
}: Props) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {emptyMessage}
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {participants.map((p) => {
        const isMe = highlightUserId && p.userId === highlightUserId
        const roleKey = (p.user?.mainRole ?? 'flex').toLowerCase()
        return (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-sm border border-border/30',
              isMe ? 'bg-primary/10 border-primary/50' : 'bg-muted/20',
            )}
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-muted text-xs">
                {p.user?.battleTag?.[0] ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {p.user?.battleTag ?? '익명'}
                {isMe && (
                  <span className="text-primary text-xs ml-2">(나)</span>
                )}
              </p>
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
