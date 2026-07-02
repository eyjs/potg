# 구현 계획 — POTG 모바일 경매 스테이지 재설계 (3차 사이클)

## 요약
모바일(`<lg`) 관전자/팀장 뷰를 "데스크톱 컴포넌트 세로 스택"에서 **뷰포트 고정 방송 스테이지 구조**(상단 HUD 스테이지 → 팀 현황 가로 스트립 → [팀장: 입찰 컨트롤] → 하단 채팅)로 전면 재설계한다. 데스크톱(`lg` 이상)·백엔드·신규 패키지는 무변경. 핵심 충돌 파일은 딱 하나(`current-player-card.tsx` — 상태 로직을 공유 훅으로 추출하며 데스크톱 마크업은 불변)이며, 이를 **선행 기반 태스크(task-001)**로 두고 신규 mobile-* 컴포넌트를 그 위에 병렬로 얹는다.

---

## 병렬 실행 계획 (SSOT)

| 태스크ID | 소유 파일 (배타) | 의존 | 병렬그룹 | 우선순위 |
|---|---|---|---|---|
| task-001 | `hooks/use-player-card-stage.ts` (신규), `components/parts/current-player-card.tsx` (수정) | 없음 | **A** | P0 |
| task-002 | `components/parts/bid-timer.tsx` (수정) | 없음 | **A** | P0 |
| task-003 | `components/parts/mobile-team-strip.tsx` (신규) | 없음 | **A** | P0(+P1 선택) |
| task-004 | `components/parts/fx/mobile-bid-ticker.tsx` (신규) | 없음 | **A** | P0 |
| task-005 | `components/parts/mobile-auction-stage.tsx` (신규) | 001, 002, 004 | **B** | P0(+P1 선택) |
| task-006 | `components/auction-ongoing-spectator.tsx` (수정) | 005, 003 | **C** | P0(+P1 선택) |
| task-007 | `components/auction-ongoing-captain.tsx` (수정) | 005, 003 | **C** | P0(+P1 선택) |

경로 접두사: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/`

```
[Group A] 선행 없음 — 4개 워크트리 완전 병렬 (파일 교집합 = ∅)
  ├─ task-001  use-player-card-stage.ts(신규) + current-player-card.tsx(수정)   ← 공유 훅 기반
  ├─ task-002  bid-timer.tsx(수정)
  ├─ task-003  mobile-team-strip.tsx(신규)
  └─ task-004  fx/mobile-bid-ticker.tsx(신규)
        ▼ (Group A 전부 머지)
[Group B] — 1개 워크트리
  └─ task-005  mobile-auction-stage.tsx(신규)   depends 001(훅) + 002(BidTimer bar variant) + 004(ticker)
        ▼ (task-005 머지)
[Group C] 2개 워크트리 병렬 (파일 교집합 = ∅)
  ├─ task-006  auction-ongoing-spectator.tsx(수정)   depends 005(stage) + 003(strip)
  └─ task-007  auction-ongoing-captain.tsx(수정)     depends 005(stage) + 003(strip)
