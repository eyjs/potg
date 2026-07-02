import { describe, expect, it } from 'vitest'
import { bidComboLevel } from './auction-audio-engine'

describe('bidComboLevel', () => {
  it('count=1이면 L0(0)을 반환한다', () => {
    expect(bidComboLevel(1)).toBe(0)
  })

  it('count=2~3이면 L1(1)을 반환한다 (경계값 3)', () => {
    expect(bidComboLevel(2)).toBe(1)
    expect(bidComboLevel(3)).toBe(1)
  })

  it('count=4~5이면 L2(2)를 반환한다 (경계값 5)', () => {
    expect(bidComboLevel(4)).toBe(2)
    expect(bidComboLevel(5)).toBe(2)
  })

  it('count=6 이상이면 L3(3)을 반환한다', () => {
    expect(bidComboLevel(6)).toBe(3)
    expect(bidComboLevel(20)).toBe(3)
  })

  it('count=0이면 L0(0)을 반환한다 (하한 방어)', () => {
    expect(bidComboLevel(0)).toBe(0)
  })
})
