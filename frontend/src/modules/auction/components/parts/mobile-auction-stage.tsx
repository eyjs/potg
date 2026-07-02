'use client'

import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Badge } from '@/common/components/ui/badge'
import { Gavel, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHeroes } from '../../hooks/use-heroes'
import type { AuctionBidEvent, AuctionStageEvent } from '../../hooks/use-auction-socket'
import type { RoomStateBid, RoomStatePlayer } from '../../types'
import { BURST_PARTICLES, usePlayerCardStage } from '../../hooks/use-player-card-stage'
import { BidTimer } from './bid-timer'
import { MobileBidTicker } from './fx/mobile-bid-ticker'

interface Props {
  player: RoomStatePlayer | null
  currentBid: RoomStateBid | null
  biddingPhase: 'WAITING' | 'BIDDING' | 'SOLD'
  /** 낙찰/유찰 연출 트리거 — seq 증가 시 해당 kind 셀레브레이션 재생 */
  stageEvent?: AuctionStageEvent | null
  /** 최근 입찰 컴팩트 티커용 */
  bidEvents?: AuctionBidEvent[]
  /** 스테이지 도화선 타이머 바 남은 시간(초) */
  timerRemaining: number | null
  /** 게이지 비율 계산용 총 턴 시간(초). 없으면 BidTimer 기본 30초 폴백. */
  totalTime?: number
}

