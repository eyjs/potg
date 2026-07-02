'use client'

import { useEffect, useRef } from 'react'
import { Gavel, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/common/components/ui/card'
import { cn } from '@/lib/utils'
import type { AuctionBidEvent } from '../../hooks/use-auction-socket'

interface Props {
  events: AuctionBidEvent[]
  /** 표시할 최대 개수 (최근순) */
  limit?: number
}

/**
 * 입찰 로그 — 게임 킬로그 스타일 피드 (샘플의 "[JYP] +100P Bid" 목록).
 * 입찰=시안, 낙찰=골드. 신규 항목은 pop-in 으로 등장하고 자동으로 하단 고정.
 */
export function BidLog({ events, limit = 8 }: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  const visible = events.slice(-limit)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  return (
    <Card className="bg-card/70 border-ow-blue/15 backdrop-blur-sm">
      <CardContent className="p-3">
        <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          입찰 로그
        </h4>
        {visible.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground/70">
            아직 입찰이 없습니다.
          </p>
        ) : (
          <ul
            ref={listRef}
            className="max-h-28 space-y-1 overflow-y-auto pr-1 text-xs"
          >
            {visible.map((e) => (
              <li
                key={e.id}
                className={cn(
                  'pop-in flex items-center gap-1.5 rounded px-1.5 py-0.5',
                  e.kind === 'sold'
                    ? 'bg-ow-gold/10 text-ow-gold font-bold'
                    : 'text-ow-blue/90',
                )}
              >
                {e.kind === 'sold' ? (
                  <Trophy className="h-3 w-3 shrink-0" />
                ) : (
                  <Gavel className="h-3 w-3 shrink-0 opacity-70" />
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
        )}
      </CardContent>
    </Card>
  )
}
