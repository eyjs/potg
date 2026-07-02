# Task 005: mobile-auction-stage — 경매 탭 상단 스테이지 HUD

## 메타데이터
- 복잡도: L
- 병렬그룹: B (Group A 전부 머지 후)
- 우선순위: P0
- 의존: **task-001**(공유 훅), **task-002**(BidTimer `variant='bar'`), **task-004**(티커)

## 담당 파일
- **신규**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/mobile-auction-stage.tsx`

## 배타 소유 파일
- `components/parts/mobile-auction-stage.tsx` (신규)

## import만 하는 파일 (편집 금지)
- `../../hooks/use-player-card-stage` — `usePlayerCardStage` + export 상수(`BURST_PARTICLES`, `LEGENDARY_PARTICLES_*`, `COMBO_STAGE`) *(task-001 산출)*
- `./bid-timer` — `BidTimer` (`variant='bar'` 사용) *(task-002 산출)*
- `./fx/mobile-bid-ticker` — `MobileBidTicker` *(task-004 산출)*
- `./card-rarity` — `RARITY_FRAME` (필요 시)
- `../../hooks/use-heroes` — `useHeroes` (초상화)
- `../../types` — `RoomStatePlayer`/`RoomStateBid`
- `../../hooks/use-auction-socket` — `AuctionBidEvent`/`AuctionStageEvent`
- `../../../common/components/ui/*` — `Avatar`/`Badge` 등, `lib/utils` — `cn`, `framer-motion`

## 목표
경매 탭 **상단 고정 스테이지 HUD**를 신규 컴포넌트로 작성한다(카드 prop 분기 아님 — AD-6). 초상화 중심 + 오버레이(현재가 큰 숫자 펀치, 입찰 선두, 도화선 타이머 바, 컴팩트 티커) 구성. 2차 연출(팩오프닝 플립/전설 플래시·파티클/콤보/셀레브레이션)은 **공유 훅(`usePlayerCardStage`, `ownerViewport:'mobile'`) 상태를 그대로 반영**해 데스크톱과 판정/사운드 일치(P0-③, AD-1/AD-2).

## 구현 상세

### 1) Props
```ts
interface Props {
  player: RoomStatePlayer | null
  currentBid: RoomStateBid | null
  biddingPhase: 'WAITING' | 'BIDDING' | 'SOLD'
  stageEvent?: AuctionStageEvent | null
  bidEvents?: AuctionBidEvent[]         // 티커용
  timerRemaining: number | null         // 스테이지 바 타이머
  totalTime?: number                    // roomState.auction.turnTimeLimit
}
```

### 2) 공유 훅 구독 (AD-1/AD-2 — 사운드/판정 일치·중복 방지)
- `const stage = usePlayerCardStage({ player, currentBid, biddingPhase, stageEvent, ownerViewport: 'mobile' })`
- 훅 반환값(`displayPlayer`/`rarity`/`frame`/`isFlipped`/`legendaryBurst`/`legendaryParticles`/`celebrate`/`seenSeq`/`comboCount`/`comboLevel`/`comboStage`/`shakeControls`/`reducedMotion`/`isActiveViewport`)으로 렌더.
- **사운드/전설 portal은 훅 내부에서 `isActiveViewport` 게이트로 처리**되므로 스테이지는 상태만 반영(중복 발화 없음). 스테이지에서 별도로 `playRevealLegendary` 직접 호출 금지.

### 3) 레이아웃 (초상화 중심 HUD, 모바일 축소 강도)
- 스테이지 컨테이너: `shrink-0`(부모 경매 패널의 상단 고정 존). `game-panel` 계열 + `relative overflow-hidden`.
- **초상화**: `displayPlayer` 아바타 중심, 팩오프닝 플립(`stage.isFlipped`, 뒷면 Shield → 정면 아트 + `frame.avatarBorder/avatarGlow`). 모바일 크기(예: `w-28 h-28`~`w-32`, 데스크톱 176px보다 축소). 전설 `pulse-glow`.
- **현재가 큰 숫자 펀치**: `currentBid.amount` `key` 리마운트 + `bid-pop`/framer 스프링 펀치(카드의 `overshoot`/`comboStage` 동일 파라미터 재사용). `text-ow-gold`, 대형 폰트, `drop-shadow` 토큰.
- **입찰 선두**: `currentBid.bidderName`(없으면 `—`), `text-ow-blue truncate`.
- **콤보 배지**: `comboCount>=2` 시 `comboStage.badgeClass`로 표시(카드와 동일 규칙).
- **도화선 타이머 바**: `<BidTimer variant="bar" showNumber={false} soundEnabled={false} remainingTime={timerRemaining} totalTime={totalTime} phase={biddingPhase} />` — **무음**(크래클은 헤더 타이머 소유, AD-3). 전폭 바.
- **컴팩트 티커**: `<MobileBidTicker events={bidEvents ?? []} limit={3} />`.
- **셀레브레이션 오버레이**: `stage.celebrate`(sold/pass) 시 스테이지 크기에 맞춘 골드/레드 오버레이(카드의 flash-burst/ring-expand/burst-particle 클래스 재사용). 전설 전체화면 플래시는 훅이 portal로 처리(게이트됨).
- **파티클/흔들림 강도**: 훅이 반환하는 모바일 값(`LEGENDARY_PARTICLES_MOBILE` 12개, 흔들림 `amp*0.5`) 사용. `<motion.div animate={stage.shakeControls}>`로 래핑.

### 4) 대기/전이 상태
- `displayPlayer` 없으면 대기 플레이스홀더(간결). `isAssigning` 등 상위 분기는 뷰(006/007)가 처리 — 스테이지는 매물/입찰/연출에 집중.

### 5) reduced-motion
- `stage.reducedMotion` 시 플립/펀치/파티클/티커 등장 생략·정적 대체(훅·티커·globals.css `@media`가 대부분 처리, 스테이지 자체 애니메이션도 동일 원칙 적용).

## 완료 기준 체크리스트 + 검증
- [ ] `usePlayerCardStage({ ownerViewport:'mobile' })` 구독, 스테이지에서 사운드 직접 호출 0
- [ ] 초상화 플립 + 현재가 펀치 + 선두 + 콤보 배지 + 전폭 무음 타이머 바 + 티커 렌더
- [ ] 낙찰/유찰 셀레브레이션·전설 플래시가 데스크톱과 **동일 판정**으로 반영(모바일 축소 강도)
- [ ] BidTimer는 `soundEnabled={false}`(스테이지 무음, 이중 크래클 0)
- [ ] 375px 폭에서 오버플로우 없음, `reduced-motion` 시 정적
- [ ] 파일 200~400줄 권장(≤800), `any` 미사용
- [ ] `cd frontend && npm run lint && npm run build` 통과

## 제약 재확인
- 스테이지에서 `playRevealLegendary` 등 사운드 **직접 호출 금지**(훅 게이트가 소유).
- BidTimer 스테이지 바는 반드시 `soundEnabled={false}`(크래클 단일 소유 = 헤더 타이머).
- 데스크톱 무변경(스테이지는 모바일 전용·`lg:hidden` 컨테이너에서만 표시) · `any` 금지 · Tailwind만 · 신규 CSS 금지(기존 클래스 재사용) · 신규 npm 금지.
- `mobile-team-strip.tsx` 생성 금지.
