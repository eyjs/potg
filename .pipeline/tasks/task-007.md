# Task 007: 팀장 뷰 모바일 탭 구조 재작성 + 입찰 컨트롤 재배치 (auction-ongoing-captain)

## 메타데이터
- 복잡도: M
- 병렬그룹: C (task-005 머지 후) — task-006과 서로 다른 파일이라 **병렬 가능**
- 우선순위: P0
- 의존: **task-003**(mobile-tab-bar), **task-005**(mobile-auction-stage)

## 담당 파일
- **수정**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/auction-ongoing-captain.tsx`

## 배타 소유 파일
- `components/auction-ongoing-captain.tsx` (수정) — **`lg:hidden` 모바일 블록(현재 261-325행)만 탭 구조로 재작성 + 뷰 루트 flex 전환. `hidden lg:grid` 데스크톱 블록(171-254행)·헤더 상태카드(124-153행)·로컬 `BidButtonsRow`(28-70행)·`bidDisabled` 판정(109-114행)은 무변경.**

## import만 하는 파일 (편집 금지)
- `./parts/mobile-tab-bar` — `MobileTabBar` *(task-003)*
- `./parts/mobile-auction-stage` — `MobileAuctionStage` *(task-005)*
- `./parts/team-sidebar` — `TeamSidebar` (무변경 재사용)
- `./parts/chat-panel` — `ChatPanel` (무변경 재사용, 언마운트 금지)
- `lib/utils` — `cn`(기존 import), `react` — `useState`(추가), `useMemo`(기존)
- `lucide-react` — 탭 아이콘

## 목표
팀장 모바일 뷰를 **하단 탭 네비게이션 구조**로 재작성한다: 탭 1 "경매"(스테이지 → **입찰 컨트롤** → 채팅), 탭 2 "현황"(`TeamSidebar`, `myCaptainId` 강조). 기존 `sticky bottom-0` 입찰 컨트롤을 탭 구조 안 `shrink-0`으로 재배치(P0-⑤). `activeTab` state + CSS `hidden` 토글(언마운트 금지), 페이지 스크롤 0. **데스크톱·헤더·입찰 로직 무변경.**

## 구현 상세

### 1) 뷰 루트 flex 전환 (task-006과 동일 원칙)
- 루트 `<div className="space-y-4">`(122행)를:
  `space-y-4 flex flex-col h-[calc(100dvh-7rem)] overflow-hidden lg:block lg:h-auto lg:overflow-visible`
  - `7rem` = App Header(4rem) + main py-6(3rem). 상태카드/배너/탭바는 flex 흡수. `lg:` 리셋 = 데스크톱 동일(무변경).

### 2) 루트 자식 순서/역할 (모바일)
1. **헤더 상태카드**(124-153행, 무변경) — `shrink-0` 부여만. "내 잔여" 포인트 + 헤더 `BidTimer`(크래클 소유자) 그대로 → 항상 마운트.
2. **PAUSED 배너**(155-161행) + **ASSIGNING 배너**(163-169행) — 각 `shrink-0` 부여만(권장안 1). 조건부 유지.
3. **`hidden lg:grid` 데스크톱 블록**(171-254행, `LayoutGroup`·`BidButtonsRow`·입찰 패널 포함) — **무변경**(모바일 `display:none`).
4. **모바일 탭 블록**(현재 261-325행 대체) — 아래 3)로 신설.

### 3) 모바일 탭 블록 (현재 261-325행을 전면 대체)
- 최상단: `const [activeTab, setActiveTab] = useState<'auction' | 'status'>('auction')`.
- 컨테이너: `lg:hidden flex-1 min-h-0 flex flex-col`. 내부:
  - **탭 콘텐츠 영역** `flex-1 min-h-0 relative`:
    - **경매 패널** `h-full flex flex-col`(+ `cn(activeTab !== 'auction' && 'hidden')`):
      - `<MobileAuctionStage player={roomState.currentPlayer} currentBid={roomState.currentBid} biddingPhase={phase} stageEvent={stageEvent} bidEvents={bidEvents} timerRemaining={timerRemaining} totalTime={roomState.auction.turnTimeLimit} />` — `shrink-0`
      - **입찰 컨트롤** — `shrink-0`. 기존 273-312행 마크업(입찰 Label + `<BidButtonsRow key={targetPlayerId ?? 'none'} disabled={bidDisabled} currentBid={currentBidAmount} maxBid={myPoints} onSubmit={handleBid} />` + WAITING/SOLD/isHighestBidder/teamFull 상태 메시지)을 그대로 이전하되 **`sticky bottom-0 z-10 ... -mx-4 px-4 backdrop-blur` 래핑을 제거**(탭이 곧 다른 화면이라 sticky 불필요, `shrink-0`으로 단순화). `BidButtonsRow`·`bidDisabled`·`handleBid` 로직 **무변경**.
      - `<ChatPanel messages={chatMessages} onSend={emit.sendChat} participants={roomState.participants} myUserId={userId} />` — `flex-1 min-h-0`. **항상 마운트**(탭 전환 시 `hidden` 토글만).
    - **현황 패널** `h-full overflow-y-auto`(+ `cn(activeTab !== 'status' && 'hidden')`):
      - `<TeamSidebar teams={roomState.teams} myCaptainId={userId} startingPoints={roomState.auction.startingPoints} rosterMode={roomState.auction.rosterMode} highlightCaptainId={roomState.currentBid?.bidderId ?? null} />` (팀장 props — `myCaptainId` 포함, 데스크톱 팀장 뷰와 동일)
  - **탭바** `<MobileTabBar tabs={...} activeTab={activeTab} onTabChange={setActiveTab} />` — `shrink-0`.

### 4) 언마운트 금지 (P0-①⑤⑥ — 최중대)
- 경매/현황 패널 **항상 동시 마운트**, 비활성만 `display:none`. 조건부 렌더(`{activeTab==='auction' && ...}`) **금지** — 채팅 draft/스크롤·사운드 유실 방지.

### 5) 기존 주석 갱신
- 256-260행 뷰포트 근거 주석을 새 계산(`100dvh-7rem` + flex 흡수)으로 갱신.

## 완료 기준 체크리스트 + 검증
- [ ] 하단 탭바로 경매↔현황 전환(라우트 이동 없음), `role=tab`/`aria-selected` 동작
- [ ] 경매 탭: 스테이지 → 입찰 버튼(4종 증액) → 채팅 순서, 입찰 버튼 정상 동작(`bidDisabled`/`handleBid` 무변경)
- [ ] 팀 정원 마감·최고 입찰자·WAITING/SOLD 상태 메시지 기존과 동일 노출
- [ ] 현황 탭: `TeamSidebar`(내 팀 골드 강조) 세로 스크롤 확인
- [ ] **탭 왕복 후 채팅 draft·스크롤 유지**(언마운트 0)
- [ ] **현황 탭 체류 중 입찰/낙찰 사운드 정상 재생**
- [ ] 375/390/430px 폭에서 **페이지 자체 스크롤 0**(PAUSED/ASSIGNING 배너 표시 상태 포함)
- [ ] 데스크톱(`hidden lg:grid`)·헤더 상태카드 렌더 무변경(diff 0)
- [ ] `reduced-motion` 무회귀 · `any` 미사용 · `cd frontend && npm run lint && npm run build` 통과

## 제약 재확인
- **`hidden lg:grid` 데스크톱 블록·헤더 상태카드·`BidButtonsRow`·`bidDisabled` 판정 무변경**, 루트/배너 className은 `lg:` 리셋으로 데스크톱 동일.
- **탭 콘텐츠 언마운트 절대 금지(CSS `hidden` 토글만)** · 라우트 이동 금지(소켓 유지) · 입찰 컨트롤은 `shrink-0` 재배치(로직 불변).
- `team-sidebar.tsx`/`chat-panel.tsx` 편집 금지(import만) · `ui/*`/`lib/utils.ts` 편집 금지.
- 페이지 스크롤 0 · `any` 금지 · Tailwind만 · 디자인 토큰·오버워치 테마 유지 · 신규 CSS 금지 · 신규 npm 금지 · `mobile-team-strip.tsx` 생성 금지.
