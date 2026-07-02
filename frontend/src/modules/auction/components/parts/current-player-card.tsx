'use client'

import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, CardContent } from '@/common/components/ui/card'
import { Badge } from '@/common/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/common/components/ui/avatar'
import { Gavel, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHeroes } from '../../hooks/use-heroes'
import type { AuctionStageEvent } from '../../hooks/use-auction-socket'
import type { RoomStateBid, RoomStatePlayer } from '../../types'
import { BURST_PARTICLES, usePlayerCardStage } from '../../hooks/use-player-card-stage'

/** flight-in layoutId 공유를 위한 motion 승격 Card (React 19: ref는 일반 prop으로 전달됨). */
const MotionCard = motion(Card)

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

/**
 * 중앙 무대 — 매물이 홀로그램 플랫폼 위에 떠 있는 게임 오브젝트처럼 보인다.
 * - 플랫폼: 시안 에너지 코어 + 서로 다른 속도로 회전하는 링 2개 + 위로 뻗는 광선
 * - 매물 아바타는 float-slow 로 미세하게 부유
 * - 매물 전환 시 팩 오프닝(뒷면→3D 플립→정면+등급 프레임, 전설급은 플래시/파티클/사운드)
 * - 입찰 시 금액 임팩트 + 화면 흔들림 + 콤보 배지(로컬 계산, task-001과 동일 상수)
 * - BIDDING→SOLD 전이 시 낙찰 셀레브레이션(베일→골드 링 확산→빛 폭발→스탬프→파티클) + 골든 변신
 *   + flight-in 소스 layoutId(사이드바 신규 멤버 슬롯으로 morph, task-002 결합)
 */
