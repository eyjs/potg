# Task 006: 관전자 모바일 뷰 3존 재설계 통합

## 메타데이터
- 복잡도: M
- 병렬그룹: C
- 의존: task-005 (MobileAuctionStage), task-003 (MobileTeamStrip)
- 우선순위: P0-1/2/4/5 (+ P1 LayoutGroup 키스톤 선택)

## 배타 소유 파일 (병렬 충돌 방지 — 이 태스크만 편집)
- 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/auction-ongoing-spectator.tsx`

### import만 하는(수정 아님) 파일
- `components/parts/mobile-auction-stage.tsx` (task-005), `components/parts/mobile-team-strip.tsx` (task-003), `components/parts/chat-panel.tsx`, `components/parts/bid-timer.tsx` — 전부 import만

## 목적
`auction-ongoing-spectator.tsx`의 **`lg:hidden` 블록(현 128-158행)만** 뷰포트 고정 3존 구조(스테이지 → 팀 스트립 → 채팅)로 재작성한다. `hidden lg:grid` 데스크톱 블록(현 74-120행)은 **무변경**. 페이지 자체 스크롤을 제거한다.

## 구현 상세 (P0-1/2/4/5)

### 1. 루트 flex 전환 (뷰포트 예산 — plan.md 결정 반영)
- 뷰 루트 `<div className="space-y-4">`(현 43행)를 **모바일에서만** 뷰포트 상대 flex로:
  `flex flex-col h-[calc(100dvh-7rem)] overflow-hidden lg:block lg:h-auto lg:overflow-visible space-y-4`
  - `7rem` = App Header(`h-16`=4rem) + `main` py-6(3rem). `lg:` 리셋으로 **데스크톱은 기존 `block`/`space-y-4` 그대로**.
- 루트 자식 순서(모바일 flex):
  1. 상단 상태 카드(현 44-64행) — `shrink-0`. 헤더 `BidTimer`(현 60행)는 모바일에서 **시각만** 숨김(`hidden lg:*` 래핑) + **마운트 유지**(크래클 사운드 단독 소유, AD-3). 데스크톱은 그대로 노출.
  2. `PAUSED` 배너(현 66-72행) — `shrink-0` (권장안 1: flex 존 포함, 뜨면 채팅만 줄고 문서 스크롤 0).
  3. `hidden lg:grid` 데스크톱 블록 — 모바일 `display:none`(flex 제외), **무변경**.
  4. 모바일 스테이지 블록(현 128-158행 대체) — `flex-1 min-h-0`.

### 2. 모바일 스테이지 블록 재작성 (현 128-158행)
`flex flex-col gap-* h-full min-h-0`:
- **스테이지** `shrink-0` ~40vh: `isAssigning`이면 기존 "유찰자 배정 중" 카드(현 131-136행) 유지, 아니면 `<MobileAuctionStage player currentBid biddingPhase stageEvent bidEvents timerRemaining totalTime={roomState.auction.turnTimeLimit} />`.
- **팀 스트립** `shrink-0`: `<MobileTeamStrip teams={roomState.teams} startingPoints={roomState.auction.startingPoints} rosterMode={roomState.auction.rosterMode} highlightCaptainId={roomState.currentBid?.bidderId ?? null} />`.
- **채팅** `flex-1 min-h-0`: 기존 `<ChatPanel .../>`(현 149-156행) 그대로 — `h-full flex flex-col` 구조가 부모 높이를 채움.
- 존 내부 스크롤만: 스테이지/스트립 스크롤 없음(스트립만 가로), 채팅만 세로.

### 3. 주석 갱신
- 현 122-127행 뷰포트 계산 주석을 plan.md의 `7rem` 근거 + 배너 flex 포함(권장안 1)으로 갱신.

### P1 (선택) — LayoutGroup 키스톤
- 모바일 스테이지 블록을 자체 `<LayoutGroup>`으로 래핑(데스크톱 `LayoutGroup` 현 74행과 별개 스코프)해야 flight-in(task-005 소스 + task-003 타겟)이 발화. 미채택 시 정적 갱신 폴백(회귀 아님).

## 성공 기준
- [ ] `lg:hidden` 블록만 재작성, `hidden lg:grid` 블록 **무변경**(git diff로 확인)
- [ ] 375~430px에서 **페이지 자체 스크롤 0**(문서 레벨), 채팅만 내부 세로 스크롤
- [ ] 채팅 스크롤 중에도 상단 스테이지 현재가/선두/타이머 상시 보임
- [ ] 팀 스트립에서 잔여P/인원 표시·가로 스와이프·선두 강조 동작
- [ ] `PAUSED` 배너 등장 시 문서 스크롤 없이 채팅 높이만 감소
- [ ] 데스크톱(≥1024px) 관전자 뷰 무회귀

## 검증 방법
- `cd frontend && npm run lint && npm run build` 통과
- 375/390/430px devtools에서 `document.scrollingElement.scrollHeight <= clientHeight`(페이지 스크롤 없음) 확인
- ONGOING/PAUSED/ASSIGNING 상태 전환 시 레이아웃/스크롤 확인
- 데스크톱 그리드 육안 회귀 확인

## 제약 재확인
- 데스크톱 무변경(`hidden lg:grid` + 헤더 데스크톱 렌더 동일), `any` 금지, Tailwind만·신규 CSS 파일 금지, `cn()` 사용, 오버워치 토큰 유지, reduced-motion(하위 컴포넌트가 처리), `components/ui/*`/`lib/utils.ts` 수정 금지, 신규 npm 금지, 백엔드 무변경.
</content>
