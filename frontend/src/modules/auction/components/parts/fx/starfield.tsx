'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  /** 수평 드리프트 속도 (px/s) */
  vx: number
  /** 트윙클 위상/속도 */
  phase: number
  twinkle: number
  baseAlpha: number
}

const STAR_COUNT = 80

/**
 * 경매장 배경 스타필드 — 경량 canvas 파티클.
 * 아주 느린 드리프트 + 트윙클(사용자가 의식하지 못할 정도의 속도).
 * - rAF 기반, 탭 숨김 시 정지 (visibilitychange)
 * - prefers-reduced-motion 시 정적 별만 1회 렌더
 * - pointer-events 없음, 콘텐츠 뒤(z-0)에 깔림
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let width = 0
    let height = 0
    let stars: Star[] = []
    let raf = 0
    let last = performance.now()

    const seed = () => {
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.4 + Math.random() * 1.1,
        vx: 1.5 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.3 + Math.random() * 0.7,
        baseAlpha: 0.25 + Math.random() * 0.5,
      }))
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      ctx.clearRect(0, 0, width, height)
      for (const s of stars) {
        s.x += s.vx * dt
        if (s.x > width + 2) s.x = -2
        s.phase += s.twinkle * dt
        const alpha = s.baseAlpha * (0.65 + 0.35 * Math.sin(s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(190, 225, 255, ${alpha.toFixed(3)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height)
      for (const s of stars) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(190, 225, 255, ${s.baseAlpha.toFixed(3)})`
        ctx.fill()
      }
    }

    const start = () => {
      if (reduced) {
        drawStatic()
        return
      }
      cancelAnimationFrame(raf)
      last = performance.now()
      raf = requestAnimationFrame(draw)
    }
    const stop = () => cancelAnimationFrame(raf)

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    resize()
    start()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
