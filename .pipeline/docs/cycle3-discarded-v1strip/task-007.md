# Task 007: 팀장 모바일 뷰 4존 재설계 + 입찰 컨트롤 재배치

## 메타데이터
- 복잡도: M
- 병렬그룹: C
- 의존: task-005 (MobileAuctionStage), task-003 (MobileTeamStrip)
- 우선순위: P0-1/2/4/5/6 (+ P1 LayoutGroup 키스톤 선택)

## 배타 소유 파일 (병렬 충돌 방지 — 이 태스크만 편집)
- 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/auction-ongoing-captain.tsx`

### import만 하는(수정 아님) 파일
- `components/parts/mobile-auction-stage.tsx` (task-005), `components/parts/mobile-team-strip.tsx` (task-003), `components/parts/chat-panel.tsx`, `components/parts/bid-timer.tsx` — 전부 import만

## 목적
`auction-ongoing-captain.tsx`의 **`lg:hidden` 블록(현 261-325행)만** 뷰포트 고정 4존 구조(스테이지 → 팀 스트립 → 입찰 컨트롤 → 채팅)로 재작성한다. `hidden lg:grid` 데스크톱 블록(현 171-254행)은 **무변경**. 기존 `sticky bottom-0` 입찰 컨트롤을 새 고정 뷰포트 구조의 `shrink-0` flex 존으로 재배치한다(P0-6).

## 구현 상세 (P0-1/2/4/5/6)

### 1. 루트 flex 전환 (task-006과 동일 원칙)
- 뷰 루트 `<div className="space-y-4">`(현 122행)를 모바일에서만:
  `flex flex-col h-[calc(100dvh-7rem)] overflow-hidden lg:block lg:h-auto lg:overflow-visible space-y-4`.
- 루트 자식(모바일 flex):
  1. 상단 상태 카드(현 124-153행) — `shrink-0`. 헤더 `BidTimer`(현 149행)는 모바일 **시각만** 숨김 + **마운트 유지**(크래클 사운드 단독 소유). "내 잔여" 포인트(현 137-148행)는 유지(팀장 핵심 정보). 데스크톱 그대로.
  2. `PAUSED` 배너(현 155-161행) + `ASSIGNING` 배너(현 163-169행) — 각 `shrink-0`(권장안 1).
  3. `hidden lg:grid` 데스크톱 블록 — 모바일 `display:none`, **무변경**.
  4. 모바일 스테이지 블록(현 261-325행 대체) — `flex-1 min-h-0`.

### 2. 모바일 스테이지 블록 재작성 (현 261-325행) — 4존
`flex flex-col gap-* h-full min-h-0`:
- **① 스테이지** `shrink-0` ~40vh: `<MobileAuctionStage player currentBid biddingPhase stageEvent bidEvents timerRemaining totalTime={roomState.auction.turnTimeLimit} />`.
- **② 팀 스트립** `shrink-0`: `<MobileTeamStrip teams={roomState.teams} myCaptainId={userId} startingPoints={roomState.auction.startingPoints} rosterMode={roomState.auction.rosterMode} highlightCaptainId={roomState.currentBid?.bidderId ?? null} />`.
- **③ 입찰 컨트롤 바** `shrink-0` (P0-6 — 기존 sticky 재배치):
  - 현 273-312행 `sticky bottom-0 z-10 ... bg-background/95 backdrop-blur-sm -mx-4 px-4`의 **sticky/backdrop 오버레이 처리 제거**(고정 뷰포트라 떠 있을 필요 없음). 순수 `shrink-0` flex 존으로.
  - 내부 `BidButtonsRow`(현 281-287행)·`bidDisabled` 판정(현 109-114행)·상태 메시지(WAITING/SOLD/최고입찰자/정원마감, 현 290-309행)는 **로직 전부 변경 없음** — 배치 위치만 이동.
- **④ 채팅** `flex-1 min-h-0`: 기존 `<ChatPanel .../>`(현 316-323행) 그대로.

### 3. 주석 갱신
- 현 256-260행 주석을 plan.md `7rem` 근거 + 4존 구조 + 배너 flex 포함(권장안 1) + 입찰 컨트롤 재배치로 갱신.

### P1 (선택) — LayoutGroup 키스톤
- 모바일 스테이지 블록을 자체 `<LayoutGroup>`으로 래핑(데스크톱 `LayoutGroup` 현 171행과 별개). 미채택 시 정적 폴백.

## 성공 기준
- [ ] `lg:hidden` 블록만 재작성, `hidden lg:grid` 블록 **무변경**(git diff로 확인)
- [ ] 375~430px에서 **페이지 자체 스크롤 0**, 채팅만 내부 세로 스크롤
- [ ] 입찰 버튼 4종이 채팅 위 `shrink-0` 고정 위치에서 정상 동작(`bidDisabled`/최고입찰자/정원마감 메시지 그대로)
- [ ] 채팅 스크롤 중에도 스테이지 + 입찰 컨트롤 상시 접근
- [ ] 팀 스트립 잔여P/인원/선두강조·본인 팀 강조 동작
- [ ] PAUSED/ASSIGNING 배너 등장 시 문서 스크롤 없이 채팅만 감소
- [ ] 데스크톱(≥1024px) 팀장 뷰 무회귀

## 검증 방법
- `cd frontend && npm run lint && npm run build` 통과
- 375/390/430px에서 페이지 스크롤 없음 + 입찰 버튼 엄지 접근성 확인
- 최고 입찰자/팀 정원 마감/WAITING/SOLD 상태에서 버튼 disable·메시지 확인
- 데스크톱 그리드 육안 회귀 확인

## 제약 재확인
- 데스크톱 무변경(`hidden lg:grid` + 헤더 데스크톱 렌더 동일), 입찰 로직 무변경(배치만), `any` 금지, Tailwind만·신규 CSS 파일 금지, `cn()` 사용, 오버워치 토큰 유지, reduced-motion(하위 처리), `components/ui/*`/`lib/utils.ts` 수정 금지, 신규 npm 금지, 백엔드 무변경.
</content>
