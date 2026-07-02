'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Card, CardContent } from '@/common/components/ui/card'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/common/components/ui/avatar'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHeroes } from '../../hooks/use-heroes'
import { maxPlayersPerTeam, type RoomStateTeam, type RosterMode } from '../../types'

/** 한 팀은 5명 — 감독 모드는 선수 5명, 팀장 모드는 팀장 포함 5명. */
const TEAM_SIZE = 5

/**
 * 신규 멤버 id 집합 계산 — 이전 렌더의 id 집합과 비교해 새로 추가된 id만 반환.
 * 순수 함수로 분리(단위 테스트 대상).
 */
export function diffNewMemberIds(
  previousIds: ReadonlySet<string>,
  currentIds: readonly string[],
): Set<string> {
  const added = new Set<string>()
  for (const id of currentIds) {
    if (!previousIds.has(id)) {
      added.add(id)
    }
  }
  return added
}

interface Props {
  teams: RoomStateTeam[]
  myCaptainId?: string | null
  /** 팀장 시작 포인트 — 잔여 포인트 게이지 계산용 */
  startingPoints?: number
  /** 로스터 모드 — 정원 표시(팀장 포함/제외) 결정. 기본 CAPTAIN. */
  rosterMode?: RosterMode
  /** 팀 카드 클릭 핸들러 — 제공 시 카드가 클릭 가능(팀 상세/회수 모달용). */
  onTeamClick?: (captainId: string) => void
  /** 현재 입찰 선두 팀장 id — 해당 팀 카드에 골드 글로우 강조 */
  highlightCaptainId?: string | null
}

/**
 * Vertical 팀 카드 사이드바 — 샘플 레퍼런스 스타일.
 * 크라운 + 팀명 + 골드 포인트, 영입 멤버 아바타 행, 에너지 게이지, n/5 정원.
 */
