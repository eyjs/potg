'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnimation, useReducedMotion } from 'framer-motion'
import type { AuctionStageEvent } from './use-auction-socket'
import type { RoomStateBid, RoomStatePlayer } from '../types'
import { getCardRarity, RARITY_FRAME } from '../components/parts/card-rarity'
import type { CardRarity, RarityFrame } from '../components/parts/card-rarity'
import { COMBO_WINDOW_MS, bidComboLevel, playRevealLegendary } from './auction-audio-engine'

/** 낙찰 에너지 버스트 파티클 — index 기반 각도 (렌더 결정적) */
export const BURST_PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2
  const dist = 90 + (i % 3) * 34
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist),
    delay: (i % 4) * 0.04,
  }
})

/** 전설 공개 파티클(데스크톱) — 24개, 더 크고 멀리 (motion-spec §1.4) */
export const LEGENDARY_PARTICLES_DESKTOP = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2
  const dist = 140 + (i % 4) * 46
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist),
    delay: (i % 6) * 0.03,
  }
})

/** 전설 공개 파티클(모바일) — 원래 12개 개수/반경 유지 (motion-spec §1.4 모바일 축소) */
export const LEGENDARY_PARTICLES_MOBILE = BURST_PARTICLES

/** 콤보 단계별 연출 강도 테이블 (motion-spec §2.2, task-001 bidComboLevel과 동일 임계값) */
export const COMBO_STAGE = {
  0: { amp: 4, durationMs: 80, overshoot: 1.15, badgeScale: 1, badgeClass: '' },
  1: {
    amp: 4.5,
    durationMs: 90,
    overshoot: 1.2,
    badgeScale: 1,
    badgeClass: 'text-ow-blue border-ow-blue/60',
  },
  2: {
    amp: 5.5,
    durationMs: 105,
    overshoot: 1.28,
    badgeScale: 1.08,
    badgeClass: 'text-ow-orange border-ow-orange/70',
  },
  3: {
    amp: 6,
    durationMs: 120,
    overshoot: 1.38,
    badgeScale: 1.18,
    badgeClass:
      'text-ow-gold border-ow-gold/80 drop-shadow-[0_0_10px_rgba(255,184,0,0.6)]',
  },
} as const

export type ComboLevel = 0 | 1 | 2 | 3

export type StageOwnerViewport = 'desktop' | 'mobile'

interface UsePlayerCardStageArgs {
  player: RoomStatePlayer | null
  currentBid: RoomStateBid | null
  biddingPhase: 'WAITING' | 'BIDDING' | 'SOLD'
  /** 낙찰/유찰 연출 트리거 — seq 증가 시 해당 kind 셀레브레이션 재생 */
  stageEvent?: AuctionStageEvent | null
  /** 이 훅 인스턴스를 소유한 뷰포트 — 뷰포트 폭과 일치할 때만 사운드/전설 portal이 발화한다 */
  ownerViewport: StageOwnerViewport
}

interface UsePlayerCardStageResult {
  lastPlayer: RoomStatePlayer | null
  displayPlayer: RoomStatePlayer | null
  rarity: CardRarity
  frame: RarityFrame
  isFlipped: boolean
  legendaryBurst: boolean
  legendaryParticles: typeof LEGENDARY_PARTICLES_DESKTOP
  isDesktop: boolean
  isActiveViewport: boolean
  celebrate: 'sold' | 'pass' | null
  seenSeq: number
  comboCount: number
  comboLevel: ComboLevel
  comboStage: (typeof COMBO_STAGE)[ComboLevel]
  shakeControls: ReturnType<typeof useAnimation>
  reducedMotion: boolean | null
  flightLayoutId: string | undefined
}

/**
 * 매물 카드 연출 상태 SSOT — `CurrentPlayerCard`(데스크톱)와 `MobileAuctionStage`(모바일)가
 * 동일 훅을 구독해 등급/콤보/타이밍/사운드를 일치시킨다(task-001 §AD-1/AD-2).
 *
 * `ownerViewport`가 현재 뷰포트 폭과 일치하는 인스턴스에서만 `playRevealLegendary()` 사운드와
 * 전설 전체화면 플래시 portal 렌더 조건(`isActiveViewport`)이 참이 되어, 데스크톱/모바일
 * 이중 마운트 시 사운드/portal 중복 발화를 방어한다(P0-⑥).
 */
