import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  remainingTime: number | null
  size?: 'sm' | 'lg'
}

/**
 * 입찰 타이머.
 * - 20초 초과: primary / 10초 초과: yellow / 그 이하: red
 * - 5초 이하: 긴급(pulse + ring) — 마감 임박 강조
 * - 0초: "종료" + 강한 flash (자동 낙찰 순간)
 * - role=timer + aria-live 로 스크린리더에 남은 시간/종료 안내
 */
export function BidTimer({ remainingTime, size = 'lg' }: Props) {
  const value = remainingTime ?? 0
  const isUrgent = remainingTime !== null && value <= 5 && value > 0
  const isEnded = remainingTime !== null && value <= 0

  const color =
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
      role="timer"
      aria-live={isUrgent || isEnded ? 'assertive' : 'polite'}
      aria-label={srLabel}
      className={cn(
        'flex items-center gap-2 rounded-sm transition-all duration-150',
        (isUrgent || isEnded) && 'px-3 py-1 ring-2',
        isUrgent && 'ring-ow-red/60 bg-ow-red/10 scale-105 animate-pulse',
        isEnded && 'ring-ow-red bg-ow-red/20 scale-105',
      )}
    >
      <Clock
        aria-hidden="true"
        className={cn(color, size === 'lg' ? 'w-6 h-6' : 'w-4 h-4')}
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
              color,
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
  )
}
