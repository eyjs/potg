# 등급 프레임 스펙 — 일반 / 레어 / 전설

대상: `current-player-card.tsx` (task-003 소유), 신규 `card-rarity.ts` (순수 유틸).
전제: 등급은 **순수 코스메틱**(AD-6) — `player.id` 문자열 결정적 해시 → `'common' | 'rare' | 'legendary'` (배분 70/25/5). 실력 지표 아님, 문구는 게임적 표현만 사용("레전더리 카드" 등).

---

## 1. 등급별 시각 스펙 (전부 기존 오버워치 토큰 재사용, 신규 색상 하드코딩 없음)

| 등급 | 확률 | 아바타 보더 색 | 아바타 글로우(box-shadow) | 카드 외곽 보더 | 배지 텍스트 | 배지 색 | 애니메이션 |
|---|---|---|---|---|---|---|---|
| **일반 (common)** | 70% | `border-ow-blue/40` (기존 WAITING 기본값과 동일 — 별도 강조 없음) | 없음 (기본 상태 유지) | `border-ow-blue/25` (기존 WAITING 보더 재사용) | "COMMON" 또는 배지 미표시 | `text-muted-foreground` | 없음(정적) |
| **레어 (rare)** | 25% | `border-ow-blue/70` (기존보다 진하게) | `drop-shadow(0 0 10px rgba(0,195,255,0.45))` | `border-ow-blue/50` | "RARE" | `text-ow-blue border-ow-blue/50 bg-ow-blue/10` | 없음(정적, 등장 시 §motion-spec §1.3 페이드인만) |
| **전설 (legendary)** | 5% | `border-ow-gold` (풀 채도) | `drop-shadow(0 0 16px rgba(255,184,0,0.75))` + `.pulse-glow` 재사용(`animation: pulse-glow 2s ease-in-out infinite`, box-shadow `--ow-gold` 5px↔20/30px 브리딩) | `border-ow-gold/70`, `shadow-[inset_0_0_30px_rgba(255,184,0,0.12)]` | "LEGENDARY" | `text-ow-gold border-ow-gold/70 bg-ow-gold/15` | `.pulse-glow` breathing (reduced-motion 시 정지) |

### 1.1 CSS 클래스 매핑 (Tailwind 유틸리티 + 기존 전역 클래스만 사용)

```ts
// card-rarity.ts 가 반환하는 CardRarity 값에 따라 current-player-card.tsx 내부에서 분기
const RARITY_FRAME: Record<CardRarity, { avatarBorder: string; avatarGlow: string; cardBorder: string; badgeClass: string; badgeLabel: string; pulse: boolean }> = {
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
```

- `avatarBorder`는 기존 `Avatar` className(139–142행)의 `isBidding ? 'border-primary/60 pulse-live' : 'border-ow-blue/40'` 분기 **앞단에 등급 오버레이**로 적용(등급이 기본값, `isBidding`/`isSold`가 우선순위 더 높은 상태별 색으로 override — 즉 등급 프레임은 `biddingPhase === 'WAITING'`(공개 직후~입찰 시작 전) 구간에서 가장 뚜렷하게 보이고, BIDDING/SOLD 진입 후에는 기존 상태색이 우선). 카드 외곽(`cardBorder`)도 동일 원칙: 기존 108–114행의 `isBidding`/`isSold`/`WAITING` 분기에 **WAITING 케이스만** 등급별로 세분화(`biddingPhase === 'WAITING' && RARITY_FRAME[rarity].cardBorder`).
- `pulse: true`(전설)일 때만 `.pulse-glow` 클래스 추가(기존 154–165행 keyframe 재사용, 신규 키프레임 불필요).

### 1.2 배지 표시

- 위치: 기존 역할 배지(`ROLE_COLORS`, 189–194행) 옆 또는 아래에 등급 배지 추가(예: role 배지 우측에 나란히, 또는 별도 줄).
- 텍스트: `badgeLabel` 값 사용 ("일반 카드" / "레어 카드" / "레전더리 카드") — **"실력"/"티어"/"MMR" 등 단어 사용 금지**(AD-6, 실력 지표 오인 방지).
- 일반 등급은 배지 자체를 생략하거나 매우 절제된 스타일로 표시(과도한 정보 노이즈 방지) — 권장: common은 배지 미표시, rare/legendary만 표시.

---

## 2. 결정적 해시 규약 (`card-rarity.ts`)

```ts
export type CardRarity = 'common' | 'rare' | 'legendary'

/** player.id 문자열 → 0~99 결정적 정수 해시 (djb2 계열, 외부 의존성 없음) */
function hashToPercent(id: string): number {
  let hash = 5381
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 33) ^ id.charCodeAt(i)
  }
  return Math.abs(hash) % 100
}

/** 배분: common 70% [0,70) / rare 25% [70,95) / legendary 5% [95,100) */
export function getCardRarity(id: string): CardRarity {
  const p = hashToPercent(id)
  if (p < 70) return 'common'
  if (p < 95) return 'rare'
  return 'legendary'
}
```

- 동일 `player.id` → 항상 동일 결과(결정성, 서버 재조회/리렌더 무관).
- 대량 샘플(예: 10,000개 순차 id)에서 분포가 70/25/5 근사(±수 % 오차 허용) — 테스트 요구사항(task-003)과 일치.
- `any` 미사용, 외부 라이브러리 미사용(djb2 순수 함수).

---

## 3. 접근성 (WCAG AA)

| 검증 항목 | 값 | 대비 확인 |
|---|---|---|
| 골드 배지 텍스트(`text-ow-gold` #FFB800) on 카드 배경(`--card` #151515) | 대비비 ≈ 8.9:1 | AA/AAA 통과(4.5:1 이상) |
| 블루 배지 텍스트(`text-ow-blue` #00c3ff) on 카드 배경(#151515) | 대비비 ≈ 7.7:1 | AA/AAA 통과 |
| 등급은 **색상만으로 구분하지 않음** | 배지 텍스트 라벨("일반/레어/레전더리 카드")이 항상 병기 | 색맹 사용자도 텍스트로 등급 인지 가능(WCAG 1.4.1 색에 의존하지 않는 정보 전달 충족) |
| 전설 breathing 애니메이션 | `.pulse-glow` 2s 주기 | reduced-motion 시 정지(모션 민감 사용자 보호), 정적 상태에서도 골드 보더+배지로 등급 인지 가능(정보 손실 없음) |

---

## 4. 신규 토큰 제안 (불가피 시에만 — 결론: 불필요)

검토 결과 등급 프레임 구현에 **신규 CSS 변수/토큰이 필요하지 않다.** 기존 `--ow-blue`(레어), `--ow-gold`(전설), `--muted-foreground`(일반)만으로 3등급을 완전히 표현 가능하며, 알파값(`/40`, `/70` 등)은 Tailwind 유틸리티 표기이므로 하드코딩 색상이 아니다(토큰 기반 alpha 합성). 별도 `--rarity-common/rare/legendary` 토큰 레이어는 기존 오버워치 3색 체계(blue/gold/muted) 재사용만으로 충분해 추가하지 않는다.