const ROLE_COLORS: Record<string, string> = {
  tank: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dps: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-green-500/20 text-green-400 border-green-500/30',
  flex: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

/**
 * 경매 탭 상단 고정 스테이지 HUD(모바일 전용) — 초상화 클로즈업 배경 + 오버레이.
 *
 * 데스크톱 `CurrentPlayerCard`와 동일한 `usePlayerCardStage` 상태 소스를 `ownerViewport: 'mobile'`로
 * 구독해 등급/콤보/셀레브레이션 판정과 사운드를 일치시킨다(task-001 §AD-1/AD-2) — 이 컴포넌트는
 * 판정 로직을 새로 만들지 않고 훅 반환값을 레이아웃에만 반영한다.
 */
export function MobileAuctionStage({
  player,
  currentBid,
  biddingPhase,
  stageEvent,
  bidEvents,
  timerRemaining,
  totalTime,
}: Props) {
  const { portraitByKey } = useHeroes()
  const stage = usePlayerCardStage({
    player,
    currentBid,
    biddingPhase,
    stageEvent,
    ownerViewport: 'mobile',
  })
  const {
    displayPlayer,
    frame,
    isFlipped,
    legendaryBurst,
    legendaryParticles,
    isActiveViewport,
    celebrate,
    seenSeq,
    comboCount,
    comboLevel,
    comboStage,
    shakeControls,
    reducedMotion,
  } = stage

  if (!displayPlayer) {
    return (
      <div className="game-panel relative flex h-full shrink-0 flex-col items-center justify-center overflow-hidden border-2 border-ow-blue/25">
        <Gavel className="mb-2 h-8 w-8 text-muted-foreground opacity-30" />
        <p className="text-xs text-muted-foreground">
          마스터가 매물을 선택하기를 기다리는 중...
        </p>
      </div>
    )
  }

  const roleKey = displayPlayer.role.toLowerCase()
  const isBidding = biddingPhase === 'BIDDING'
  const isSold = biddingPhase === 'SOLD'
  const portraitUrl =
    (displayPlayer.hero ? portraitByKey.get(displayPlayer.hero) : undefined) ??
    displayPlayer.avatarUrl ??
    undefined

  return (
    <motion.div animate={shakeControls} className="relative h-full shrink-0">
      <div
        className={cn(
          'game-panel relative h-full overflow-hidden border-2',
          'transition-[border-color,box-shadow] duration-300',
          isBidding && 'border-primary shadow-[inset_0_0_28px_rgba(255,184,0,0.08)]',
          isSold && 'border-ow-gold/70 game-panel-gold',
          !isBidding && !isSold && frame.cardBorder,
        )}
      >
        {/* ── 배경 초상화 — 팩 오프닝 플립(뒷면 실루엣 → 정면 클로즈업) ── */}
        <div className="absolute inset-0" style={{ perspective: 1000 }}>
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            initial={false}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* 뒷면 — 엠블럼 실루엣 */}
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ow-blue/20 to-transparent"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <Shield className="h-16 w-16 text-ow-blue/45" />
            </div>

            {/* 정면 — 초상화 전폭 클로즈업 */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: isFlipped ? 1 : 0 }}
              transition={
                reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut', delay: isFlipped ? 0.44 : 0 }
              }
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- 외부 CDN 초상화, next/image 도메인 설정 밖
                <img
                  src={portraitUrl}
                  alt={displayPlayer.name}
                  className={cn(
                    'h-full w-full object-cover object-top',
                    frame.avatarGlow,
                  )}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted/40 text-6xl font-black text-muted-foreground">
                  {displayPlayer.name[0]}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* ── 가독성 그라디언트 ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        />

        {/* ── 상단 오버레이: 역할/등급 뱃지 ── */}
        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('text-[10px]', ROLE_COLORS[roleKey] || ROLE_COLORS.flex)}>
            {displayPlayer.role.toUpperCase()}
          </Badge>
          {frame.badgeLabel && frame.pulse && (
            <Badge variant="outline" className={cn('text-[10px]', frame.badgeClass)}>
              {frame.badgeLabel}
            </Badge>
          )}
        </div>

        {/* ── 하단 오버레이: 이름 + 현재가 + 선두 + 티커 + 타이머 바 ── */}
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3 pb-2">
          <h3 className="truncate text-2xl font-black italic uppercase tracking-tighter text-foreground drop-shadow-[0_0_14px_rgba(0,195,255,0.25)]">
            {displayPlayer.name}
          </h3>

          <div className="neon-frame relative w-full bg-ow-blue/[0.04] px-3 py-2">
            <AnimatePresence>
              {comboCount >= 2 && (
                <motion.span
                  key={comboCount}
                  initial={{ opacity: 0, y: -4, scale: 0.85 }}
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
                          scale:
                            comboLevel >= 2
                              ? { duration: 1.2, repeat: Infinity }
                              : { type: 'spring', stiffness: 500, damping: 22 },
                        }
                  }
                  className={cn(
                    'absolute right-1 top-1 rounded border bg-black/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm',
                    comboStage.badgeClass || 'text-ow-blue border-ow-blue/50',
                  )}
                >
                  COMBO x{comboCount}
                  {comboLevel >= 3 ? '!!' : ''}
                </motion.span>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-start">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">현재 입찰가</span>
                <motion.span
                  key={currentBid?.amount ?? 0}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : { scale: comboStage.overshoot, rotate: comboLevel >= 2 ? -3 : -1.5, opacity: 0.4 }
                  }
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={
                    reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 16, mass: 0.6 }
                  }
                  className="bid-pop inline-block text-3xl font-black tabular-nums text-ow-gold drop-shadow-[0_0_14px_rgba(255,184,0,0.5)]"
                >
                  {currentBid ? currentBid.amount.toLocaleString() : '0'}
                  <span className="ml-1 text-base">P</span>
                </motion.span>
              </div>
              <div className="flex max-w-[40%] flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">입찰 선두</span>
                <span className="w-full truncate text-right text-base font-black text-ow-blue drop-shadow-[0_0_10px_rgba(0,195,255,0.4)]">
                  {currentBid ? currentBid.bidderName : '—'}
                </span>
              </div>
            </div>
          </div>

          {bidEvents && bidEvents.length > 0 && (
            <MobileBidTicker bidEvents={bidEvents} limit={3} />
          )}

          <BidTimer
            variant="bar"
            showNumber={false}
            soundEnabled={false}
            remainingTime={timerRemaining}
            totalTime={totalTime}
            phase={biddingPhase}
          />
        </div>

        {/* ── 낙찰(골드)/유찰(레드) 셀레브레이션 오버레이 ── */}
        <AnimatePresence>
          {celebrate && (
            <motion.div
              key={`mobile-stage-celebration-${seenSeq}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-black/45" />
              {celebrate === 'sold' && (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.45, ease: 'easeOut' }}
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, rgba(255,184,0,0.08) 0%, transparent 60%)' }}
                />
              )}
              <div
                className={cn(
                  'flash-burst absolute inset-0',
                  celebrate === 'sold'
                    ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(255,214,90,0.55)_0%,transparent_55%)]'
                    : 'bg-[radial-gradient(circle_at_50%_42%,rgba(255,70,73,0.45)_0%,transparent_55%)]',
                )}
              />
              <div
                className={cn(
                  'ring-expand absolute left-1/2 top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-4',
                  celebrate === 'sold' ? 'border-ow-gold/80' : 'border-ow-red/80',
                )}
              />
              <div
                className={cn(
                  'ring-expand absolute left-1/2 top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
                  celebrate === 'sold' ? 'border-ow-blue/60' : 'border-ow-red/40',
                )}
                style={{ animationDelay: '0.12s' }}
              />
              {BURST_PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    'burst-particle absolute left-1/2 top-[42%] h-1.5 w-1.5 rounded-full',
                    celebrate === 'sold' ? 'bg-ow-gold' : 'bg-ow-red',
                  )}
                  style={
                    {
                      '--burst-x': `${p.x}px`,
                      '--burst-y': `${p.y}px`,
                      animationDelay: `${p.delay}s`,
                      boxShadow: celebrate === 'sold' ? '0 0 8px rgba(255,184,0,0.9)' : '0 0 8px rgba(255,70,73,0.9)',
                    } as React.CSSProperties
                  }
                />
              ))}
              <motion.div
                initial={{ scale: 2, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: -4 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}
                className={cn(
                  'relative rounded-sm border-4 bg-black/60 px-5 py-2 backdrop-blur-sm',
                  celebrate === 'sold' ? 'border-ow-gold' : 'border-ow-red',
                )}
              >
                <span
                  className={cn(
                    'text-3xl font-black italic uppercase tracking-tighter',
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
      </div>

      {/* ── 전설급 공개 — 전체화면 플래시 + 파티클 (스테이지 clip 밖, portal) ──
          훅이 isActiveViewport(현재 뷰포트가 모바일일 때만)로 게이트하므로 데스크톱과
          동시에 중복 발화하지 않는다 — 여기서 사운드를 직접 호출하지 않는다. */}
      {legendaryBurst &&
        isActiveViewport &&
        !reducedMotion &&
        typeof document !== 'undefined' &&
        createPortal(
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="flash-burst absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 45%, rgba(255,224,140,0.65) 0%, transparent 60%)',
                opacity: 0.4,
              }}
            />
            {legendaryParticles.map((p, i) => (
              <span
                key={i}
                className="burst-particle absolute left-1/2 top-[45%] h-2 w-2 rounded-full bg-ow-gold"
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
