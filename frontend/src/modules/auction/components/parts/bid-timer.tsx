import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  remainingTime: number | null
  size?: 'sm' | 'lg'
}

export function BidTimer({ remainingTime, size = 'lg' }: Props) {
  const value = remainingTime ?? 0
  const color =
    value > 20
      ? 'text-primary'
      : value > 10
        ? 'text-yellow-400'
        : 'text-ow-red animate-pulse'

  return (
    <div className="flex items-center gap-2">
      <Clock
        className={cn(
          color,
          size === 'lg' ? 'w-6 h-6' : 'w-4 h-4',
        )}
      />
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
        className={cn(
          'text-muted-foreground uppercase font-bold',
          size === 'lg' ? 'text-sm' : 'text-xs',
        )}
      >
        sec
      </span>
    </div>
  )
}
