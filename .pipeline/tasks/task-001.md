# Task 001: 공유 스테이지 상태 훅 추출 + current-player-card 리팩터

## 메타데이터
- 복잡도: L
- 병렬그룹: A (선행 없음)
- 우선순위: P0 (선행 기반 태스크 — 005가 이 훅에 의존)
- 의존: 없음

## 담당 파일
- **신규**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/hooks/use-player-card-stage.ts`
- **수정**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/current-player-card.tsx`

## 배타 소유 파일 (병렬 충돌 방지)
- `hooks/use-player-card-stage.ts` (신규)
- `components/parts/current-player-card.tsx` (수정)

## import만 하는 파일 (편집 금지)
- `hooks/auction-audio-engine.ts` — `playRevealLegendary`, `COMBO_WINDOW_MS`, `bidComboLevel` (기존 export)
- `components/parts/card-rarity.ts` — `getCardRarity`, `RARITY_FRAME`, `CardRarity`
- `../../types` — `RoomStatePlayer`, `RoomStateBid`
- `../../hooks/use-auction-socket` — `AuctionStageEvent`
- `framer-motion` — `useAnimation`, `useReducedMotion` (기존 의존성)

## 목표
`current-player-card.tsx`(615줄)에 인라인된 매물 연출 상태 로직을 **순수 추출**해 신규 훅 `use-player-card-stage.ts`로 옮기고, 데스크톱 카드는 이 훅을 구독하도록 리팩터한다. 이후 task-005의 `MobileAuctionStage`가 **동일 훅**을 구독해 등급/콤보/타이밍/사운드를 데스크톱과 일치시킨다(P0-③/⑥ 기반, AD-1/AD-2). **데스크톱 카드의 렌더 결과·동작은 100% 불변**이어야 한다(순수 리팩터).

## 구현 상세

### 1) 훅 `usePlayerCardStage` 작성 (신규 파일)
아래 로직을 `current-player-card.tsx`에서 **그대로 이전**한다(렌더-단계 상태 보정 패턴 유지 — effect로 바꾸지 말 것):
- 매물 전환 감지: `lastPlayer` state + `if (player && player.id !== lastPlayer?.id) setLastPlayer(player)` (현재 114-115행)
- 셀레브레이션: `seenSeq`/`celebrate` + `stageEvent.seq` 비교 + 1700ms 타이머 리셋 (현재 117-127행)
- 뷰포트: `isDesktop` (matchMedia `(min-width:1024px)`) (현재 130-138행)
- 등급: `rarity = useMemo(() => lastPlayer ? getCardRarity(lastPlayer.id) : 'common', [lastPlayer?.id])` (현재 141-146행)
- 팩오프닝: `isFlipped`/`legendaryBurst`/`legendaryFiredRef` + 플립 타이밍 effect (현재 147-183행). **단, `playRevealLegendary()` 호출을 아래 `isActiveViewport` 게이트로 감싼다.**
- 콤보: `comboTimestampsRef`/`prevBidAmountRef`/`comboCount`/`comboLevel`/`shakeControls` + 리셋/윈도우 effect (현재 190-236행)
- 파생값: `frame = RARITY_FRAME[rarity]`, `comboStage = COMBO_STAGE[comboLevel]`, `legendaryParticles`, `displayPlayer = player ?? (celebrate ? lastPlayer : null)`, `flightLayoutId = celebrate==='sold' && lastPlayer ? \`flight-card-${lastPlayer.id}\` : undefined`

**상수 이전**: `COMBO_STAGE`(66-91), `BURST_PARTICLES`(42-50), `LEGENDARY_PARTICLES_DESKTOP`(53-61), `LEGENDARY_PARTICLES_MOBILE`(64)를 훅 파일로 **이전 후 `export`**. 값은 **글자 그대로 동일**(데스크톱 시각 불변). 카드와 스테이지는 훅 파일에서 import.

