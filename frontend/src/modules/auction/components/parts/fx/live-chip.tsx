import { cn } from '@/lib/utils'

/**
 * LIVE 상태 칩 — 샘플 우상단 스타일 (빨간 점 pulse + 네온 보더).
 * paused 시 앰버 "PAUSED" 로 전환.
 */
export function LiveChip({ paused = false }: { paused?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1',
        'text-[11px] font-black uppercase tracking-widest',
        paused
          ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-400'
          : 'border-ow-red/60 bg-ow-red/10 text-ow-red shadow-[0_0_10px_rgba(255,70,73,0.25)]',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          paused ? 'bg-yellow-400' : 'bg-ow-red animate-pulse',
        )}
      />
      {paused ? 'Paused' : 'Live'}
    </span>
  )
}
