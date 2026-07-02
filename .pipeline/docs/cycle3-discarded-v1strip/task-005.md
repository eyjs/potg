# Task 005: mobile-auction-stage (상단 40vh 방송 스테이지 HUD 조립)

## 메타데이터
- 복잡도: L
- 병렬그룹: B
- 의존: task-001 (공유 훅), task-002 (BidTimer bar/soundEnabled), task-004 (MobileBidTicker)
- 우선순위: P0-2/3/4 + P0(2차 연출 재생) (+ P1-8 flight-in 소스 반쪽 선택)

## 배타 소유 파일 (병렬 충돌 방지 — 이 태스크만 편집)
- 신규: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/mobile-auction-stage.tsx`

### import만 하는(수정 아님) 파일
- `hooks/use-player-card-stage.ts` — `usePlayerCardStage` + `COMBO_STAGE`/`BURST_PARTICLES`/`LEGENDARY_PARTICLES_*` 상수 (task-001 산출)
- `components/parts/bid-timer.tsx` — `BidTimer` (`variant='bar'`, `soundEnabled={false}` 사용, task-002 산출)
- `components/parts/fx/mobile-bid-ticker.tsx` — `MobileBidTicker` (task-004 산출)
- `hooks/use-heroes.ts`, `components/parts/card-rarity.ts`, `../types`, `../hooks/use-auction-socket`, `lib/utils.ts` — import만

## 목적
초상화 중심 + 오버레이 HUD로 구성된 **상단 고정 스테이지(~40vh)**를 신규 작성. 관전자/팀장 두 뷰가 공유한다. 2차 연출(팩오프닝 플립/전설 플래시/입찰 임팩트·콤보/낙찰 셀레브레이션)을 **공유 훅(task-001) 상태로 그대로 반영**하되 스테이지 크기에 맞는 축소 강도로 재생한다.

## 구현 상세

### 1. 시그니처
```ts
export function MobileAuctionStage(props: {
  player: RoomStatePlayer | null
  currentBid: RoomStateBid | null
  biddingPhase: BiddingPhase
  stageEvent?: AuctionStageEvent | null
  bidEvents?: AuctionBidEvent[]
  timerRemaining: number | null
  totalTime?: number      // roomState.auction.turnTimeLimit
}): JSX.Element
```
- 내부: `const stage = usePlayerCardStage({ player, currentBid, biddingPhase, stageEvent, variant: 'mobile' })`.

### 2. 레이아웃 (P0-2 — 초상화 중심 + 오버레이 HUD)
- 루트: `relative h-full overflow-hidden`(부모가 `shrink-0`으로 높이 지정) — **내부 스크롤 없음**.
- **배경 = 초상화(아바타)** 중심 크게 배치(`useHeroes().portraitByKey` + `avatarUrl` 폴백, 등급 프레임 `stage.frame` 적용, `pulse-glow`/`pulse-live` 등 기존 클래스). 팩오프닝 3D 플립(뒷면→정면)은 `stage.isFlipped` 반영(`current-player-card.tsx` 302-361행 패턴 축소).
- **오버레이 HUD(초상화 위)**:
  - 현재가 큰 숫자 — 입찰 시 펀치 애니메이션(`bid-pop` + framer 스프링 오버슈트, `current-player-card.tsx:452-469` 패턴 재사용, `stage.comboStage.overshoot`).
  - 입찰 선두 팀/이름(`currentBid.bidderName`).
  - 도화선 타이머 바 — `<BidTimer variant='bar' showNumber={false} soundEnabled={false} remainingTime={timerRemaining} totalTime={totalTime} phase={biddingPhase} />` (사운드는 헤더 타이머가 소유, AD-3).
  - 최근 입찰 티커 — `<MobileBidTicker events={bidEvents ?? []} limit={3} />`.
  - 콤보 배지(`stage.comboCount >= 2`, `stage.comboStage.badgeClass`).
- **화면 흔들림**: 루트를 `<motion.div animate={stage.shakeControls}>`로 감쌈(모바일 `amp*0.5`는 훅이 처리).
- **전설 플래시/파티클**: `stage.legendaryBurst && !stage.reducedMotion && stage.isActiveViewport` 시 `createPortal(document.body)` 전체화면 플래시(모바일 opacity 0.4, `stage.legendaryParticles`=12개). 훅이 사운드/발화 게이트 담당 → 데스크톱 뷰포트에서 새어나오지 않음.
- **낙찰/유찰 셀레브레이션**: `stage.celebrate`로 골드/레드 오버레이(축소판, `current-player-card.tsx:484-577` 패턴). 유찰 시 `stage.displayPlayer`(마지막 매물 스냅샷) 유지.
- **null 매물(대기)**: `stage.displayPlayer == null` → 대기 홀로그램/placeholder(스테이지 높이 유지).

### 3. 축소 강도 유지 (요구 성공기준)
- 파티클 12개(`LEGENDARY_PARTICLES_MOBILE`), 흔들림 `amp*0.5`, 연소/플래시 모바일 저강도 — **판정 기준(등급/타이밍)은 데스크톱과 동일**(훅 공유), 강도만 축소.

### P1-8 (선택) — flight-in 소스 반쪽 (AD-6)
- 낙찰 시 초상화(또는 스테이지 카드) motion 요소에 `layoutId={stage.flightLayoutId}`(=`flight-card-${sold player.id}`) + `layout` 부여. 뷰의 `LayoutGroup`(task-006/007) 안에서 `MobileTeamStrip` 신규 멤버 칩(task-003 타겟)으로 morph. 미충족 시 조용히 불발(정적 폴백).

## 성공 기준
- [ ] `MobileAuctionStage` 신규 생성(200~400줄 권장, 800 상한), 내부 스크롤 없이 `h-full` 채움
- [ ] 초상화 배경 + 오버레이(현재가 펀치/선두/타이머 바/티커/콤보) 구성
- [ ] 입찰 시 현재가 펀치 + 티커 갱신, 마감 5초 전 타이머 바 도화선(불꽃/스파크) 연출(사운드는 헤더 소유)
- [ ] 새 매물 공개 시 팩오프닝 플립 + 전설 플래시/파티클/사운드가 **데스크톱과 동일 판정**(모바일 축소 강도)
- [ ] reduced-motion 시 플립/흔들림/파티클/티커 등장 전부 생략/정적
- [ ] 데스크톱 뷰포트에서 이 컴포넌트(display:none·마운트됨)가 사운드/portal 미발화(`isActiveViewport` 게이트)

## 검증 방법
- `cd frontend && npm run lint && npm run build` 통과
- task-006/007 통합 후 375~430px에서 공개/입찰/낙찰/유찰/도화선/전설 전 연출 실동작 확인
- 데스크톱에서 전설 공개 시 사운드/플래시 **1회**(모바일 스테이지가 이중 발화 안 함) 확인

## 제약 재확인
- 데스크톱 무변경(모바일 블록에서만 시각 노출), `any` 금지, Tailwind만·신규 CSS 파일 금지(globals.css 무변경 목표 — 기존 키프레임만 재사용; **불가피 시 이 태스크가 globals.css 단독 소유**), `cn()` 사용, 오버워치 토큰 유지, reduced-motion 필수, `components/ui/*`/`lib/utils.ts`/`auction-audio-engine.ts` 수정 금지(import만), 신규 npm 금지, 백엔드 무변경.
</content>