export function TeamSidebar({
  teams,
  myCaptainId,
  startingPoints,
  rosterMode = 'CAPTAIN',
  onTeamClick,
  highlightCaptainId,
}: Props) {
  const { portraitByKey } = useHeroes()
  const maxPlayers = maxPlayersPerTeam(rosterMode)
  const reducedMotion = useReducedMotion()

  // 신규 멤버 판정은 렌더 단계에서 계산한다(effect 지연 시 마운트 렌더에서
  // isNew=false 로 그려져 flight-in 진입 애니메이션이 재생되지 않는 문제 방지).
  // previousMemberIds 는 상태로 보관 — ref 변형은 StrictMode 이중 렌더에서
  // 부작용을 남겨 diff 결과가 오염될 수 있어 사용하지 않는다(순수 계산 유지).
  const currentMemberIds = teams.flatMap((team) => team.members.map((m) => m.id))
  const currentMemberIdsKey = currentMemberIds.join(',')

  const [previousMemberIds, setPreviousMemberIds] = useState<Set<string> | null>(
    null,
  )
  const [previousMemberIdsKey, setPreviousMemberIdsKey] = useState<string | null>(
    null,
  )
  const [newMemberIds, setNewMemberIds] = useState<Set<string>>(new Set())

  if (previousMemberIdsKey !== currentMemberIdsKey) {
    // 최초 렌더(previousMemberIds === null)는 기준선만 세우고 애니메이션 대상 없음 —
    // 초기 전체 로드 시 전원에 진입 애니메이션이 터지는 것을 방지.
    const added =
      previousMemberIds === null
        ? new Set<string>()
        : diffNewMemberIds(previousMemberIds, currentMemberIds)
    setNewMemberIds(added)
    setPreviousMemberIds(new Set(currentMemberIds))
    setPreviousMemberIdsKey(currentMemberIdsKey)
  }

  if (teams.length === 0) {
    return (
      <Card className="game-panel border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          팀이 아직 구성되지 않았습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => {
        const isMine = myCaptainId && team.captainId === myCaptainId
        const isLeading = highlightCaptainId === team.captainId
        // members = 확보 선수. 팀장 모드는 팀장(+1) 포함해 표시, 감독 모드는 선수만.
        const rosterCount =
          rosterMode === 'COACH' ? team.members.length : team.members.length + 1
        const rosterFull = team.members.length >= maxPlayers
        const ratio =
          startingPoints && startingPoints > 0
            ? Math.max(0, Math.min(1, team.points / startingPoints))
            : null

        return (
          <Card
            key={team.captainId}
            onClick={
              onTeamClick ? () => onTeamClick(team.captainId) : undefined
            }
            className={cn(
              'game-panel game-card',
              isMine && 'game-panel-gold',
              isLeading &&
                'game-panel-gold shadow-[inset_0_0_28px_rgba(255,184,0,0.12)]',
              onTeamClick && 'cursor-pointer',
            )}
          >
            <CardContent className="p-3 space-y-2.5">
              {/* 헤더 — 크라운 배지 + 팀명 / 골드 포인트 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border',
                      isLeading
                        ? 'border-ow-gold/70 bg-ow-gold/15'
                        : 'border-ow-gold/40 bg-ow-gold/5',
                    )}
                  >
                    <Crown className="h-4 w-4 text-ow-gold" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black leading-tight">
                      {team.teamName ?? `${team.captainName} 팀`}
                    </p>
                    <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                      팀장 {team.captainName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {/* key 리마운트로 포인트 변경 시 팝 */}
                  <span
                    key={team.points}
                    className="bid-pop text-base font-black tabular-nums text-ow-gold leading-tight drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]"
                  >
                    {team.points.toLocaleString()}P
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold tabular-nums leading-tight',
                      rosterFull ? 'text-ow-red' : 'text-muted-foreground',
                    )}
                  >
                    {rosterCount}/{TEAM_SIZE}
                  </span>
                </div>
              </div>

              {/* 로스터 아바타 행 — 팀장 + 영입 선수 (샘플 스타일) */}
              <div className="flex items-end gap-1.5">
                {/* 팀장 아바타 (골드 링) */}
                <div className="flex flex-col items-center gap-0.5">
                  <Avatar className="h-9 w-9 border-2 border-ow-gold/60">
                    <AvatarImage src={team.captainAvatarUrl ?? undefined} />
                    <AvatarFallback className="bg-muted text-xs font-bold">
                      {team.captainName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-10 truncate text-[9px] text-ow-gold/90">
                    {team.captainName}
                  </span>
                </div>
                {/* 영입 선수 */}
                {team.members.map((m) => {
                  const isNew = newMemberIds.has(m.id)
                  return (
                    <motion.div
                      key={m.id}
                      layoutId={isNew ? `flight-card-${m.id}` : undefined}
                      layout={!reducedMotion}
                      initial={
                        isNew && !reducedMotion
                          ? { opacity: 0, scale: 0.6, rotateY: -90 }
                          : false
                      }
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : {
                              type: 'spring',
                              stiffness: 380,
                              damping: 22,
                              mass: 0.8,
                              layout: {
                                duration: 0.6,
                                ease: [0.22, 1, 0.36, 1],
                              },
                            }
                      }
                      className="flex flex-col items-center gap-0.5"
                    >
                      <Avatar
                        className={cn(
                          'h-9 w-9 border',
                          m.wasUnsold
                            ? 'border-muted-foreground/40'
                            : 'border-ow-blue/50',
                        )}
                      >
                        <AvatarImage
                          src={
                            (m.hero
                              ? (portraitByKey.get(m.hero) ?? undefined)
                              : undefined) ??
                            m.avatarUrl ??
                            undefined
                          }
                        />
                        <AvatarFallback className="bg-muted text-[10px] font-bold">
                          {m.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-10 truncate text-[9px] text-foreground/80">
                        {m.name}
                      </span>
                    </motion.div>
                  )
                })}
                {/* 빈 슬롯 */}
                {Array.from({
                  length: Math.max(0, maxPlayers - team.members.length),
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-ow-blue/25 text-[10px] text-muted-foreground/50"
                  >
                    ?
                  </div>
                ))}
              </div>

              {/* 잔여 포인트 에너지 게이지 */}
              {ratio !== null && (
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted/30"
                  role="progressbar"
                  aria-label={`잔여 포인트 ${team.points}/${startingPoints}`}
                  aria-valuenow={team.points}
                  aria-valuemin={0}
                  aria-valuemax={startingPoints}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      ratio > 0.5
                        ? 'progress-animated'
                        : ratio > 0.2
                          ? 'bg-yellow-400'
                          : 'bg-ow-red',
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              )}

              {/* 낙찰가 요약 — 최근 영입만 한 줄 */}
              {team.members.length > 0 && (
                <p className="truncate text-[10px] text-muted-foreground">
                  {team.members
                    .map(
                      (m) =>
                        `${m.name} ${m.wasUnsold ? '유찰' : `${m.price.toLocaleString()}P`}`,
                    )
                    .join(' · ')}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