export function usePlayerCardStage({
  player,
  currentBid,
  biddingPhase: _biddingPhase,
  stageEvent,
  ownerViewport,
}: UsePlayerCardStageArgs): UsePlayerCardStageResult {
  const reducedMotion = useReducedMotion()

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

  // ── 데스크톱 판정 (motion-spec: matchMedia('(min-width:1024px)')) ──────
  const [isDesktop, setIsDesktop] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // 뷰포트 폭 기준(탭 가시성 아님) — 현재 뷰포트에 대응하는 인스턴스 1개만 active.
  const isActiveViewport = ownerViewport === (isDesktop ? 'desktop' : 'mobile')

  // ── 팩 오프닝(P0-1): 뒷면→플립→정면 + 등급 프레임 + 전설 시퀀스 ─────────
  const rarity = useMemo(
    () => (lastPlayer ? getCardRarity(lastPlayer.id) : 'common'),
    // 등급은 매물 id의 순수 함수이므로 id만 추적한다(전체 lastPlayer 객체를 넣으면 매 렌더 재계산돼 아바타 렌더와 어긋남)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastPlayer?.id],
  )
  const [isFlipped, setIsFlipped] = useState(false)
  const [legendaryBurst, setLegendaryBurst] = useState(false)
  const legendaryFiredRef = useRef<string | null>(null)

  useEffect(() => {
    if (!lastPlayer) return
    const currentRarity = getCardRarity(lastPlayer.id)
    const timers: ReturnType<typeof setTimeout>[] = []

    if (reducedMotion) {
      // reduced-motion: 플립 생략, 즉시 정면 상태 + 정적 등급 프레임. 사운드는 그대로.
      setIsFlipped(true)
      if (
        currentRarity === 'legendary' &&
        legendaryFiredRef.current !== lastPlayer.id &&
        isActiveViewport
      ) {
        legendaryFiredRef.current = lastPlayer.id
        playRevealLegendary()
      }
      return
    }

    setIsFlipped(false)
    timers.push(setTimeout(() => setIsFlipped(true), 120))

    if (currentRarity === 'legendary') {
      timers.push(
        setTimeout(() => {
          if (legendaryFiredRef.current === lastPlayer.id) return
          legendaryFiredRef.current = lastPlayer.id
          if (isActiveViewport) {
            playRevealLegendary()
          }
          setLegendaryBurst(true)
          timers.push(setTimeout(() => setLegendaryBurst(false), 900))
        }, 560),
      )
    }

    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPlayer?.id, reducedMotion, isActiveViewport])

  const legendaryParticles = isDesktop
    ? LEGENDARY_PARTICLES_DESKTOP
    : LEGENDARY_PARTICLES_MOBILE

  // ── 입찰 임팩트 + 콤보(P0-2, AD-3 로컬 계산) ────────────────────────
  const comboTimestampsRef = useRef<number[]>([])
  const prevBidAmountRef = useRef<number | null>(null)
  const [comboCount, setComboCount] = useState(0)
  const comboLevel = bidComboLevel(comboCount)
  const shakeControls = useAnimation()

  // 매물 전환 시 콤보 버퍼 리셋
  useEffect(() => {
    comboTimestampsRef.current = []
    prevBidAmountRef.current = null
    setComboCount(0)
  }, [lastPlayer?.id])

  useEffect(() => {
    if (!currentBid) return
    if (prevBidAmountRef.current === currentBid.amount) return
    prevBidAmountRef.current = currentBid.amount

    const now = Date.now()
    const active = comboTimestampsRef.current.filter((t) => now - t < COMBO_WINDOW_MS)
    active.push(now)
    comboTimestampsRef.current = active
    setComboCount(active.length)

    const level = bidComboLevel(active.length)
    const stage = COMBO_STAGE[level]

    if (!reducedMotion) {
      const amp = isDesktop ? stage.amp : stage.amp * 0.5
      shakeControls.start({
        x: [0, -amp, amp, -amp * 0.6, 0],
        transition: { duration: stage.durationMs / 1000, ease: 'easeOut' },
      })
    }

    // 콤보 윈도우 자연 만료 시 카운트 리셋
    const expireTimer = setTimeout(() => {
      const remain = comboTimestampsRef.current.filter(
        (ts) => Date.now() - ts < COMBO_WINDOW_MS,
      )
      comboTimestampsRef.current = remain
      setComboCount(remain.length)
    }, COMBO_WINDOW_MS + 50)

    return () => clearTimeout(expireTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBid, isDesktop, reducedMotion])

  // 연출 중에는 방금 처리된 매물을 유지해서 보여준다
  const displayPlayer = player ?? (celebrate ? lastPlayer : null)

  const frame = RARITY_FRAME[rarity]
  const comboStage = COMBO_STAGE[comboLevel]
  const flightLayoutId = celebrate === 'sold' && lastPlayer ? `flight-card-${lastPlayer.id}` : undefined

  return {
    lastPlayer,
    displayPlayer,
    rarity,
    frame,
    isFlipped,
    legendaryBurst,
    legendaryParticles,
    isDesktop,
    isActiveViewport,
    celebrate,
    seenSeq,
    comboCount,
    comboLevel,
    comboStage,
    shakeControls,
    reducedMotion,
    flightLayoutId,
  }
}
