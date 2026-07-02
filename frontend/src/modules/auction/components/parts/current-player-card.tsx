'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHeroes } from '../../hooks/use-heroes'
import type { AuctionStageEvent } from '../../hooks/use-auction-socket'
import type { RoomStateBid, RoomStatePlayer } from '../../types'

interface Props {
  player: RoomStatePlayer | null
  currentBid: RoomStateBid | null
  biddingPhase: 'WAITING' | 'BIDDING' | 'SOLD'
  /** 낙찰/유찰 연출 트리거 — seq 증가 시 해당 kind 셀레브레이션 재생 */
  stageEvent?: AuctionStageEvent | null
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const PHASE_LABEL: Record<Props['biddingPhase'], string> = {
  WAITING: '다음 매물 대기',
  BIDDING: '입찰 진행 중',
  SOLD: '낙찰',
}

/** 낙찰 에너지 버스트 파티클 — index 기반 각도 (렌더 결정적) */
const BURST_PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2
  const dist = 90 + (i % 3) * 34
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist),
    delay: (i % 4) * 0.04,
  }
})

/**
 * 중앙 무대 — 매물이 홀로그램 플랫폼 위에 떠 있는 게임 오브젝트처럼 보인다.
 * - 플랫폼: 시안 에너지 코어 + 서로 다른 속도로 회전하는 링 2개 + 위로 뻗는 광선
 * - 매물 아바타는 float-slow 로 미세하게 부유
 * - BIDDING→SOLD 전이 시 낙찰 셀레브레이션 (베일→골드 링 확산→빛 폭발→스탬프→파티클)
 */
