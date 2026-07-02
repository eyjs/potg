# Task 006: 관전자 뷰 모바일 탭 구조 재작성 (auction-ongoing-spectator)

## 메타데이터
- 복잡도: M
- 병렬그룹: C (task-005 머지 후)
- 우선순위: P0
- 의존: **task-003**(mobile-tab-bar), **task-005**(mobile-auction-stage)

## 담당 파일
- **수정**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/auction-ongoing-spectator.tsx`

## 배타 소유 파일
- `components/auction-ongoing-spectator.tsx` (수정) — **`lg:hidden` 모바일 블록(현재 128-158행)만 탭 구조로 재작성 + 뷰 루트 flex 전환. `hidden lg:grid` 데스크톱 블록(74-120행)·헤더 상태카드(44-64행)는 무변경.**

## import만 하는 파일 (편집 금지)
- `./parts/mobile-tab-bar` — `MobileTabBar` *(task-003)*
- `./parts/mobile-auction-stage` — `MobileAuctionStage` *(task-005)*
- `./parts/team-sidebar` — `TeamSidebar` (무변경 재사용)
- `./parts/chat-panel` — `ChatPanel` (무변경 재사용, 언마운트 금지)
- `lib/utils` — `cn` (신규 import 추가), `react` — `useState`
- `lucide-react` — 탭 아이콘

## 목표
관전자 모바일 뷰를 **하단 탭 네비게이션 구조**로 재작성한다: 탭 1 "경매"(스테이지 + 채팅), 탭 2 "현황"(`TeamSidebar`). `activeTab` state + CSS `hidden` 토글(언마운트 금지), 페이지 스크롤 0(P0-①②③④⑤⑥). **데스크톱·헤더 상태카드는 무변경.**

## 구현 상세

### 1) 뷰 루트 flex 전환 (뷰포트 예산, plan.md §뷰포트 높이 예산)
- 루트 `<div className="space-y-4">`(43행)를 모바일 고정 높이 flex로:
  `space-y-4 flex flex-col h-[calc(100dvh-7rem)] overflow-hidden lg:block lg:h-auto lg:overflow-visible`
  - `7rem` = App `Header`(h-16=4rem) + `main px-4 py-6`(3rem). 상태카드/배너/탭바는 flex가 흡수(계산식 제외).
  - `lg:` 리셋 = 데스크톱 `block`+`h-auto`+`overflow-visible`+`space-y-4` = **현재와 동일**(무변경).

### 2) 루트 자식 순서/역할 (모바일)
1. **상단 상태카드**(44-64행, 무변경) — `shrink-0` 부여만(데스크톱은 flex 아님 → no-op). 헤더 `BidTimer`(크래클 소유자·기본 `soundEnabled`) 그대로 → **항상 마운트**(탭 무관 사운드 보존).
2. **PAUSED 배너**(66-72행) — `shrink-0` 부여만(권장안 1). 조건부 유지.
3. **`hidden lg:grid` 데스크톱 블록**(74-120행, `LayoutGroup` 포함) — **무변경**(모바일 `display:none`).
4. **모바일 탭 블록**(현재 128-158행 대체) — 아래 3)로 신설.

### 3) 모바일 탭 블록 (현재 128-158행을 전면 대체)
- 최상단: `const [activeTab, setActiveTab] = useState<'auction' | 'status'>('auction')`.
- 컨테이너: `lg:hidden flex-1 min-h-0 flex flex-col`(루트 flex의 잔여 흡수). 내부:
  - **탭 콘텐츠 영역** `flex-1 min-h-0 relative`:
    - **경매 패널** `h-full flex flex-col`(+ `cn(activeTab !== 'auction' && 'hidden')`):
      - `isAssigning`이면 배정 중 플레이스홀더(기존 131-136행 문구), 아니면:
      - `<MobileAuctionStage player={roomState.currentPlayer} currentBid={roomState.currentBid} biddingPhase={phase} stageEvent={stageEvent} bidEvents={bidEvents} timerRemaining={timerRemaining} totalTime={roomState.auction.turnTimeLimit} />` — `shrink-0`
      - `<ChatPanel messages={chatMessages} onSend={onSendChat} participants={roomState.participants} myUserId={myUserId} />` — `flex-1 min-h-0`. **조건부 렌더 금지**: 기존처럼 `chatMessages && onSendChat` 가드가 필요하면 내부에서 처리하되, 탭 전환으로 언마운트되지 않도록 **패널 자체는 항상 마운트**(경매 패널은 `hidden` 토글만).
    - **현황 패널** `h-full overflow-y-auto`(+ `cn(activeTab !== 'status' && 'hidden')`):
      - `<TeamSidebar teams={roomState.teams} startingPoints={roomState.auction.startingPoints} rosterMode={roomState.auction.rosterMode} highlightCaptainId={roomState.currentBid?.bidderId ?? null} />` (관전자 props, `myCaptainId` 없음)
  - **탭바** `<MobileTabBar tabs={...} activeTab={activeTab} onTabChange={setActiveTab} />` — `shrink-0`. `tabs = [{value:'auction',label:'경매',icon:Gavel|Radio},{value:'status',label:'현황',icon:Users}]`.

### 4) 언마운트 금지 (P0-①⑤⑥ — 최중대)
- 경매/현황 패널은 **항상 동시 마운트**, 비활성만 `cn(..., activeTab !== 'x' && 'hidden')`(display:none).
- **금지 패턴**: `{activeTab === 'auction' && <경매패널/>}` 같은 조건부 렌더(언마운트 → 채팅 draft/스크롤·사운드 유실). 반드시 CSS 토글.

### 5) 기존 주석 갱신
- 122-127행 뷰포트 근거 주석을 새 계산(`100dvh-7rem` + flex 흡수)으로 갱신.

## 완료 기준 체크리스트 + 검증
- [ ] 하단 탭바로 경매↔현황 전환(라우트 이동 없음, 즉시), `role=tab`/`aria-selected` 동작
- [ ] 경매 탭: 스테이지(현재가 펀치/타이머/티커) + 채팅(`flex-1` 내부 스크롤)
- [ ] 현황 탭: `TeamSidebar` 세로 스크롤 전체 확인(무변경)
- [ ] **탭 왕복 후 채팅 draft·스크롤 위치 유지**(언마운트 0 — 조건부 렌더 미사용)
- [ ] **현황 탭 체류 중 입찰/낙찰 사운드 정상 재생**(헤더 타이머·훅 마운트 유지)
- [ ] 375/390/430px 폭에서 **페이지 자체 스크롤 0**(배너 표시 상태 포함)
- [ ] 데스크톱(`hidden lg:grid`)·헤더 상태카드 렌더 무변경(diff 0)
- [ ] `reduced-motion` 무회귀 · `any` 미사용 · `cd frontend && npm run lint && npm run build` 통과

## 제약 재확인
- **`hidden lg:grid` 데스크톱 블록·헤더 상태카드 무변경**, 루트/배너 className은 `lg:` 리셋으로 데스크톱 동일 보장.
- **탭 콘텐츠 언마운트 절대 금지(CSS `hidden` 토글만)** · Next.js 라우트 이동 금지(소켓 유지).
- `team-sidebar.tsx`/`chat-panel.tsx` 편집 금지(import만) · `ui/*`/`lib/utils.ts` 편집 금지.
- 페이지 스크롤 0(루트 `overflow-hidden` + 탭 콘텐츠 `flex-1 min-h-0` + 탭바 `shrink-0`).
- `any` 금지 · Tailwind만 · 디자인 토큰·오버워치 테마 유지 · 신규 CSS 금지 · 신규 npm 금지 · `mobile-team-strip.tsx` 생성 금지.
