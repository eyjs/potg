'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { startFuseCrackle, stopFuseCrackle } from '../../hooks/auction-audio-engine'

interface Props {
  remainingTime: number | null
  /** 총 턴 시간(초) — 게이지 비율/색 계산용. 없으면 30 기준 폴백. */
  totalTime?: number
  /** 입찰 단계 — SOLD 면 0(종료)으로 고정, WAITING 이면 대기(--) 표시. */
  phase?: 'WAITING' | 'BIDDING' | 'SOLD'
  size?: 'sm' | 'lg'
}

/** 스파크 개수(데스크톱 3개/모바일 2개) 판정 기준 — Tailwind `lg` 브레이크포인트와 동일. */
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

/** 스파크 index 기반 결정적 방향(각도) — `.burst-particle` 패턴과 동일 방식. */
function sparkOffset(index: number): { x: string; y: string } {
  const angleDeg = -70 + index * 55
  const angleRad = (angleDeg * Math.PI) / 180
  const distance = 12
  const x = Math.round(Math.cos(angleRad) * distance)
  const y = Math.round(Math.sin(angleRad) * distance) - 6
  return { x: `${x}px`, y: `${y}px` }
}

/**
 * 입찰 타이머.
 * - 남은 시간 비율에 따라 초록(여유)→빨강(임박) 그라데이션 게이지가 줄어든다.
 * - 5초 이하: 긴급(pulse + ring + glow) — 마감 임박 강조 (막판 입찰 유도).
 *   게이지 끝단에 불꽃/스파크 + 연소 텍스처(도화선 연출) + 지지직 크래클 사운드가 동반된다.
 * - 0초: "종료" + 강조 (자동 낙찰 순간).
 * - role=timer + aria-live 로 스크린리더에 남은 시간/종료 안내.
 */
export function BidTimer({
  remainingTime: remainingTimeRaw,
  totalTime,
  phase,
  size = 'lg',
}: Props) {
  // 단계 기반 보정 — 낙찰 직후 마지막 숫자에 얼어붙지 않도록 SOLD=0, WAITING=대기.
  const remainingTime =
    phase === 'SOLD' ? 0 : phase === 'WAITING' ? null : remainingTimeRaw
  const value = remainingTime ?? 0
  const total = totalTime && totalTime > 0 ? totalTime : 30
  const fraction = Math.max(0, Math.min(1, value / total))
  const isUrgent = remainingTime !== null && value <= 5 && value > 0
  const isEnded = remainingTime !== null && value <= 0

  // 남은 비율 → 색상(hue): 120°(초록) → 0°(빨강).
  const hue = Math.round(120 * fraction)
  const barColor = `hsl(${hue} 85% 45%)`

  const numberColor =
    remainingTime === null
      ? 'text-muted-foreground'
      : value > 20
        ? 'text-primary'
        : value > 10
          ? 'text-yellow-400'
          : 'text-ow-red'

  const srLabel =
    remainingTime === null
      ? '입찰 대기 중'
      : isEnded
        ? '시간 종료, 자동 낙찰됩니다'
        : `${value}초 남음`

  // 데스크톱(lg 이상)에서만 스파크 3개, 그 외(모바일)는 2개 — motion-spec §3.2.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])
  const sparkCount = isDesktop ? 3 : 2

  // 도화선 크래클 사운드 — isUrgent 진입(false→true) 시 1회 시작, 이탈/언마운트 시 정지.
  const wasUrgentRef = useRef(false)
  useEffect(() => {
    if (isUrgent && !wasUrgentRef.current) {
      startFuseCrackle()
    } else if (!isUrgent && wasUrgentRef.current) {
      stopFuseCrackle()
    }
    wasUrgentRef.current = isUrgent

    return () => {
      // 언마운트 시 진행 중이던 크래클 잔류 방지.
      if (wasUrgentRef.current) {
        stopFuseCrackle()
      }
    }
  }, [isUrgent])

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-1',
        size === 'lg' ? 'min-w-[9rem]' : 'min-w-[6rem]',
      )}
    >
      <div
        role="timer"
        aria-live={isUrgent || isEnded ? 'assertive' : 'polite'}
        aria-label={srLabel}
        className={cn(
          'flex items-center justify-center gap-2 rounded-sm transition-all duration-150',
          (isUrgent || isEnded) && 'px-2 py-0.5 ring-2',
          isUrgent &&
            'ring-ow-red/70 bg-ow-red/10 scale-105 animate-pulse shadow-[0_0_18px_rgba(255,70,73,0.55)]',
          isEnded && 'ring-ow-red bg-ow-red/20 scale-105',
        )}
      >
        <Clock
          aria-hidden="true"
          className={cn(numberColor, size === 'lg' ? 'w-6 h-6' : 'w-4 h-4')}
        />
        {isEnded ? (
          <span
            className={cn(
              'font-black uppercase italic text-ow-red',
              size === 'lg' ? 'text-3xl' : 'text-base',
            )}
          >
            종료
          </span>
        ) : (
          <>
            <span
              className={cn(
                'font-black tabular-nums',
                numberColor,
                size === 'lg' ? 'text-5xl' : 'text-xl',
              )}
            >
              {remainingTime === null ? '--' : value}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'text-muted-foreground uppercase font-bold',
                size === 'lg' ? 'text-sm' : 'text-xs',
              )}
            >
              sec
            </span>
          </>
        )}
      </div>

      {/* 초록→빨강 그라데이션 게이지 — 시간이 줄면 폭도 줄고 색도 붉어진다. */}
      {remainingTime !== null && (
        <div
          aria-hidden="true"
          className={cn(
            'relative h-1.5 w-full overflow-visible rounded-full bg-muted/40',
            isUrgent && 'animate-pulse',
          )}
        >
          {/* 연소 텍스처 — 게이지 트랙 배경, isUrgent 진입/이탈 시 페이드 전환 */}
          <div
            aria-hidden="true"
            className={cn(
              'timer-ember pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity duration-200',
              isUrgent ? 'opacity-100' : 'opacity-0',
            )}
            // 모바일에서 연소 텍스처 최대 opacity 0.85→0.65 축소(과도한 색 자극 저감) — motion-spec §3.4.
            style={
              isDesktop
                ? undefined
                : ({ '--timer-ember-peak-opacity': 0.65 } as React.CSSProperties)
            }
          />
          <div
            className="relative h-full overflow-hidden rounded-full transition-[width,background-color] duration-1000 ease-linear"
            style={{ width: `${fraction * 100}%`, backgroundColor: barColor }}
          />

          {/* 게이지 끝단 불꽃 + 스파크 — 마감 임박(isUrgent) 도화선 연출 */}
          {isUrgent && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 -translate-y-1/2"
              style={{ left: `${fraction * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="timer-flame absolute -top-2 left-1/2 block h-2.5 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-t from-ow-red via-ow-orange to-ow-gold" />
              {Array.from({ length: sparkCount }, (_, index) => {
                const offset = sparkOffset(index)
                return (
                  <span
                    key={index}
                    className="timer-spark absolute -top-1 left-1/2 block h-1 w-1 rounded-full bg-ow-orange"
                    style={
                      {
                        '--spark-x': offset.x,
                        '--spark-y': offset.y,
                        animationDelay: `${index * 90}ms`,
                      } as React.CSSProperties
                    }
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
