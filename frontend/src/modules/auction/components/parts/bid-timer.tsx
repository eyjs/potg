import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  remainingTime: number | null
  /** 총 턴 시간(초) — 게이지 비율/색 계산용. 없으면 30 기준 폴백. */
  totalTime?: number
  size?: 'sm' | 'lg'
}

/**
 * 입찰 타이머.
 * - 남은 시간 비율에 따라 초록(여유)→빨강(임박) 그라데이션 게이지가 줄어든다.
 * - 5초 이하: 긴급(pulse + ring + glow) — 마감 임박 강조 (막판 입찰 유도).
 * - 0초: "종료" + 강조 (자동 낙찰 순간).
 * - role=timer + aria-live 로 스크린리더에 남은 시간/종료 안내.
 */
export function BidTimer({ remainingTime, totalTime, size = 'lg' }: Props) {
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
            'h-1.5 w-full overflow-hidden rounded-full bg-muted/40',
            isUrgent && 'animate-pulse',
          )}
        >
          <div
            className="h-full rounded-full transition-[width,background-color] duration-1000 ease-linear"
            style={{ width: `${fraction * 100}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  )
}