### 2) `ownerViewport`/`isActiveViewport` 게이트 (AD-2, P0-⑥ 방어)
- 훅 시그니처: `usePlayerCardStage(args: { player, currentBid, biddingPhase, stageEvent, ownerViewport: 'desktop' | 'mobile' })`
- 내부: `const isActiveViewport = ownerViewport === (isDesktop ? 'desktop' : 'mobile')`
- **`playRevealLegendary()` 호출을 `if (isActiveViewport) { ... }`로 게이트**(reduced-motion 분기·정상 분기 양쪽 모두). `legendaryFiredRef` per-instance 가드는 유지.
- **전설 전체화면 플래시(`createPortal`)의 렌더 조건에도 `isActiveViewport`를 추가**(카드가 렌더). → 현재 뷰포트에 대응하는 인스턴스 1개만 사운드·portal 발화.
- 게이트는 **뷰포트 폭 기준**(탭 가시성 아님). 현황 탭 체류 중에도 모바일 스테이지 인스턴스가 active로 유지되어 사운드 발화(P0-⑥).

### 3) 훅 반환 계약(consumer가 소비)
```
{ lastPlayer, displayPlayer, rarity, frame,
  isFlipped, legendaryBurst, legendaryParticles, isDesktop, isActiveViewport,
  celebrate, seenSeq,
  comboCount, comboLevel, comboStage, shakeControls,
  reducedMotion }
```
(+ export 상수: `COMBO_STAGE`, `BURST_PARTICLES`, `LEGENDARY_PARTICLES_DESKTOP`, `LEGENDARY_PARTICLES_MOBILE`)

### 4) `current-player-card.tsx` 리팩터
- 위 상태/상수 정의를 삭제하고 `const stage = usePlayerCardStage({ player, currentBid, biddingPhase, stageEvent, ownerViewport: 'desktop' })`로 대체, JSX는 `stage.*`를 참조하도록만 치환.
- **JSX 마크업/클래스/애니메이션 파라미터는 한 글자도 바꾸지 않는다**(순수 치환). `<motion.div animate={stage.shakeControls}>`, `MotionCard layoutId={stage.flightLayoutId}` 등.
- `import` 정리: 상수·`playRevealLegendary`·`COMBO_WINDOW_MS`·`bidComboLevel` import를 훅 사용에 맞게 정돈(카드에서 직접 쓰던 것은 훅으로 이동, 카드에 남는 것만 유지).
- 결과 파일 크기: ~430~460줄로 축소(신규 마크업 추가 없음).

## 완료 기준 체크리스트 + 검증
- [ ] `use-player-card-stage.ts` 신규 생성, 위 반환 계약·export 상수 제공
- [ ] `current-player-card.tsx`가 훅 구독으로 전환, **데스크톱 렌더 diff = 마크업 0**(상태 정의만 제거·치환)
- [ ] `playRevealLegendary()`·전설 portal이 `isActiveViewport` 게이트 안에서만 실행
- [ ] `any` 미사용, 타입 명시(제네릭/유니온 정확)
- [ ] `cd frontend && npm run lint` 통과, `npm run build` 통과
- [ ] (수동 검증 가이드) 데스크톱 뷰포트에서 전설 매물 공개 시 공개음 **1회**, 플립/파티클/콤보/셀레브레이션 기존과 동일
- [ ] (수동) 데스크톱 낙찰 flight-in(`layoutId`) 기존과 동일 동작

## 제약 재확인
- **데스크톱 무변경**: 카드 마크업/클래스/애니메이션 값 불변, 순수 상태 추출만.
- `any` 금지 · Tailwind만 · `globals.css`/`ui/*`/`lib/utils.ts`/`auction-audio-engine.ts`/`card-rarity.ts` **편집 금지**(import만).
- `reduced-motion` 분기(플립 생략/즉시 정면 + 정적 등급 프레임) 로직 그대로 이전.
- 디자인 토큰·오버워치 테마 유지, 하드코딩 금지.
- 신규 npm 금지. `mobile-team-strip.tsx` 생성 금지.
