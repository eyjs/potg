import { describe, expect, it } from 'vitest'
import { getCardRarity } from './card-rarity'

describe('getCardRarity', () => {
  it('동일 id는 항상 동일 등급을 반환한다 (결정성)', () => {
    const id = 'player-abc-123'
    const first = getCardRarity(id)
    for (let i = 0; i < 20; i += 1) {
      expect(getCardRarity(id)).toBe(first)
    }
  })

  it('서로 다른 id 대량 샘플에서 등급 분포가 70/25/5 근사치를 이룬다', () => {
    const sampleSize = 10000
    const counts = { common: 0, rare: 0, legendary: 0 }
    for (let i = 0; i < sampleSize; i += 1) {
      const rarity = getCardRarity(`player-${i}`)
      counts[rarity] += 1
    }
    const commonPct = (counts.common / sampleSize) * 100
    const rarePct = (counts.rare / sampleSize) * 100
    const legendaryPct = (counts.legendary / sampleSize) * 100

    expect(commonPct).toBeGreaterThan(60)
    expect(commonPct).toBeLessThan(80)
    expect(rarePct).toBeGreaterThan(15)
    expect(rarePct).toBeLessThan(35)
    expect(legendaryPct).toBeGreaterThan(1)
    expect(legendaryPct).toBeLessThan(10)
  })

  it('빈 문자열도 에러 없이 결정적 등급을 반환한다', () => {
    expect(['common', 'rare', 'legendary']).toContain(getCardRarity(''))
  })
})
