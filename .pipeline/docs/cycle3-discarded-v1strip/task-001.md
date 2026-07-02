# Task 001: 공유 스테이지 훅 추출 + current-player-card 리팩터 (선행 기반)

## 메타데이터
- 복잡도: L
- 병렬그룹: A
- 의존: 없음 (선행 기반 태스크 — task-005가 이 훅을 소비)
- 우선순위: P0 (AD-1, AD-2)

## 배타 소유 파일 (병렬 충돌 방지 — 이 태스크만 편집)
- 신규: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/hooks/use-player-card-stage.ts`
- 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/current-player-card.tsx`

### import만 하는(수정 아님) 파일
- `hooks/auction-audio-engine.ts` — `playRevealLegendary`, `bidComboLevel`, `COMBO_WINDOW_MS` import (무변경)
- `components/parts/card-rarity.ts` — `getCardRarity`, `RARITY_FRAME` import (무변경)

## 목적
데스크톱 `CurrentPlayerCard`(615줄)의 **상태 로직을 공유 훅으로 추출**해, 신규 `MobileAuctionStage`(task-005)와 데스크톱 카드가 동일 상태를 구독하도록 한다. 데스크톱 카드의 **마크업·시각·동작은 100% 불변**. 동시에 CSS 토글 이중 마운트로 인한 사운드/전설 플래시 이중 발화를 `variant` 게이트로 차단한다.

## 구현 상세 (P0-2 기반, AD-1/AD-2)

### 1. 신규 훅 `use-player-card-stage.ts`
현재 `current-player-card.tsx`에 흩어진 아래 상태 로직을 **그대로** 이전(로직 변경 금지, 위치만 이동):
- `lastPlayer` 스냅샷 (현 114-115행) — 유찰 시 null 전환 대비 마지막 매물 유지
- `seenSeq`/`celebrate` + 1.7s 타이머 (현 117-127행) — 낙찰/유찰 셀레브레이션
- `isDesktop` matchMedia (현 129-138행)
- `rarity`(`getCardRarity`), `isFlipped`, `legendaryBurst`, `legendaryFiredRef`, 플립/전설 타이밍 effect (현 140-183행)
- `legendaryParticles` 선택 (현 185-187행)
- 콤보: `comboTimestampsRef`/`prevBidAmountRef`/`comboCount`/`comboLevel`/`shakeControls` + 매물 전환 리셋 + 입찰 감지 흔들림(모바일 `amp*0.5`) (현 189-236행)
- `displayPlayer`(현 239행), `frame`, `comboStage`, `flightLayoutId`(현 265-267행) 파생값
- 상수 `COMBO_STAGE`/`BURST_PARTICLES`/`LEGENDARY_PARTICLES_DESKTOP`/`LEGENDARY_PARTICLES_MOBILE` (현 41-91행)를 훅 파일로 이전하고 `export`(task-005가 재사용).

시그니처:
```ts
export function usePlayerCardStage(params: {
  player: RoomStatePlayer | null
  currentBid: RoomStateBid | null
  biddingPhase: BiddingPhase
  stageEvent?: AuctionStageEvent | null
  variant: 'desktop' | 'mobile'
}): {
  displayPlayer: RoomStatePlayer | null
  rarity: CardRarity
  frame: RarityFrame
  isFlipped: boolean
  legendaryBurst: boolean
  legendaryParticles: typeof BURST_PARTICLES
  comboCount: number
  comboLevel: 0 | 1 | 2 | 3
  comboStage: (typeof COMBO_STAGE)[0 | 1 | 2 | 3]
  shakeControls: AnimationControls   // framer-motion useAnimation()
  celebrate: 'sold' | 'pass' | null
  seenSeq: number
  flightLayoutId: string | undefined
  isDesktop: boolean
  isActiveViewport: boolean
  reducedMotion: boolean
}
```

### 2. `variant` + `isActiveViewport` 게이트 (AD-2, 핵심)
- `isActiveViewport = variant === 'desktop' ? isDesktop : !isDesktop`.
- **사이드이펙트를 `isActiveViewport`로 가드**:
  - `playRevealLegendary()` 호출 → `isActiveViewport`일 때만. 추가로 훅 **모듈 레벨 `let lastLegendaryFiredId: string | null`** 가드로 여러 인스턴스 간 1회 발화 보장(현 `legendaryFiredRef` 인스턴스 ref는 이중 마운트에서 각각 발화하므로 모듈 레벨로 승격).
  - `legendaryBurst`(전체화면 플래시 트리거) 설정도 `isActiveViewport`일 때만 `true`.
- 크래클 사운드는 이 파일 대상 아님(타이머 소관, task-002).

### 3. `current-player-card.tsx` 리팩터 (데스크톱 무변경)
- 위 상태 블록을 삭제하고 `const stage = usePlayerCardStage({ player, currentBid, biddingPhase, stageEvent, variant: 'desktop' })` 한 줄로 대체.
- JSX는 `stage.displayPlayer`/`stage.frame`/`stage.isFlipped`/`stage.comboCount`/`stage.comboStage`/`stage.celebrate`/`stage.shakeControls` 등을 참조하도록 **바인딩만 교체**. **DOM 트리·className·애니메이션 파라미터·조건 분기 전부 불변**.
- 전설 portal 렌더 조건에 `stage.isActiveViewport` 추가(데스크톱 뷰포트에서만 발화 — 데스크톱 비주얼 동일, 모바일 인스턴스가 body로 새어나오는 이중 플래시 제거).
- 결과적으로 파일 줄 수는 **감소**(신규 마크업 없음).

## 성공 기준
- [ ] `use-player-card-stage.ts` 신규 생성, 위 시그니처/반환 계약 충족
- [ ] `current-player-card.tsx`가 훅 소비로 축소되고 **데스크톱 렌더 결과 무변경** (JSX diff = 상태선언 삭제 + 훅 바인딩 교체 + portal에 isActiveViewport 조건 추가에 한정)
- [ ] 전설 공개 시 사운드/전체화면 플래시가 **정확히 1회** (이중 마운트에서도)
- [ ] `COMBO_STAGE`/파티클 상수가 훅 파일에서 export되어 task-005가 재사용 가능
- [ ] `variant='mobile'` 경로가 데스크톱 뷰포트에서 사이드이펙트 미발화

## 검증 방법
- `cd frontend && npm run lint && npm run build` 통과
- 데스크톱(≥1024px)에서 관전자/팀장/마스터 뷰 매물 공개·입찰·낙찰·유찰 연출이 리팩터 전과 동일한지 육안 확인
- `git diff current-player-card.tsx`로 마크업 무변경 확인
- 전설 등급 매물(id 해시 상위 5%) 공개 시 사운드 1회·플래시 1회

## 제약 재확인
- 데스크톱 무변경(마크업/애니메이션 파라미터 불변), `any` 금지, Tailwind만·신규 CSS 파일 금지, `cn()` 사용, 오버워치 토큰 유지, `useReducedMotion()` 분기 보존(훅이 흡수), `auction-audio-engine.ts`/`card-rarity.ts`/`lib/utils.ts`/`components/ui/*` 수정 금지(import만), 백엔드 무변경.
</content>
