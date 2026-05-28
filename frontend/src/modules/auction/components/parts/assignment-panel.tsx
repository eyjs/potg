'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Crown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomState, RoomStateParticipant } from '../../types'

interface AuctionEmitFns {
  manualAssignPlayer: (playerId: string, captainId: string) => void
}

interface Props {
  roomState: RoomState
  emit: AuctionEmitFns
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

function PlayerCard({
  participant,
  isOverlay = false,
}: {
  participant: RoomStateParticipant
  isOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: participant.userId,
  })

  const name = participant.user?.battleTag?.split('#')[0] ?? '선수'
  const role = (participant.user?.mainRole ?? 'flex').toLowerCase()

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      className={cn(
        'flex items-center gap-2 px-2 py-2 rounded-sm border bg-card cursor-grab active:cursor-grabbing',
        isDragging && !isOverlay && 'opacity-30',
        isOverlay && 'border-primary bg-card shadow-lg scale-105',
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      <Badge
        variant="outline"
        className={cn(
          'shrink-0 text-[10px] px-1.5 py-0',
          ROLE_COLORS[role] ?? ROLE_COLORS.flex,
        )}
      >
        {role.toUpperCase()}
      </Badge>
      <span className="text-sm font-semibold truncate">{name}</span>
      {participant.wasUnsold && (
        <Badge
          variant="outline"
          className="ml-auto shrink-0 text-[10px] border-muted-foreground/40 text-muted-foreground"
        >
          유찰
        </Badge>
      )}
    </div>
  )
}

function TeamDropZone({
  captainId,
  captainName,
  members,
  remainingPoints,
}: {
  captainId: string
  captainName: string
  members: RoomState['teams'][number]['members']
  remainingPoints: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: captainId })

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'bg-card border-2 transition-colors',
        isOver ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Crown className="w-4 h-4 text-primary shrink-0" />
            <span className="font-bold text-sm truncate">{captainName}</span>
          </div>
          <span className="text-xs font-mono text-primary tabular-nums">
            {remainingPoints.toLocaleString()}P
          </span>
        </div>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            여기로 드래그
          </p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded bg-muted/20"
              >
                <span className="truncate">{m.name}</span>
                <span
                  className={cn(
                    'tabular-nums shrink-0',
                    m.wasUnsold ? 'text-muted-foreground' : 'text-primary',
                  )}
                >
                  {m.wasUnsold ? '유찰배정' : `${m.price.toLocaleString()}P`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function AssignmentPanel({ roomState, emit }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const unassignedUnsold = useMemo(
    () =>
      roomState.participants.filter(
        (p) =>
          p.role === 'PLAYER' &&
          p.assignedTeamCaptainId === null,
      ),
    [roomState],
  )

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const draggingParticipant = unassignedUnsold.find((p) => p.userId === draggingId)

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null)
    const playerId = String(event.active.id)
    const captainId = event.over ? String(event.over.id) : null
    if (!captainId) return
    emit.manualAssignPlayer(playerId, captainId)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 유찰 풀 (드래그 소스) */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
              미배정 ({unassignedUnsold.length})
            </h3>
            {unassignedUnsold.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                모두 배정 완료
              </p>
            ) : (
              <ul className="space-y-1.5">
                {unassignedUnsold.map((p) => (
                  <li key={p.userId}>
                    <PlayerCard participant={p} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 팀 드롭존 */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roomState.teams.map((team) => (
            <TeamDropZone
              key={team.captainId}
              captainId={team.captainId}
              captainName={team.captainName}
              members={team.members}
              remainingPoints={team.points}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {draggingParticipant && (
          <PlayerCard participant={draggingParticipant} isOverlay />
        )}
      </DragOverlay>
    </DndContext>
  )
}