export function CurrentPlayerCard({
  player,
  currentBid,
  biddingPhase,
  stageEvent,
}: Props) {
  const { portraitByKey } = useHeroes()

  // 낙찰/유찰 이벤트(seq 증가) 감지 → 셀레브레이션 재생 (렌더 중 상태 보정 패턴).
  // 유찰 시 roomState 가 즉시 player=null 로 바뀌므로 마지막 매물을 스냅샷해
  // 연출 동안 계속 보여준다 — "그냥 사라지는" 문제 방지.
  const [lastPlayer, setLastPlayer] = useState<RoomStatePlayer | null>(null)
  if (player && player.id !== lastPlayer?.id) setLastPlayer(player)

  const [seenSeq, setSeenSeq] = useState(stageEvent?.seq ?? 0)
  const [celebrate, setCelebrate] = useState<'sold' | 'pass' | null>(null)
  if (stageEvent && stageEvent.seq !== seenSeq) {
    setSeenSeq(stageEvent.seq)
    setCelebrate(stageEvent.kind)
  }
  useEffect(() => {
    if (!celebrate) return
    const t = setTimeout(() => setCelebrate(null), 1700)
    return () => clearTimeout(t)
  }, [celebrate])

  // 연출 중에는 방금 처리된 매물을 유지해서 보여준다
  const displayPlayer = player ?? (celebrate ? lastPlayer : null)

  if (!displayPlayer) {
    return (
      <Card className="bg-card/80 border-border border-dashed backdrop-blur-sm">
        <CardContent className="py-14 text-center">
          {/* 대기 홀로그램 — 빈 플랫폼이 은은하게 숨쉰다 */}
          <div className="relative mx-auto mb-4 h-10 w-44">
            <div className="absolute inset-x-0 top-1/2 h-full -translate-y-1/2 scale-y-[0.3]">
              <div className="ring-spin absolute inset-0 rounded-full border border-dashed border-ow-blue/30" />
              <div className="absolute inset-4 rounded-full bg-[radial-gradient(ellipse,rgba(0,195,255,0.18)_0%,transparent_70%)] animate-pulse-slow" />
            </div>
          </div>
          <Gavel className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-muted-foreground text-sm">
            마스터가 매물을 선택하기를 기다리는 중...
          </p>
        </CardContent>
      </Card>
    )
  }

  const roleKey = displayPlayer.role.toLowerCase()
  const isBidding = biddingPhase === 'BIDDING'
  const isSold = biddingPhase === 'SOLD'

  return (
    <Card
      className={cn(
        'game-panel relative overflow-hidden border-2',
        'transition-[border-color,box-shadow] duration-300',
        isBidding &&
          'border-primary shadow-[inset_0_0_44px_rgba(255,184,0,0.08)]',
        isSold && 'border-green-500/70',
        biddingPhase === 'WAITING' && 'border-ow-blue/25',
      )}
    >
      <CardContent className="p-6 pb-8 flex flex-col items-center text-center gap-3">
        {/* ── 홀로그램 무대 ─────────────────────────────────────── */}
        <div className="relative flex flex-col items-center pt-2">
          {/* 광선 — 플랫폼에서 위로 뻗는 에너지 콘 */}
          <div
            aria-hidden
            className={cn(
              'beam-pulse pointer-events-none absolute bottom-4 left-1/2 h-60 w-44 -translate-x-1/2',
              isSold && 'opacity-40',
            )}
            style={{
              background: isBidding
                ? 'linear-gradient(to top, rgba(255,184,0,0.22) 0%, rgba(0,195,255,0.16) 45%, transparent 78%)'
                : 'linear-gradient(to top, rgba(0,195,255,0.22) 0%, rgba(0,195,255,0.08) 50%, transparent 78%)',
              clipPath: 'polygon(24% 100%, 76% 100%, 100% 0, 0 0)',
              filter: 'blur(7px)',
            }}
          />

          {/* 매물 아바타 — 부유 */}
          <div className="float-slow relative z-10">
            <Avatar
              className={cn(
                'w-44 h-44 border-4 transition-colors duration-300',
                isBidding ? 'border-primary/60 pulse-live' : 'border-ow-blue/40',
                isSold && 'border-green-500/60',
              )}
            >
              <AvatarImage
                src={
                  (displayPlayer.hero
                    ? portraitByKey.get(displayPlayer.hero)
                    : undefined) ??
                  displayPlayer.avatarUrl ??
                  undefined
                }
                alt={displayPlayer.name}
              />
              <AvatarFallback className="bg-muted text-6xl font-black">
                {displayPlayer.name[0]}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* 플랫폼 — 회전 링 + 에너지 코어 */}
          <div aria-hidden className="relative -mt-5 h-14 w-64">
            <div className="absolute inset-x-0 top-1/2 h-full -translate-y-1/2 scale-y-[0.3]">
              <div
                className={cn(
                  'ring-spin absolute inset-0 rounded-full border-2 border-dashed',
                  isBidding ? 'border-primary/50' : 'border-ow-blue/45',
                )}
              />
              <div
                className={cn(
                  'ring-spin-rev absolute inset-3 rounded-full border',
                  isBidding ? 'border-ow-blue/50' : 'border-ow-blue/30',
                )}
              />
              <div
                className={cn(
                  'beam-pulse absolute inset-7 rounded-full',
                  isSold
                    ? 'bg-[radial-gradient(ellipse,rgba(34,197,94,0.5)_0%,transparent_72%)]'
                    : 'bg-[radial-gradient(ellipse,rgba(0,195,255,0.55)_0%,rgba(0,195,255,0.12)_55%,transparent_75%)]',
                )}
              />
            </div>
          </div>
        </div>

        {/* ── 매물 정보 ─────────────────────────────────────────── */}
        <div className="space-y-1">
          <Badge
            variant="outline"
            className={cn('text-xs', ROLE_COLORS[roleKey] || ROLE_COLORS.flex)}
          >
            {displayPlayer.role.toUpperCase()}
          </Badge>
          <h3 className="text-4xl font-black italic uppercase tracking-tighter drop-shadow-[0_0_14px_rgba(0,195,255,0.25)]">
            {displayPlayer.name}
          </h3>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {PHASE_LABEL[biddingPhase]}
          </p>
        </div>

        {/* ── 입찰가 패널 — 샘플의 2컬럼 프레임 (현재 입찰가 | 입찰 선두) ── */}
        <div className="neon-frame w-full bg-ow-blue/[0.04] px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-start">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                현재 입찰가
              </span>
              <span
                key={currentBid?.amount ?? 0}
                className="bid-pop text-5xl font-black tabular-nums text-ow-gold drop-shadow-[0_0_14px_rgba(255,184,0,0.5)]"
              >
                {currentBid ? currentBid.amount.toLocaleString() : '0'}
                <span className="text-2xl ml-1">P</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                입찰 선두
              </span>
              <span className="max-w-40 truncate text-xl font-black text-ow-blue drop-shadow-[0_0_10px_rgba(0,195,255,0.4)]">
                {currentBid ? currentBid.bidderName : '—'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* ── 낙찰(골드)/유찰(레드) 셀레브레이션 오버레이 ─────────── */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            key={`stage-celebration-${seenSeq}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            {/* 어두워지는 베일 */}
            <div className="absolute inset-0 bg-black/45" />
            {/* 빛 폭발 */}
            <div
              className={cn(
                'flash-burst absolute inset-0',
                celebrate === 'sold'
                  ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(255,214,90,0.55)_0%,transparent_55%)]'
                  : 'bg-[radial-gradient(circle_at_50%_42%,rgba(255,70,73,0.45)_0%,transparent_55%)]',
              )}
            />
            {/* 링 확산 */}
            <div
              className={cn(
                'ring-expand absolute left-1/2 top-[42%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-4',
                celebrate === 'sold' ? 'border-ow-gold/80' : 'border-ow-red/80',
              )}
            />
            <div
              className={cn(
                'ring-expand absolute left-1/2 top-[42%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
                celebrate === 'sold' ? 'border-ow-blue/60' : 'border-ow-red/40',
              )}
              style={{ animationDelay: '0.12s' }}
            />
            {/* 에너지 파티클 */}
            {BURST_PARTICLES.map((p, i) => (
              <span
                key={i}
                className={cn(
                  'burst-particle absolute left-1/2 top-[42%] h-2 w-2 rounded-full',
                  celebrate === 'sold' ? 'bg-ow-gold' : 'bg-ow-red',
                )}
                style={
                  {
                    '--burst-x': `${p.x}px`,
                    '--burst-y': `${p.y}px`,
                    animationDelay: `${p.delay}s`,
                    boxShadow:
                      celebrate === 'sold'
                        ? '0 0 8px rgba(255,184,0,0.9)'
                        : '0 0 8px rgba(255,70,73,0.9)',
                  } as React.CSSProperties
                }
              />
            ))}
            {/* 스탬프 */}
            <motion.div
              initial={{ scale: 2.2, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}
              className={cn(
                'relative rounded-sm border-4 bg-black/60 px-8 py-3 backdrop-blur-sm',
                celebrate === 'sold' ? 'border-ow-gold' : 'border-ow-red',
              )}
            >
              <span
                className={cn(
                  'text-5xl font-black italic uppercase tracking-tighter',
                  celebrate === 'sold'
                    ? 'text-ow-gold drop-shadow-[0_0_18px_rgba(255,184,0,0.8)]'
                    : 'text-ow-red drop-shadow-[0_0_18px_rgba(255,70,73,0.8)]',
                )}
              >
                {celebrate === 'sold' ? '낙찰!' : '유찰'}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
