# 구현 계획 — POTG 모바일 경매 하단 탭 네비게이션 재설계 (3차 사이클)

> 본 계획은 **폐기된 v1(팀 현황 가로 스트립)** 및 이전 산출물과 **무관하게**, `requirement.md` 최종본(하단 탭 네비게이션)만을 기준으로 백지에서 재작성했다. `mobile-team-strip.tsx`는 **절대 생성하지 않는다**. `team-sidebar.tsx`/`chat-panel.tsx`/`player-status-grid.tsx`/`auction-master-view.tsx`/백엔드/데스크톱(`hidden lg:grid`)은 **무변경**.

## 요약
모바일(`<lg`) 관전자/팀장 뷰를 **하단 탭 네비게이션 앱 구조**로 재설계한다. 탭 1 "경매"(방송 스테이지 HUD → [팀장] 입찰 컨트롤 → 채팅), 탭 2 "현황"(기존 `TeamSidebar` 세로 스크롤 재사용). 탭 전환은 **클라이언트 `activeTab` state + CSS `hidden` 토글**로만 구현하고, 비활성 탭은 **언마운트 금지**(채팅 draft/스크롤·소켓·사운드 타이머 보존). 데스크톱 카드의 연출 상태 로직을 공유 훅으로 추출(선행 기반 task-001)해 신규 `MobileAuctionStage`가 동일 상태를 구독한다 — 사운드 중복 발화·판정 불일치 방지. 나머지 신규 컴포넌트(탭바/티커/타이머 확장)는 서로 다른 파일이라 **완전 병렬**로 얹는다.

---

## 병렬 실행 계획 (SSOT · 최상단 필수 표)

경로 접두사: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/`

| 태스크ID | 소유 파일 (배타) | 의존(선행) | 병렬그룹 | 우선순위 | 복잡도 |
|---|---|---|---|---|---|
| task-001 | `hooks/use-player-card-stage.ts` (신규), `components/parts/current-player-card.tsx` (수정) | 없음 | **A** | P0 | L |
| task-002 | `components/parts/bid-timer.tsx` (수정) | 없음 | **A** | P0 | M |
| task-003 | `components/parts/mobile-tab-bar.tsx` (신규) | 없음 | **A** | P0 | S |
| task-004 | `components/parts/fx/mobile-bid-ticker.tsx` (신규) | 없음 | **A** | P0 | S |
| task-005 | `components/parts/mobile-auction-stage.tsx` (신규) | 001, 002, 004 | **B** | P0 | L |
| task-006 | `components/auction-ongoing-spectator.tsx` (수정) | 003, 005 | **C** | P0 | M |
| task-007 | `components/auction-ongoing-captain.tsx` (수정) | 003, 005 | **C** | P0 | M |
| task-008 | `components/parts/mobile-tab-bar.tsx`·`auction-ongoing-spectator.tsx`·`auction-ongoing-captain.tsx` (재수정) | 003, 006, 007 | **D** | **P1(선택)** | M |

```
[Group A] 선행 없음 — 4개 워크트리 완전 병렬 (파일 교집합 = ∅)
  ├─ task-001  use-player-card-stage.ts(신규) + current-player-card.tsx(수정)   ← 공유 훅 기반
  ├─ task-002  bid-timer.tsx(수정)                    ← variant/showNumber/soundEnabled
  ├─ task-003  mobile-tab-bar.tsx(신규)               ← 하단 탭바(경매/현황)
  └─ task-004  fx/mobile-bid-ticker.tsx(신규)         ← 최근 입찰 티커
        ▼ (Group A 전부 머지)
[Group B] — 1개 워크트리
  └─ task-005  mobile-auction-stage.tsx(신규)   deps 001(훅)+002(BidTimer bar)+004(ticker)
        ▼ (task-005 머지)
