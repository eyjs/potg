import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { RoomStateQueuePlayer } from '../../types'

interface Props {
  players: RoomStateQueuePlayer[]
  currentPlayerId?: string | null
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

/**
 * 우측 사이드 — 남은 매물(미할당 PLAYER) 큐.
 * 미시도 매물과 유찰된 매물을 구분 표시.
 */
export function PlayerQueue({ players, currentPlayerId }: Props) {
  const queueable = players.filter((p) => p.id !== currentPlayerId)
  const unattempted = queueable.filter((p) => !p.wasUnsold)
  const unsold = queueable.filter((p) => p.wasUnsold)

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            남은 매물
          </h3>
          <span className="text-xs tabular-nums">
            <span className="text-primary font-bold">{queueable.length}</span>
            <span className="text-muted-foreground">/{players.length}</span>
          </span>
        </div>

        {queueable.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            큐가 비었습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {unattempted.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  대기 ({unattempted.length})
                </p>
                <ul className="space-y-1">
                  {unattempted.map((p) => (
                    <PlayerRow key={p.id} player={p} />
                  ))}
                </ul>
              </div>
            )}
            {unsold.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ow-red">
                  유찰 ({unsold.length})
                </p>
                <ul className="space-y-1">
                  {unsold.map((p) => (
                    <PlayerRow key={p.id} player={p} dimmed />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlayerRow({
  player,
  dimmed = false,
}: {
  player: RoomStateQueuePlayer
  dimmed?: boolean
}) {
  const roleKey = player.role.toLowerCase()
  return (
    <li
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-sm bg-muted/20',
        dimmed && 'opacity-60',
      )}
    >
      <Avatar className="w-7 h-7">
        <AvatarImage src={player.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-muted text-xs">
          {player.name[0]}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-semibold truncate flex-1">{player.name}</span>
      <Badge
        variant="outline"
        className={cn(
          'shrink-0 text-[9px] px-1 py-0',
          ROLE_COLORS[roleKey] || ROLE_COLORS.flex,
        )}
      >
        {player.role.toUpperCase()}
      </Badge>
    </li>
  )
}
