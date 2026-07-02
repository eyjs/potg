'use client'

import { useEffect, useRef } from 'react'
import type { AuctionBidEvent, AuctionStageEvent } from './use-auction-socket'

type SoundKind = 'bid' | 'sold' | 'pass'

interface ToneConfig {
  startFrequency: number
  endFrequency: number
  type: OscillatorType
  durationMs: number
  gain: number
}

const TONE_CONFIGS: Record<SoundKind, ToneConfig> = {
  bid: {
    startFrequency: 880,
    endFrequency: 880,
    type: 'square',
    durationMs: 40,
    gain: 0.12,
  },
  sold: {
    startFrequency: 523,
    endFrequency: 784,
    type: 'sine',
    durationMs: 200,
    gain: 0.15,
  },
  pass: {
    startFrequency: 330,
    endFrequency: 160,
    type: 'sawtooth',
    durationMs: 250,
    gain: 0.12,
  },
}

/** Safari 등 구형 webkit 브라우저 대응 — window.AudioContext 부재 시 폴백. */
interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext
}

function resolveAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext ?? (window as unknown as WebkitWindow).webkitAudioContext
}

/**
 * 경매 입찰/낙찰/유찰 효과음 — Web Audio API 오실레이터 합성 방식.
 * 별도 mp3 에셋 없이 훅 내부에서 3종 톤을 실시간 생성한다.
 *
 * - 입찰(bid): 880Hz square 40ms 짧은 블립
 * - 낙찰(sold): 523→784Hz sine 200ms 상승 톤 (긍정)
 * - 유찰(pass): 330→160Hz sawtooth 250ms 하강 톤 (부정)
 *
 * 모바일 autoplay 정책 대응: 최초 pointerdown/touchstart 제스처에서
 * AudioContext.resume() 을 호출해 unlock 한다.
 */
export function useAuctionSound(
  bidEvents: AuctionBidEvent[],
  stageEvent: AuctionStageEvent | null,
): void {
  const audioContextRef = useRef<AudioContext | null>(null)
  // 과거 이벤트 소급 재생 방지 — 마운트 시점 현재값으로 시드
  const lastBidEventIdRef = useRef<string | null>(
    bidEvents.length > 0 ? bidEvents[bidEvents.length - 1].id : null,
  )
  const lastStageSeqRef = useRef<number>(stageEvent?.seq ?? 0)

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (audioContextRef.current) return audioContextRef.current
    const Ctor = resolveAudioContextCtor()
    if (!Ctor) return null
    const ctx = new Ctor()
    audioContextRef.current = ctx
    return ctx
  }

  const playTone = (kind: SoundKind): void => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const config = TONE_CONFIGS[kind]
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const now = ctx.currentTime
      const durationSec = config.durationMs / 1000

      oscillator.type = config.type
      oscillator.frequency.setValueAtTime(config.startFrequency, now)
      oscillator.frequency.linearRampToValueAtTime(
        config.endFrequency,
        now + durationSec,
      )

      // 클릭 노이즈 방지용 짧은 gain envelope (attack → sustain → release)
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(config.gain, now + 0.01)
      gainNode.gain.setValueAtTime(config.gain, now + Math.max(durationSec - 0.02, 0.01))
      gainNode.gain.linearRampToValueAtTime(0, now + durationSec)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.start(now)
      oscillator.stop(now + durationSec)
    } catch {
      // autoplay 차단 등은 정상 케이스 — 조용히 무시
    }
  }

  // 모바일 autoplay unlock — 최초 사용자 제스처에서 AudioContext.resume()
  useEffect(() => {
    if (typeof window === 'undefined') return

    const unlock = (): void => {
      const ctx = getAudioContext()
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          // resume 실패는 조용히 무시 — 다음 재생 시도 시 재시도됨
        })
      }
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [])

  // 입찰음 — 새 kind:'bid' 이벤트에만 반응 ('sold' bidEvent 는 stageEvent 가 처리)
  useEffect(() => {
    if (bidEvents.length === 0) return
    const last = bidEvents[bidEvents.length - 1]
    if (last.id === lastBidEventIdRef.current) return
    lastBidEventIdRef.current = last.id
    if (last.kind === 'bid') {
      playTone('bid')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidEvents])

  // 낙찰/유찰음 — stageEvent.seq 증가 시 1회 재생
  useEffect(() => {
    if (!stageEvent) return
    if (stageEvent.seq === lastStageSeqRef.current) return
    lastStageSeqRef.current = stageEvent.seq
    playTone(stageEvent.kind)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageEvent])
}