export function CurrentPlayerCard({
  player,
  currentBid,
  biddingPhase,
  stageEvent,
}: Props) {
  const { portraitByKey } = useHeroes()
  const stage = usePlayerCardStage({ player, currentBid, biddingPhase, stageEvent, ownerViewport: 'desktop' })
  const {
    displayPlayer,
    rarity,
    frame,
    isFlipped,
    legendaryBurst,
    legendaryParticles,
    isDesktop,
    celebrate,
    seenSeq,
    comboCount,
    comboLevel,
    comboStage,
    shakeControls,
    reducedMotion,
    flightLayoutId,
  } = stage

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
  const isWaiting = biddingPhase === 'WAITING'

  return (
    <motion.div animate={shakeControls}>
      <MotionCard
        layoutId={flightLayoutId}
        transition={{ layout: reducedMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
        className={cn(
          'game-panel relative overflow-hidden border-2',
          'transition-[border-color,box-shadow] duration-300',
          isBidding &&
            'border-primary shadow-[inset_0_0_44px_rgba(255,184,0,0.08)]',
          isSold && 'border-ow-gold/70 game-panel-gold',
          isWaiting && frame.cardBorder,
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

            {/* 매물 아바타 — 팩 오프닝 3D 플립 (뒷면 실루엣 → 정면 아트) */}
            <div
              className="float-slow relative z-10"
              style={{ perspective: 1000 }}
            >
              <motion.div
                style={{ transformStyle: 'preserve-3d', position: 'relative' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                initial={false}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 0.44, ease: [0.22, 1, 0.36, 1] }
                }
              >
                {/* 뒷면 — 엠블럼 실루엣 */}
                <div
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-ow-blue/40 bg-gradient-to-br from-ow-blue/20 to-transparent"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <Shield className="h-16 w-16 text-ow-blue/45" />
                </div>

                {/* 정면 — 대표 영웅 아트 + 등급 프레임 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isFlipped ? 1 : 0 }}
                  transition={
                    reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut', delay: isFlipped ? 0.44 : 0 }
                  }
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <Avatar
                    className={cn(
                      'w-44 h-44 border-4 transition-colors duration-300',
                      frame.avatarBorder,
                      frame.avatarGlow,
                      rarity === 'legendary' && !reducedMotion && 'pulse-glow',
                      isBidding && 'border-primary/60 pulse-live',
                      isSold && 'border-ow-gold/70',
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
                </motion.div>
              </motion.div>
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
                      ? 'bg-[radial-gradient(ellipse,rgba(255,184,0,0.5)_0%,transparent_72%)]'
                      : 'bg-[radial-gradient(ellipse,rgba(0,195,255,0.55)_0%,rgba(0,195,255,0.12)_55%,transparent_75%)]',
                  )}
                />
              </div>
            </div>
          </div>

          {/* ── 매물 정보 ─────────────────────────────────────────── */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={cn('text-xs', ROLE_COLORS[roleKey] || ROLE_COLORS.flex)}
              >
                {displayPlayer.role.toUpperCase()}
              </Badge>
              {isWaiting && rarity !== 'common' && (
                <Badge variant="outline" className={cn('text-[10px]', frame.badgeClass)}>
                  {frame.badgeLabel}
                </Badge>
              )}
            </div>
            <h3 className="text-4xl font-black italic uppercase tracking-tighter drop-shadow-[0_0_14px_rgba(0,195,255,0.25)]">
              {displayPlayer.name}
            </h3>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {PHASE_LABEL[biddingPhase]}
            </p>
          </div>

          {/* ── 입찰가 패널 — 샘플의 2컬럼 프레임 (현재 입찰가 | 입찰 선두) ── */}
          <div className="neon-frame relative w-full bg-ow-blue/[0.04] px-5 py-3">
            {/* 콤보 배지 */}
            <AnimatePresence>
              {comboCount >= 2 && (
                <motion.span
                  key={comboCount}
                  initial={{ opacity: 0, y: -6, scale: 0.85 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: comboLevel >= 2 && !reducedMotion ? [1, comboStage.badgeScale, 1] : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={
                    reducedMotion
                      ? { duration: 0.1 }
                      : {
                          opacity: { type: 'spring', stiffness: 500, damping: 22 },
                          y: { type: 'spring', stiffness: 500, damping: 22 },
                          scale: comboLevel >= 2 ? { duration: 1.2, repeat: Infinity } : { type: 'spring', stiffness: 500, damping: 22 },
                        }
                  }
                  className={cn(
                    'absolute right-1 top-1 rounded border bg-black/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm',
                    comboStage.badgeClass || 'text-ow-blue border-ow-blue/50',
                  )}
                >
                  COMBO x{comboCount}
                  {comboLevel >= 3 ? '!!' : ''}
                </motion.span>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  현재 입찰가
                </span>
                <motion.span
                  key={currentBid?.amount ?? 0}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : { scale: comboStage.overshoot, rotate: comboLevel >= 2 ? -3 : -1.5, opacity: 0.4 }
                  }
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={
                    reducedMotion
                      ? { duration: 0.15 }
                      : { type: 'spring', stiffness: 420, damping: 16, mass: 0.6 }
                  }
                  className="bid-pop inline-block text-5xl font-black tabular-nums text-ow-gold drop-shadow-[0_0_14px_rgba(255,184,0,0.5)]"
                >
                  {currentBid ? currentBid.amount.toLocaleString() : '0'}
                  <span className="text-2xl ml-1">P</span>
                </motion.span>
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
              {/* 골든 변신 배경 그라데이션 (낙찰 전용, motion-spec §4.2) */}
              {celebrate === 'sold' && (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeOut' }}
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,184,0,0.08) 0%, transparent 60%)',
                  }}
                />
              )}
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
      </MotionCard>

      {/* ── 전설급 공개 — 전체화면 플래시 + 파티클 (카드 clip 밖, portal) ── */}
      {legendaryBurst &&
        !reducedMotion &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center"
          >
            <div
              className="flash-burst absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 45%, rgba(255,224,140,0.65) 0%, transparent 60%)`,
                opacity: isDesktop ? undefined : 0.4,
              }}
            />
            {legendaryParticles.map((p, i) => (
              <span
                key={i}
                className="burst-particle absolute left-1/2 top-[45%] h-2.5 w-2.5 rounded-full bg-ow-gold"
                style={
                  {
                    '--burst-x': `${p.x}px`,
                    '--burst-y': `${p.y}px`,
                    animationDelay: `${p.delay}s`,
                    boxShadow: '0 0 10px rgba(255,184,0,0.95)',
                  } as React.CSSProperties
                }
              />
            ))}
          </div>,
          document.body,
        )}
    </motion.div>
  )
}