```

### 파일 충돌 증명 (각 파일 = 정확히 하나의 태스크 소유)
| 파일 | 소유 태스크 | 다른 태스크의 접근 |
|---|---|---|
| `hooks/use-player-card-stage.ts` (신규) | 001 | 005 = **import만** (수정 아님) |
| `components/parts/current-player-card.tsx` | 001 | 없음 |
| `components/parts/bid-timer.tsx` | 002 | 005 = **import + prop 사용만** |
| `components/parts/mobile-team-strip.tsx` (신규) | 003 | 006/007 = **import만** |
| `components/parts/fx/mobile-bid-ticker.tsx` (신규) | 004 | 005 = **import만** |
| `components/parts/mobile-auction-stage.tsx` (신규) | 005 | 006/007 = **import만** |
| `components/auction-ongoing-spectator.tsx` | 006 | 없음 |
| `components/auction-ongoing-captain.tsx` | 007 | 없음 |
| `components/parts/team-sidebar.tsx` | **무변경** | 003 = `diffNewMemberIds` **import만** (이미 export됨) |
| `components/parts/chat-panel.tsx` | **무변경** | 006/007 = **import만** |
| `app/globals.css` | **무변경 목표** | 전 태스크 기존 키프레임 재사용. 불가피 시 **task-005 단독 소유**(폴백 규칙) |
| `hooks/auction-audio-engine.ts` | **무변경** | 001/002 = 기존 export(`playRevealLegendary`/`startFuseCrackle`/`stopFuseCrackle`/`bidComboLevel`/`COMBO_WINDOW_MS`) **import만** |

**증명**: "소유 태스크" 열에 중복 파일 없음. Group A(001/002/003/004) 4개 파일집합 상호 교집합 ∅. Group C(006/007) 서로 다른 뷰 파일. 나머지 접근은 전부 import(파일 편집 아님) → 워크트리 머지 충돌 원천 없음. 순환 의존 없음(A→B→C 단방향 DAG).

---

## 뷰포트 높이 예산 결정 (특이사항 §"뷰포트 높이 예산" 해소)

### 배너 처리: **권장안 1 채택 — 배너를 `flex` 존 구조 안의 `shrink-0` 요소로 포함**
- 근거: (a) 페이지 스크롤 0 보장 — 루트 컨테이너가 `overflow-hidden` 고정 높이라 배너가 뜨면 `flex-1` 채팅 높이만 줄고 문서 스크롤은 발생하지 않는다. (b) 권장안 2(오버레이/토스트 전환)는 요구사항이 "배너 UX 변경 → 사용자 재확인 필요"로 명시 → 자동 파이프라인에서 회피. (c) 기존 배너 마크업(`PAUSED`/`ASSIGNING` Card)을 그대로 재배치만 하므로 리스크 최소. (d) 배너 등장 시 시프트는 채팅(`flex-1`)이 흡수 → **스테이지 HUD(`shrink-0`)는 크기 불변**, 현재가/타이머 가시성 유지.

### `calc()` 값: **고정 매직값 대신 "뷰포트 상대 루트 flex"로 상단 상태카드/배너 가변 높이를 흡수**
가변 요소(상태카드 타이틀 줄바꿈, 조건부 배너)를 정적 `calc()`에 넣으면 375px 좁은 폭에서 어긋나 페이지 스크롤이 재발한다. 대신 **고정·기지(旣知) 크롬만** `calc()`에 넣고 나머지는 flex로 분배한다.

- 고정 크롬(항상 존재, 값 확정):
  - App `Header` = `sticky top-0 h-16` → **4rem** (`common/layouts/header.tsx:27`)
  - `main` = `px-4 py-6` → 세로 padding **3rem** (`app/auction/page.tsx:29`)
  - 합계 **7rem** = `100dvh` 밖으로 빠지는 유일한 확정 크롬.
- 뷰 루트(`space-y-4` div)를 **모바일에서만** `flex flex-col h-[calc(100dvh-7rem)] overflow-hidden`로 전환(`lg:` 리셋으로 데스크톱은 기존 `block`/`space-y-4`/`h-auto` 유지 → 데스크톱 무변경). 루트 자식:
  1. 상단 상태 카드 — `shrink-0` (타이틀; 모바일에선 타이머 `hidden lg:*`로 시각 숨김·**마운트 유지**, 사운드 소스 보존)
  2. 배너(PAUSED/ASSIGNING) — `shrink-0` (조건부, 권장안 1)
  3. `hidden lg:grid` 데스크톱 블록 — 모바일 `display:none` → flex 레이아웃에서 제외(무변경)
  4. **모바일 스테이지 블록** — `flex-1 min-h-0` (내부에서 다시 flex 분배)
- 모바일 스테이지 블록 내부(다시 `flex flex-col`):
  - 스테이지 HUD(`MobileAuctionStage`) — `shrink-0`, 높이 `~40vh`(예: `h-[40vh] max-h-[22rem] min-h-[15rem]`, 정확값은 Designer 조정)
  - 팀 스트립(`MobileTeamStrip`) — `shrink-0` (가로 `overflow-x-auto`)
  - [팀장 전용] 입찰 컨트롤 바 — `shrink-0`
  - 채팅(`ChatPanel`) — `flex-1 min-h-0` (내부 세로 `overflow-y-auto`, 기존 로직 재사용)
- **불변식**: 루트 = `100dvh - 7rem` 고정 + `overflow-hidden` → 상태카드/배너가 아무리 커져도 채팅만 줄고 **문서 스크롤 0**. `dvh`는 모바일 주소창 리사이즈에 동적 대응(기존 `100dvh` 관례 유지).
- 기존 주석(`auction-ongoing-spectator.tsx:122-127`, `auction-ongoing-captain.tsx:256-260`)을 이 계산 근거로 갱신.

---

## 아키텍처 결정

- **[AD-1] `current-player-card.tsx`는 신규 컴포넌트가 아니라 "상태 훅 추출 + 재배치"로 공유한다(task-001, 선행 기반).**
  데스크톱 카드 마크업/동작은 100% 불변(순수 리팩터: 상태 로직만 `use-player-card-stage.ts`로 이전, 카드는 훅을 소비). 매물 전환 감지(`lastPlayer`), 등급(`getCardRarity`), 팩오프닝 플립 타이밍, 전설 버스트, 콤보(`bidComboLevel`/윈도우), 낙찰·유찰 셀레브레이션(`celebrate`/`seenSeq`), 화면 흔들림(`shakeControls` + 모바일 `amp*0.5`), `flightLayoutId`를 훅이 소유. 데스크톱 카드(변경 안내: 마크업 불변)와 신규 `MobileAuctionStage`가 **동일 훅**을 구독 → 등급/콤보/타이밍이 두 뷰에서 어긋나지 않는다. `COMBO_STAGE`/`BURST_PARTICLES`/`LEGENDARY_PARTICLES_*` 상수는 훅 파일로 이전·export(모바일 스테이지가 재사용).

- **[AD-2] 훅에 `variant: 'desktop' | 'mobile'` + `isActiveViewport` 게이트 — 이중 마운트 부작용 차단(핵심).**
  데스크톱/모바일 블록은 `hidden`/`lg:hidden` **CSS 토글**이라 두 컴포넌트가 항상 **동시 마운트**(display:none이어도 React effect·portal 실행). 훅은 내부 `matchMedia('(min-width:1024px)')`로 `isDesktop`을 계산하고 `isActiveViewport = variant==='desktop' ? isDesktop : !isDesktop`을 반환한다. **모든 사이드이펙트(`playRevealLegendary` 사운드)와 뷰포트 탈출 비주얼(`createPortal` 전체화면 전설 플래시)을 `isActiveViewport`로 게이트** → 현재 뷰포트에 맞는 인스턴스에서만 발화. (부수 효과: 현재 두 `CurrentPlayerCard` 동시 마운트로 잠재된 전설 사운드/플래시 이중 발화가 정리됨 — 데스크톱 **비주얼 렌더는 동일**, 사운드/플래시가 1회로 정상화되는 의도된 개선이며 회귀 아님. 리뷰어 주의: `git diff`로 데스크톱 카드 JSX 무변경 확인.)

- **[AD-3] 도화선 타이머는 `bid-timer.tsx` 단일 소유자 + `variant`/`showNumber`/`soundEnabled` prop 확장(task-002). 신규 타이머 컴포넌트 금지.**
  기존 `isUrgent`/불꽃/스파크/연소텍스처/`role=timer`/`aria-live`/크래클 로직 전부 보존, **기본값 = 기존 데스크톱 동작과 100% 동일**. 스테이지용 `variant='bar'`(전폭 게이지, 좌측 시계+숫자 박스 생략) 또는 `showNumber={false}` 추가.
  **사운드 소유 규칙(desync 방지)**: `soundEnabled?: boolean`(기본 `true`) 추가. **스테이지 타이머는 `soundEnabled={false}`(무음 비주얼), 크래클 사운드는 항상 마운트되는 헤더 타이머가 단독 소유**(모바일에서 시각은 `hidden`이어도 마운트 유지→사운드 발화). 엔진 `startFuseCrackle`이 이미 `fuseCrackleRunning` 가드로 멱등이지만, 명시적 단일 소유로 인스턴스 간 start/stop 경합 여지를 제거한다.

- **[AD-4] 팀 현황 = 신규 `mobile-team-strip.tsx`(가로 칩), `TeamSidebar` 무변경.**
  `TeamSidebar`(세로 카드 스택, 무거움)는 가로 칩에 부적합. 신규 스트립이 `roomState.teams`(팀명/`points`/`members` 인원)를 소비, `overflow-x-auto` 가로 스크롤, 입찰 선두 강조는 `highlightCaptainId === team.captainId`(사이드바와 동일 기준). `diffNewMemberIds`는 `team-sidebar.tsx`에서 **import**(이미 export, 파일 수정 없음).

- **[AD-5] 최근 입찰 티커 = 신규 소형 `fx/mobile-bid-ticker.tsx`.**
  `BidLog`(세로 8건 카드, `max-h-28` 스크롤)는 HUD 오버레이에 부적합. 신규 티커는 `bidEvents` 최근 2~3건만 축약 표시, framer-motion `AnimatePresence` 진입(신규 CSS 키프레임 불필요, 기존 `pop-in`/토큰 재사용). `MobileAuctionStage`가 마운트·`bidEvents` 전달.

- **[AD-6] flight-in 축소판(P1)은 "문자열 규약" 디커플링으로 각 태스크가 자기 파일에만 자기 반쪽을 추가(선택).**
  cycle2 검증 패턴 재사용: `layoutId = flight-card-${id}` 규약. 소스=`MobileAuctionStage`가 훅의 `flightLayoutId`(=`flight-card-${sold player.id}`)를 스테이지 초상화에 부여(task-005 선택), 타겟=`MobileTeamStrip`이 `diffNewMemberIds`로 신규 멤버 칩에 `flight-card-${member.id}` 부여(task-003 선택), 키스톤=뷰가 모바일 블록을 **자체 `LayoutGroup`**으로 래핑(task-006/007 선택, 데스크톱 `LayoutGroup`과 별개 스코프). **코드 import 의존 없음** → 각 반쪽은 자기 소유 파일에만 추가되어 병렬 충돌 없음. 어느 반쪽이라도 생략되면 애니메이션이 조용히 불발되고 **정적 갱신(칩 즉시 반영)으로 폴백** → 2차 제약과 동일, 회귀 아님.

---

## 태스크 상세 목록

| # | 태스크 | 복잡도 | 의존 | 그룹 | P0/P1 매핑 |
|---|--------|--------|------|------|-----------|
| 001 | 공유 스테이지 훅 추출 + 카드 리팩터 | L | 없음 | A | P0-2 기반, P0(연출 재사용), AD-1/AD-2 |
| 002 | bid-timer `variant`/`showNumber`/`soundEnabled` 확장 | M | 없음 | A | P0-3, AD-3 |
| 003 | mobile-team-strip (가로 칩 스트립) | M | 없음 | A | P0-5, (P1-7 바텀시트·P1-8 타겟 선택) |
| 004 | mobile-bid-ticker (최근 입찰 티커) | S | 없음 | A | P0-4 |
| 005 | mobile-auction-stage (40vh HUD 조립) | L | 001,002,004 | B | P0-2/3/4, P0(연출), (P1-8 소스 선택) |
| 006 | 관전자 뷰 3존 재설계 통합 | M | 005,003 | C | P0-1/2/4/5, (P1 선택) |
| 007 | 팀장 뷰 4존 재설계 + 입찰 컨트롤 재배치 | M | 005,003 | C | P0-1/2/4/5/6, (P1 선택) |

---

## P0 → 태스크 매핑 (전 항목 커버 확인)
| requirement.md P0 | 담당 태스크 |
|---|---|
| P0-1 뷰포트 고정 3~4존 레이아웃 (페이지 스크롤 0) | 006(관전자), 007(팀장) — 루트 flex + `overflow-hidden` |
| P0-2 상단 스테이지 컴팩트 카드 + HUD (초상화+현재가 펀치+선두) | 005 + 001(공유 훅) |
| P0-3 도화선 타이머 스테이지 바 변형 | 002(variant) + 005(무음 소비) |
| P0-4 최근 입찰 티커 | 004 + 005(마운트) |
| P0-5 팀 현황 가로 스트립 (잔여P/인원/선두강조) | 003 + 006/007(마운트) |
| P0-6 팀장 입찰 컨트롤 바 재배치(sticky→shrink-0 존) | 007 |
| P0 2차 연출(팩오프닝/입찰임팩트/도화선/골든카드) 스테이지 재생 | 001(훅 공유) + 005(렌더) + 002(타이머) |
| P0 reduced-motion 전 연출 생략/정적 대체 | 001·003·004·005 각 컴포넌트 `useReducedMotion()` |
| P0 데스크톱 무변경(회귀 0) | 001(카드 마크업 불변) + 002(기본값 동일) + 006/007(`lg:` 리셋) |
| P0 `npm run lint && npm run build` 통과 | 전 태스크 + Integrator |

## P1 (선택, 시간 초과 시 폴백)
| P1 | 담당 | 폴백 |
|---|---|---|
| P1-7 팀 로스터 바텀시트 (칩 탭) | 003 내부 자기완결(착수 전 `team-detail-dialog.tsx` 재사용 검토) | 칩 비인터랙티브(정적) |
| P1-8 flight-in 축소판 (칩으로 날아감) | 003(타겟)+005(소스)+006/007(LayoutGroup) 각 선택 반쪽, AD-6 규약 | 정적 갱신(칩 즉시 반영) — 회귀 아님 |

---

## 리스크
- **R1 (이중 마운트 부작용, AD-2)**: CSS 토글이라 데스크톱/모바일 두 인스턴스 동시 마운트 → 사운드/전설 플래시 이중 발화 위험. 완화 = 훅 `isActiveViewport` 게이트로 사운드·portal 단일화. 통합 시 데스크톱에서 전설 공개 사운드/플래시가 1회인지, 모바일에서 정상 발화하는지 실검증.
- **R2 (데스크톱 회귀, 카드 리팩터)**: 615줄 파일 상태 추출 중 데스크톱 렌더 변형 위험. 완화 = task-001은 **순수 추출**(마크업 diff 0 목표), 리뷰어가 `git diff`로 카드 JSX 무변경 확인. 훅 반환 형태를 task-001에 명세(005가 소비할 계약 고정).
- **R3 (뷰포트 예산 오차/페이지 스크롤 재발)**: 상태카드 타이틀 줄바꿈·배너로 높이 초과. 완화 = 루트 `h-[calc(100dvh-7rem)] overflow-hidden` + 가변요소 `shrink-0` + 채팅 `flex-1 min-h-0`(가변 흡수). 375·390·430px에서 문서 스크롤 0 실검증.
- **R4 (도화선 크래클 desync)**: 스테이지+헤더 두 타이머. 완화 = `soundEnabled={false}`로 스테이지 무음, 헤더 단독 소유(AD-3). 엔진 멱등 가드가 2차 안전망.
- **R5 (flight-in 반쪽 결합 실패, P1)**: LayoutGroup 스코프/타이밍 불일치 시 미발화. 완화 = P1·선택, 어느 반쪽 생략도 정적 폴백(회귀 아님). 모바일↔데스크톱 flight는 요구 안 됨(스코프 내 flight만).
- **R6 (파일 크기)**: `mobile-auction-stage.tsx`가 커질 수 있음(200~400 권장, 800 상한). 완화 = 티커는 별도 파일(004), 상태는 훅(001)이 흡수, 스테이지는 프레젠테이션 집중.
- **R7 (globals.css 다중 소유 유입)**: 신규 키프레임 필요 시 충돌. 완화 = **기존 키프레임만 재사용**(무변경 목표). 불가피하면 task-005 단독 소유로 한정.
- **R8 (lint/build 게이트)**: `any` 금지·토큰 준수·Tailwind 전용. Integrator가 `cd frontend && npm run lint && npm run build` 최종 확인.

## 제약사항 (status.json constraints 준수 요약)
데스크톱(`lg` 이상) 무변경(신규 prop/variant 기본값 = 기존 동작 동일), `components/ui/*`·`lib/utils.ts` 수정 금지(`cn()` 사용), `any` 금지, 신규 npm 패키지 금지(framer-motion 등 기존만), 백엔드 무변경(`roomState`/`bidEvents`/`stageEvent`/`chatMessages`만), Tailwind 전용·신규 CSS 파일 금지(globals.css 무변경 목표), 오버워치 테마/토큰(`--ow-gold`/`--ow-blue`/`--ow-red`) 유지·하드코딩 색/폰트/간격 금지, `prefers-reduced-motion` 대응 필수, push 사용자 확인 후.
</content>
</invoke>