[Group C] — 2개 워크트리 병렬 (파일 교집합 = ∅)
  ├─ task-006  auction-ongoing-spectator.tsx(수정)   deps 003(탭바)+005(stage)
  └─ task-007  auction-ongoing-captain.tsx(수정)     deps 003(탭바)+005(stage)
        ▼ (Group C 전부 머지) — 여기까지 P0 완료, 오늘 경매 사용 가능
[Group D] — (P1·선택) 1개 워크트리, 003/006/007 재수정(순차)
  └─ task-008  탭 3 "매물"(PlayerStatusGrid 재사용)   ← 시간 되면. 생략해도 P0 무영향
```

### 파일 충돌 증명 (각 파일 = 정확히 하나의 태스크가 배타 소유)
| 파일 | 소유 태스크 | 다른 태스크의 접근 |
|---|---|---|
| `hooks/use-player-card-stage.ts` (신규) | 001 | 005 = **import만** |
| `components/parts/current-player-card.tsx` | 001 | 없음 |
| `components/parts/bid-timer.tsx` | 002 | 005 = **import + prop 사용만** |
| `components/parts/mobile-tab-bar.tsx` (신규) | 003 | 006/007 = **import만**; 008 = 순차 재수정(병렬 아님) |
| `components/parts/fx/mobile-bid-ticker.tsx` (신규) | 004 | 005 = **import만** |
| `components/parts/mobile-auction-stage.tsx` (신규) | 005 | 006/007 = **import만** |
| `components/auction-ongoing-spectator.tsx` | 006 | 008 = 순차 재수정(병렬 아님) |
| `components/auction-ongoing-captain.tsx` | 007 | 008 = 순차 재수정(병렬 아님) |
| `components/parts/team-sidebar.tsx` | **무변경** | 006/007 = 현황 탭 **import만**(스크롤 컨테이너 래핑) |
| `components/parts/chat-panel.tsx` | **무변경** | 006/007 = 경매 탭 **import만**(언마운트 금지) |
| `components/parts/player-status-grid.tsx` | **무변경** | 008(P1) = **import만** |
| `hooks/auction-audio-engine.ts` | **무변경** | 001 = 기존 export **import만**(`playRevealLegendary`, `COMBO_WINDOW_MS`, `bidComboLevel`) |
| `app/globals.css` | **무변경** | 전 태스크 기존 키프레임 **재사용만**(`bid-pop`/`pop-in`/`flash-burst`/`burst-particle`/`timer-*` 이미 존재·reduced-motion 처리 존재) |
| `components/auction-master-view.tsx` | **무변경(스코프 제외)** | 접근 금지 |
| `components/ui/*`, `lib/utils.ts` | **무변경(금지)** | `cn()` import만 |

**증명**: "소유 태스크" 열에 동일 파일 중복 없음. 병렬 그룹 내부 파일집합 교집합 = ∅ — Group A{001·002·003·004} 4파일집합 상호 배타, Group C{006·007} 서로 다른 뷰 파일. 나머지 접근은 전부 import/클래스 재사용(파일 편집 아님)이라 워크트리 머지 충돌 없음. task-008(P1)만 003/006/007 파일을 **재수정**하지만 이는 Group D 단독·순차(Group C 전부 머지 후)라 병렬 충돌 아님. DAG는 A→B→C→D 단방향, **순환 없음**.

---

## 코드베이스 검증 결과 (실제 소스 대조 완료)
requirement.md의 라인 번호를 실제 파일과 1:1 대조 확인했다. cycle2가 이미 머지되어 아래 자산이 존재한다.

- **`auction-ongoing-spectator.tsx`(161줄)**: 루트 `<div className="space-y-4">`. 상단 상태카드(44-64행, 타이틀+`BidTimer`+`LiveChip`), PAUSED 배너(66-72행), `<LayoutGroup><div className="hidden lg:grid grid-cols-12 gap-4">`(74-120행, 데스크톱), **`lg:hidden ...min-h-[calc(100dvh-10rem)]` 모바일 블록(128-158행)** = 재작성 대상. `cn` **미import**(task-006에서 추가).
- **`auction-ongoing-captain.tsx`(328줄)**: 상단 상태카드(124-153행, "내 잔여" 포함), PAUSED(155-161)·ASSIGNING(163-169) 배너, `hidden lg:grid` 데스크톱(171-254), **`lg:hidden` 모바일 블록(261-325행)** = 재작성 대상. `BidButtonsRow`(28-70행, 파일 내 로컬)·`bidDisabled` 판정(109-114) 그대로 재사용. `cn`·`useMemo` 이미 import.
- **`current-player-card.tsx`(615줄)**: `Props={player,currentBid,biddingPhase,stageEvent}`. 상태 로직 = `lastPlayer` 전환감지(114-115), `seenSeq`/`celebrate` 셀레브레이션(117-127), `isDesktop` matchMedia(130-138), `rarity`(141-146), `isFlipped`/`legendaryBurst`/`legendaryFiredRef` 팩오프닝(147-183), 콤보 `comboTimestampsRef`/`prevBidAmountRef`/`comboCount`/`comboLevel`/`shakeControls`(190-236). 상수 `COMBO_STAGE`(66-91), `BURST_PARTICLES`(42-50), `LEGENDARY_PARTICLES_DESKTOP/MOBILE`(53-64). `playRevealLegendary()` 호출 = **인스턴스별**(161·174행) → 데스크톱+모바일 이중 마운트 시 중복 발화 리스크(AD-2에서 해소).
- **`bid-timer.tsx`(218줄)**: `Props={remainingTime,totalTime,phase,size}`. `isUrgent`(50)·`isEnded`(51)·게이지(161-215)·`role=timer`/`aria-live`(112-113)·`startFuseCrackle/stopFuseCrackle`(86-102). 단일 소유 파일.
- **`team-sidebar.tsx`(297줄)**: `Props={teams,myCaptainId,startingPoints,rosterMode,onTeamClick,highlightCaptainId}`. 자체 신규멤버 진입 애니메이션 보유 → **무변경**, `overflow-y-auto`로만 래핑.
- **`chat-panel.tsx`(140줄)**: `h-full flex flex-col min-h-[20rem]`. `draft` state(46)·`stickToBottomRef` 스크롤 유지(48,60-65). 언마운트되면 draft/스크롤 유실 → **CSS 토글 필수**.
- **`auction-audio-engine.ts`(514줄)**: 모듈 싱글턴 엔진. `startFuseCrackle` 내부 `fuseCrackleRunning` 중복시작 가드 있음(433). `playRevealLegendary`는 **모듈 dedup 없음** → 호출측(훅) 게이트 필요. **무변경**.
- **`use-auction-sound.ts`(88줄)**: 소켓 레벨에서 bid/sold/pass 사운드 **1회** 발화(카드와 무관). `use-auction-socket.ts`가 1회 호출 → **무변경**.
- **`page.tsx`**: `<Header/>`(sticky `h-16`=**4rem**, `header.tsx` 확인) + `<main className="px-4 py-6 ...">`(세로 padding **3rem**). = 뷰 루트 위 고정 크롬 **7rem**.
- **`globals.css`**: `bid-pop`/`pop-in`/`flash-burst`/`ring-expand`/`burst-particle`/`timer-flame`/`timer-spark`/`timer-ember` 키프레임 + `@media (prefers-reduced-motion: reduce)` 블록 존재 → 신규 컴포넌트는 **재사용만**, 편집 불필요.

---

## 뷰포트 높이 예산 결정 (특이사항 §"뷰포트 높이 예산" 해소)

### 배너 처리: **권장안 1 채택 — 배너를 `flex` 존의 `shrink-0` 요소로 포함**
근거: 뷰 루트를 `overflow-hidden` 고정 높이로 만들면 배너/탭바가 있어도 **탭 콘텐츠(`flex-1`) 높이만 줄고 문서 스크롤 0**. 권장안 2(오버레이/토스트)는 배너 UX를 바꿔 자동 파이프라인에서 회피. 기존 배너 마크업 재배치만으로 충족.

### `calc()` 값: **가변 요소를 매직값에서 배제하고 flex로 흡수 → `100dvh - 7rem`**
requirement가 경고한 가변 요소(상태카드 타이틀 줄바꿈·조건부 배너·탭바 높이)를 정적 `calc()`에 넣지 않는다. **뷰 루트 자체를 모바일에서 고정 높이 flex 컨테이너로 전환**하고, 상태카드/배너/탭바를 그 안의 `shrink-0` 형제로, 탭 콘텐츠를 `flex-1 min-h-0`으로 두어 잔여를 흡수시킨다.

- **고정 크롬(값 확정)** = App `Header` `sticky top-0 h-16`(**4rem**) + `main px-4 py-6` 세로(**3rem**) = **7rem**. (상태카드·배너·탭바는 계산식에 넣지 않는다 — flex가 흡수.)
- **뷰 루트**(`spectator`/`captain`의 최상위 `<div className="space-y-4">`)를 **모바일에서만** 고정 높이 flex 컨테이너로:
  `flex flex-col h-[calc(100dvh-7rem)] overflow-hidden` + **데스크톱 리셋** `lg:block lg:h-auto lg:overflow-visible`.
  → 데스크톱은 `block`+`h-auto`+`overflow-visible`+`space-y-4` = **현재와 100% 동일**(무변경). 모바일만 고정 높이·클립.
- **루트 자식(모바일 flex, 위→아래)**:
  1. **상단 상태 카드** `shrink-0` — 타이틀 + `LiveChip` + **헤더 `BidTimer`(크래클 사운드 단독 소유자)**. **탭 콘텐츠 영역 밖(위)에 위치 → activeTab과 무관하게 항상 마운트·항상 표시**(P0-⑥ 크래클 보존 근거).
  2. **배너**(PAUSED / [팀장]ASSIGNING) `shrink-0` — 조건부(권장안 1). *기존 루트 배너에 `shrink-0` 부여만; 데스크톱은 flex 아니라 no-op.*
  3. **`hidden lg:grid` 데스크톱 블록** — 모바일 `display:none`(flex 미참여, 무변경).
  4. **탭 콘텐츠 영역** `flex-1 min-h-0` — 경매 패널 + 현황 패널을 **항상 동시 마운트**, 비활성만 `cn(..., activeTab !== 'x' && 'hidden')`.
  5. **`MobileTabBar`** `shrink-0`(높이 `h-14`=3.5rem, 터치 타겟 ≥44px).
- **탭 콘텐츠 영역 내부**:
  - **경매 패널** `h-full flex flex-col`(+`activeTab!=='auction' && 'hidden'`): `MobileAuctionStage`(`shrink-0`) → [팀장: 입찰 컨트롤 `shrink-0`] → `ChatPanel`(`flex-1 min-h-0`, 내부 세로 스크롤만).
  - **현황 패널** `h-full overflow-y-auto`(+`activeTab!=='status' && 'hidden'`): `<TeamSidebar .../>`(무변경) 세로 스크롤.
- **불변식**: 루트 = `100dvh-7rem` 고정 + `overflow-hidden` → 상태카드/배너/탭바 실제 높이와 무관하게 **문서 스크롤 0**. `dvh` 사용으로 모바일 주소창 리사이즈 동적 대응. 기존 주석(`spectator:122-127`, `captain:256-260`)은 새 근거로 갱신.

---

## 아키텍처 결정 (AD)

- **[AD-1] `current-player-card.tsx` 상태 로직을 공유 훅으로 추출(task-001, 선행 기반).**
  데스크톱 카드는 **마크업/동작 100% 불변(순수 리팩터)**. 매물 전환감지·등급(`getCardRarity`)·팩오프닝 플립·전설 버스트·콤보(`bidComboLevel`/`COMBO_WINDOW_MS`)·낙찰/유찰 셀레브레이션·흔들림(`shakeControls`, 모바일 `amp*0.5`)·`flightLayoutId`를 `use-player-card-stage.ts`가 소유. 데스크톱 카드와 신규 `MobileAuctionStage`가 **동일 훅**을 구독 → 등급/콤보/타이밍 불일치·사운드 중복 방지. `COMBO_STAGE`·파티클 상수를 훅 파일로 이전·export(카드는 훅 파일에서 import, 값 동일 → 데스크톱 시각 불변).

- **[AD-2] `ownerViewport` + `isActiveViewport` 게이트 — 이중 마운트 부작용 차단(핵심 방어).**
  데스크톱(`hidden lg:grid`)·모바일(`lg:hidden`) 블록은 CSS 토글이므로 카드/스테이지가 **뷰포트와 무관하게 항상 동시 마운트**(현재도 카드 2개 마운트). 훅은 `matchMedia('(min-width:1024px)')`로 `isDesktop`을 계산하고, 소비자가 선언한 `ownerViewport:'desktop'|'mobile'`에 대해 `isActiveViewport = (ownerViewport === (isDesktop ? 'desktop' : 'mobile'))`을 산출한다. **사이드이펙트(`playRevealLegendary`)·뷰포트 탈출 비주얼(`createPortal` 전설 전체화면 플래시)을 `isActiveViewport`로 게이트** → 현재 뷰포트에 대응하는 **인스턴스 1개만 발화**. (데스크톱 카드는 `ownerViewport='desktop'`, 모바일 스테이지는 `ownerViewport='mobile'`.) 이는 현재 잠재된 전설음 이중 발화를 함께 제거하는 **requirement 지시(“isActiveViewport 게이트 방어”) 부합 개선**이며, 데스크톱 관점 청감(1회 발화)은 정상. **탭 가시성 기준이 아니라 뷰포트 기준**이므로 현황 탭에 있어도 경매 사운드가 발화된다(P0-⑥).

- **[AD-3] 도화선 타이머 = `bid-timer.tsx` 단일 소유자 + `variant`/`showNumber`/`soundEnabled` 확장(task-002).**
  기존 3개 prop 유지 + 신규 prop 기본값 = **기존 데스크톱 동작 100% 동일**. 스테이지용 `variant='bar'`(전폭 게이지 바). **크래클 사운드 소유 규칙**: `soundEnabled?: boolean`(기본 `true`) — 스테이지 타이머 바는 `soundEnabled={false}`(무음 비주얼), **크래클은 상단 상태카드의 헤더 타이머(`soundEnabled` 기본 true)가 단독 소유**. 헤더 타이머는 탭 콘텐츠 영역 밖(위)에 있어 **항상 마운트** → 탭 전환/현황 탭에서도 크래클 정상 발화. 데스크톱에서 모바일 스테이지 타이머(display:none·마운트됨)는 무음이라 이중 크래클 없음. **별도 모바일 전용 타이머 컴포넌트 신규 작성 금지**(단일 소유자 유지).

- **[AD-4] 탭 전환 = 클라이언트 `activeTab` state + CSS `hidden` 토글(언마운트 절대 금지).**
  `activeTab`는 각 뷰(`spectator`/`captain`)의 모바일 flex 블록 최상단 `useState<'auction'|'status'>('auction')`(뷰마다 독립, 공유 저장소 불필요 — 애초에 다른 컴포넌트 트리). 경매/현황 패널을 **항상 동시 마운트**하고 비활성만 `display:none`. `display:none`은 React 상태·타이머·리스너를 보존하므로 채팅 draft/스크롤·소켓·사운드 타이머 전부 유지(P0-①⑤⑥). **Next.js 라우트 이동 금지**(소켓 유지). Radix `ui/tabs.tsx`는 비활성 탭을 언마운트(+forceMount 우회 필요·skewed 스타일 비용)하므로 **미채택** → 신규 경량 `mobile-tab-bar.tsx`(state는 부모 소유, `role=tablist/tab`+`aria-selected` 수동 부여, 신규 패키지 아님).

- **[AD-5] 현황 탭 = 기존 `TeamSidebar` 무변경 재사용.**
  `TeamSidebar`를 `<div className="h-full overflow-y-auto">`로 감싸 그대로 렌더. 관전자 = 기존 props(`teams`/`startingPoints`/`rosterMode`/`highlightCaptainId`), 팀장 = `myCaptainId` 추가(데스크톱 팀장 뷰와 동일 props). **`team-sidebar.tsx` 편집 없음**. 낙찰 시 다음 재렌더에서 정적 갱신(사이드바 자체 멤버 진입 애니메이션 유지) → flight-in 불필요.

- **[AD-6] 스테이지 = 신규 `MobileAuctionStage` 컴포넌트(카드 prop 분기 아님).**
  데스크톱 카드(세로 중앙 정렬·176px 아바타·하단 2컬럼 패널)와 모바일 HUD(초상화 중심·오버레이 텍스트·전폭 타이머 바·컴팩트 티커)는 DOM 트리가 근본적으로 달라 `compact` boolean 분기는 카드를 800줄 상한에 근접시킨다. 신규 파일로 분리하되 **상태는 공유 훅으로 일치**(AD-1). 파티클/콤보 강도는 훅이 반환하는 모바일 축소 값(파티클 12개, 흔들림 진폭 50%) 재사용.

- **[AD-7] flight-in 모바일 축소판 = P2, 구현 안 함(requirement 27/91행).**
  경매 탭에 팀 UI가 없어 flight 목적지(팀 카드)가 다른 탭에 있어 안 보임 → 체감 가치 낮음. **정적 갱신(현황 탭 `TeamSidebar` 재렌더)으로 충분**, 태스크 작업 없음. 데스크톱 flight-in(`LayoutGroup`)은 무변경.

---

## requirement P0 ①~⑥ → 태스크 매핑 (자체 점검용)
| # | requirement P0 항목 | 담당 태스크 | 근거 |
|---|---|---|---|
| **①** | 탭 구현 방식: `activeTab` state + CSS `hidden` 토글, 언마운트/라우트이동 금지 | **006, 007** | AD-4. 양 뷰 모바일 블록 최상단 state + 양 패널 상시 마운트 |
| **②** | 하단 탭바: 경매/현황, `role=tablist/tab`+`aria-selected`, 터치≥44px, skewed/네온 | **003** (+006/007 배선) | AD-4. 경량 커스텀 탭바, `h-14` |
| **③** | 경매 탭 상단 스테이지: 초상화+현재가 펀치+선두+도화선 바+티커 | **005** (+001 훅, +002 바, +004 티커) | AD-1/AD-6 |
| **④** | 현황 탭: 기존 `TeamSidebar` 재사용(무변경, 스크롤 래핑) | **006, 007** | AD-5 |
| **⑤** | 탭 전환 상태 유지: 채팅 draft/스크롤 유실 없음 | **006, 007** | AD-4. `display:none` 상태 보존 |
| **⑥** | 탭 전환 사운드 유지: 비활성 탭에서도 경매 사운드 재생 | **006, 007** (언마운트 금지) + **001**(훅 마운트·뷰포트 게이트) + **002**(헤더 크래클 항상 마운트) | AD-2/AD-3/AD-4 |

## requirement 핵심기능 §1~§9 → 태스크 매핑 (보강)
| requirement.md 조항 | 담당 태스크 |
|---|---|
| §1 탭 구현 방식(상태+CSS 토글, 언마운트/라우트 금지) | 006, 007 (AD-4) |
| §2 하단 탭바 | 003 + 006/007 |
| §3 경매 탭 상단 고정 스테이지 + 상태 공유 훅 | 005 + 001 + 004 |
| §4 도화선 타이머 스테이지 바 변형(단일 소유자 유지) | 002 + 005(무음 소비) |
| §5 경매 탭 입찰 컨트롤(팀장) `sticky`→`shrink-0` 재배치 | 007 |
| §6 경매 탭 채팅(`flex-1 min-h-0`, 언마운트 금지) | 006, 007 |
| §7 현황 탭 = `TeamSidebar` 무변경 재사용 | 006, 007 (AD-5) |
| 2차 연출(팩오프닝/전설/콤보/도화선/골든) 스테이지 재생 | 001(훅) + 005(렌더) + 002(타이머) |
| `prefers-reduced-motion` 생략/정적 대체 | 001·004·005 (+002 기존 유지) |
| 페이지 자체 스크롤 0 (`100dvh` 고정) | 006, 007 (루트 `overflow-hidden`+flex) |
| 데스크톱(`lg`) 무변경 | 001(카드 불변)+002(기본값 동일)+006/007(`lg:` 리셋) |
| 마스터 뷰 제외(무변경) | 전 태스크(마스터 파일 미접근) |
| `cd frontend && npm run lint && npm run build` 통과 | 전 태스크 + Integrator |
| §8 P1 탭 3 "매물"(`PlayerStatusGrid` 재사용) | **008 (P1·선택)** |
| §9 P2 flight-in 모바일 축소판 | 없음(AD-7, 구현 안 함) |

---

## 의존성 그래프 (DAG · 순환 없음)
```
task-001 (공유 훅 + 카드 리팩터) ─┐
task-002 (bid-timer 확장) ───────┼──▶ task-005 (mobile-auction-stage)
task-004 (티커) ─────────────────┘         │
                                            ├──▶ task-006 (spectator 탭 재작성) ─┐
task-003 (탭바) ────────────────────────────┤                                    ├──▶ task-008 (P1 매물 탭·선택)
                                            └──▶ task-007 (captain 탭 재작성) ───┘
```
- 실선 = 코드 import 의존(선행 머지 필수). task-003은 005와 무관(파일 교집합 ∅)하지만 006/007이 003·005 둘 다 import하므로 Group C 진입 전 003·005 모두 머지되어야 함.
- task-008은 P1·선택: 003/006/007을 순차 재수정. **생략해도 P0(오늘 경매)에 무영향.**

---

## 리스크 및 완화
- **R1 (언마운트 회귀, 최중대)**: 탭 전환에서 실수로 조건부 렌더(`{activeTab==='auction' && <ChatPanel/>}`)를 쓰면 언마운트되어 draft/스크롤/사운드 유실(P0-①⑤⑥ 위반). 완화 = **반드시 CSS `hidden` 토글**(양 패널 상시 마운트). 코드리뷰에서 "탭 패널 조건부 렌더 0" 검사, 통합 시 탭 왕복 후 draft/스크롤 유지 실검증.
- **R2 (이중 마운트 사운드 중복, AD-2)**: 데스크톱+모바일 두 인스턴스 동시 마운트로 전설 공개음/플래시 이중 발화. 완화 = `isActiveViewport` 게이트로 현재 뷰포트 인스턴스만 발화. 통합 시 데스크톱·모바일 각각 전설 공개음 1회 확인.
- **R3 (크래클 소유자 마운트, AD-3)**: 헤더 타이머가 탭 콘텐츠 밖(위)에 있어야 항상 마운트. 완화 = 상태카드를 탭 콘텐츠 상위 `shrink-0`으로 배치. 통합 시 현황 탭 체류 중 마감 5초에 크래클 발화 확인 + 스테이지 바 타이머 무음(이중 크래클 0) 확인.
- **R4 (데스크톱 무변경 회귀)**: 뷰 루트 flex 전환이 데스크톱에 새면 회귀. 완화 = `lg:block lg:h-auto lg:overflow-visible` 리셋, `hidden lg:grid` 블록·헤더 상태카드 diff 0. task-001 카드 리팩터는 순수 추출(마크업 불변). git diff로 데스크톱 경로 확인.
- **R5 (뷰포트 예산/페이지 스크롤)**: 상태카드 줄바꿈·배너·탭바로 높이 초과. 완화 = 루트 `h-[calc(100dvh-7rem)] overflow-hidden` + 가변요소 `shrink-0` + 탭 콘텐츠 `flex-1 min-h-0`. 375/390/430px 폭에서 문서 스크롤 0 실검증(관전자·팀장·배너 표시 상태 각각).
- **R6 (카드 리팩터 상태 타이밍)**: 렌더 단계 상태 보정 패턴(`if (...) setState(...)`)을 훅으로 옮길 때 타이밍 어긋나면 팝/플립 회귀. 완화 = 훅 본문에서 동일 렌더-단계 패턴 유지(effect로 옮기지 않음), 콤보 상수(`COMBO_WINDOW_MS`) 동일 공유.
- **R7 (파일 크기)**: `mobile-auction-stage.tsx` 비대. 완화 = 티커 별도(004)·상태 훅(001) 흡수·프레젠테이션 집중(200~400 권장, 800 상한).
- **R8 (스코프 오독 재발)**: 폐기된 v1(팀 가로 스트립)·바텀시트 논의 참조 금지(requirement 30/158행). 완화 = `mobile-team-strip.tsx` 생성 금지, `team-sidebar.tsx` 무변경 재확인을 전 태스크 제약에 명시.
- **R9 (lint/build 게이트)**: `any` 금지·토큰 준수·신규 CSS 금지. 완화 = Integrator가 `cd frontend && npm run lint && npm run build` 최종 확인.

---

## 제약사항 (전 태스크 공통 재확인)
데스크톱(`lg`) 무변경(신규 prop/variant 기본값 = 기존 동작 100% 동일) · **마스터 뷰 스코프 제외(수정 금지)** · 탭 전환은 클라이언트 상태만(라우트 이동 금지·소켓 유지) · **탭 콘텐츠 언마운트 금지(CSS `hidden` 토글만)** · `components/ui/*`·`lib/utils.ts` 수정 금지(`cn()` 병합) · **`any` 금지** · 신규 npm 패키지 금지(framer-motion 등 기존만, Radix `ui/tabs.tsx` 강제 아님) · 백엔드 무변경(`roomState`/`bidEvents`/`stageEvent`/`chatMessages`만) · **Tailwind 전용·신규 CSS 파일 금지**(globals.css 기존 키프레임 재사용, 편집 불필요) · 오버워치 테마/디자인 토큰(`--ow-gold`/`--ow-blue`/`--ow-red` 등) 유지·하드코딩 금지·탭바 터치 타겟 ≥44px · `prefers-reduced-motion: reduce` 대응 필수 · **`mobile-team-strip.tsx` 생성 금지** · **속도 우선(P0 초과 리팩터 금지)** · push는 사용자 확인 후(자동 push 금지).

## 자체 점검 결과
- **P0 ①~⑥ 전부 태스크 매핑됨** — ①⑤ 006/007, ② 003, ③ 005(+001/004), ④ 006/007, ⑥ 006/007+001+002. ✔
- **병렬 그룹 파일 교집합 = ∅** — Group A{001,002,003,004}·Group C{006,007} 상호 배타. ✔
- **의존 DAG 순환 없음** — A→B→C→D 단방향. ✔
- **데스크톱 무변경 보장** — 001 순수 추출(마크업 불변)·002 prop 기본값 동일·006/007 `lg:` 리셋. ✔
- **`mobile-team-strip.tsx` 절대 생성 안 함** — 파일 목록에 부재, 전 태스크 제약에 금지 명시. ✔
