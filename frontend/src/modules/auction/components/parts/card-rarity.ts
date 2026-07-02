/**
 * 매물 카드 등급(코스메틱) 결정 유틸 — 순수 함수, 외부 의존성 없음.
 *
 * `player.id` 문자열을 djb2 계열 해시로 0~99 정수에 결정적으로 매핑한 뒤
 * 70/25/5 비율로 common/rare/legendary 등급을 배분한다.
 * 등급은 실력 지표가 아니며(AD-6), 오직 팩 오프닝 연출용 코스메틱 값이다.
 * 동일 id → 항상 동일 등급(서버 재조회/리렌더와 무관, 시드 고정).
 */

export type CardRarity = 'common' | 'rare' | 'legendary'

/** player.id 문자열 → 0~99 결정적 정수 해시 (djb2 계열). */
function hashToPercent(id: string): number {
  let hash = 5381
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 33) ^ id.charCodeAt(i)
  }
  return Math.abs(hash) % 100
}

/** 배분: common 70% [0,70) / rare 25% [70,95) / legendary 5% [95,100). */
export function getCardRarity(id: string): CardRarity {
  const p = hashToPercent(id)
  if (p < 70) return 'common'
  if (p < 95) return 'rare'
  return 'legendary'
}

export interface RarityFrame {
  avatarBorder: string
  avatarGlow: string
  cardBorder: string
  badgeClass: string
  badgeLabel: string
  pulse: boolean
}

/** 등급별 시각 스펙 (rarity-frame-spec.md §1.1) — 기존 오버워치 토큰만 사용. */
export const RARITY_FRAME: Record<CardRarity, RarityFrame> = {
  common: {
    avatarBorder: 'border-ow-blue/40',
    avatarGlow: '',
    cardBorder: 'border-ow-blue/25',
    badgeClass: 'text-muted-foreground border-muted-foreground/30',
    badgeLabel: '일반 카드',
    pulse: false,
  },
  rare: {
    avatarBorder: 'border-ow-blue/70',
    avatarGlow: 'drop-shadow-[0_0_10px_rgba(0,195,255,0.45)]',
    cardBorder: 'border-ow-blue/50',
    badgeClass: 'text-ow-blue border-ow-blue/50 bg-ow-blue/10',
    badgeLabel: '레어 카드',
    pulse: false,
  },
  legendary: {
    avatarBorder: 'border-ow-gold',
    avatarGlow: 'drop-shadow-[0_0_16px_rgba(255,184,0,0.75)]',
    cardBorder: 'border-ow-gold/70',
    badgeClass: 'text-ow-gold border-ow-gold/70 bg-ow-gold/15',
    badgeLabel: '레전더리 카드',
    pulse: true,
  },
}
