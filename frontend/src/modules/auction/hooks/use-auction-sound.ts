'use client'

import { useEffect, useRef } from 'react'
import type { AuctionBidEvent, AuctionStageEvent } from './use-auction-socket'
import {
  COMBO_WINDOW_MS,
  bidComboLevel,
  playBidSound,
  playPassSound,
  playSoldSound,
  unlockAudio,
} from './auction-audio-engine'

/**
 * 경매 입찰/낙찰/유찰 효과음 훅.
 *
 * 실제 사운드 생성은 `auction-audio-engine.ts`(모듈 싱글턴 Web Audio 엔진, SSOT)가
 * 전담한다. 이 훅은 (1) 소켓 이벤트 트리거 배선(bidEvents/stageEvent 감시)과
 * (2) 모바일 autoplay unlock 리스너만 담당하며, 실제 합성 로직은 엔진에 위임한다.
 *
 * - 입찰(bid): `bidEvents`에서 `COMBO_WINDOW_MS` 이내 bid 개수를 세어 콤보 단계를
 *   계산하고 `playBidSound(comboLevel)` 호출.
 * - 낙찰/유찰: `stageEvent.seq` 증가 시 `playSoldSound()` / `playPassSound()` 호출.
 *
 * 모바일 autoplay 정책 대응: 최초 pointerdown/touchstart 제스처에서
 * 엔진의 단일 공유 AudioContext를 `unlockAudio()`로 resume 한다.
 */
export function useAuctionSound(
  bidEvents: AuctionBidEvent[],
  stageEvent: AuctionStageEvent | null,
): void {
  // 과거 이벤트 소급 재생 방지 — 마운트 시점 현재값으로 시드
  const lastBidEventIdRef = useRef<string | null>(
    bidEvents.length > 0 ? bidEvents[bidEvents.length - 1].id : null,
  )
  const lastStageSeqRef = useRef<number>(stageEvent?.seq ?? 0)

  // 모바일 autoplay unlock — 최초 사용자 제스처에서 엔진 단일 AudioContext resume
  useEffect(() => {
    if (typeof window === 'undefined') return

    const unlock = (): void => {
      unlockAudio()
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  // 입찰음 — 새 kind:'bid' 이벤트에만 반응 ('sold' bidEvent 는 stageEvent 가 처리)
  // 콤보 단계는 COMBO_WINDOW_MS(3000ms) 내 최신 bid 이벤트 개수로 계산한다
  // (task-003 카드 로컬 계산과 동일 규약, AD-3/R4).
  useEffect(() => {
    if (bidEvents.length === 0) return
    const last = bidEvents[bidEvents.length - 1]
    if (last.id === lastBidEventIdRef.current) return
    lastBidEventIdRef.current = last.id
    if (last.kind === 'bid') {
      const lastTimestamp = new Date(last.timestamp).getTime()
      let comboCount = 0
      for (let i = bidEvents.length - 1; i >= 0; i -= 1) {
        const event = bidEvents[i]
        if (event.kind !== 'bid') continue
        const elapsed = lastTimestamp - new Date(event.timestamp).getTime()
        if (elapsed > COMBO_WINDOW_MS) break
        comboCount += 1
      }
      playBidSound(bidComboLevel(comboCount))
    }
  }, [bidEvents])

  // 낙찰/유찰음 — stageEvent.seq 증가 시 1회 재생
  useEffect(() => {
    if (!stageEvent) return
    if (stageEvent.seq === lastStageSeqRef.current) return
    lastStageSeqRef.current = stageEvent.seq
    if (stageEvent.kind === 'sold') {
      playSoldSound()
    } else {
      playPassSound()
    }
  }, [stageEvent])
}
