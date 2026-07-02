'use client'

import { useEffect, useState } from 'react'
import { Gavel, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuctionBidEvent } from '../../../hooks/use-auction-socket'

interface Props {
  bidEvents: AuctionBidEvent[]
  /** 표시할 최대 개수 (최근순, 기본 3) */
  limit?: number
  className?: string
}

/**
 * 모바일 컴팩트 최근 입찰 티커 — 스테이지 HUD 오버레이용 소형 피드.
 *
 * `BidLog`(입찰 로그 카드)의 축약형: 최근 2~3건만 반투명 배경 위에
 * 한 줄씩 표시한다. 신규 항목은 `pop-in`으로 등장하고, 최상단(가장 최근)
 * 항목은 `bid-pop`으로 한 번 더 강조된다. `prefers-reduced-motion` 시
 * 두 애니메이션 모두 비활성화된다(정적 표시로 폴백).
 */
export function MobileBidTicker({ bidEvents, limit = 3, className }: Props) {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const visible = bidEvents.slice(-limit).reverse()

  if (visible.length === 0) {
    return null
  }

  return (
    <ul
      aria-hidden="true"
      className={cn(
        'pointer-events-none flex flex-col gap-1 rounded-lg bg-[color-mix(in_srgb,var(--stage-navy-deep)_60%,transparent)] px-2 py-1.5 backdrop-blur-sm',
        className,
      )}
    >
      {visible.map((e, i) => (
        <li
          key={e.id}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-tight',
            !reducedMotion && 'pop-in',
            i === 0 && !reducedMotion && 'bid-pop',
            e.kind === 'sold'
              ? 'bg-ow-gold/10 font-bold text-ow-gold'
              : 'text-ow-blue/90',
          )}
        >
          {e.kind === 'sold' ? (
            <Trophy className="h-2.5 w-2.5 shrink-0" />
          ) : (
            <Gavel className="h-2.5 w-2.5 shrink-0 opacity-70" />
          )}
          <span className="truncate">
            [{e.bidderName}]{' '}
            {e.kind === 'sold'
              ? `${e.amount.toLocaleString()}P 낙찰!`
              : `${e.amount.toLocaleString()}P 입찰`}
          </span>
        </li>
      ))}
    </ul>
  )
}
