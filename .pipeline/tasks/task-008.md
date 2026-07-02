# Task 008: (P1·선택) 탭 3 "매물" — PlayerStatusGrid 재사용

## 메타데이터
- 복잡도: M
- 병렬그룹: D (Group C 전부 머지 후, 단독·순차)
- 우선순위: **P1 (선택 — 시간 되면. 생략해도 P0/오늘 경매 무영향)**
- 의존: **task-003**(탭바), **task-006**(관전자), **task-007**(팀장)

## 담당 파일 (순차 재수정 — 병렬 아님)
- **수정**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/mobile-tab-bar.tsx`
- **수정**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/auction-ongoing-spectator.tsx`
- **수정**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/auction-ongoing-captain.tsx`

## 배타 소유 파일
- 위 3개 파일(Group C 전부 머지 후 단독 워크트리에서 순차 수정 → 병렬 충돌 없음).

## import만 하는 파일 (편집 금지)
- `./parts/player-status-grid` — `PlayerStatusGrid` (무변경 재사용)

## 목표
매물 풀 현황을 **탭 3 "매물"**로 추가하거나(별도 탭) 현황 탭 하단에 통합한다. 기존 `PlayerStatusGrid`(무변경, `roomState` 전체 수신) 재사용(P1 §8). **P0 완료·머지 이후에만 착수**하며, 시간/여유 없으면 생략한다.

## 착수 전 확인
- `player-status-grid.tsx` 시그니처 확인: `Props = { roomState: RoomState }`, 내부 `participants` 기반 3열 그리드(`max-h-[32rem] overflow-y-auto`). 모바일에서는 이 자체 스크롤 또는 상위 `overflow-y-auto` 컨테이너와의 중첩 스크롤을 조율할 것.

## 구현 상세 (택1)

### 방식 A — 별도 탭 3개
- `MobileTabBar`가 이미 `tabs` 배열 controlled(task-003)이므로, 006/007에서 `tabs`에 `{value:'players',label:'매물',icon:LayoutGrid|Boxes}` 추가.
- 탭 콘텐츠 영역에 **매물 패널** `h-full overflow-y-auto`(+ `cn(activeTab !== 'players' && 'hidden')`) 추가: `<PlayerStatusGrid roomState={roomState} />`. **언마운트 금지 원칙 동일**(3패널 상시 마운트).
- `activeTab` 유니온을 `'auction' | 'status' | 'players'`로 확장.

### 방식 B — 현황 탭 하단 통합 (탭 3개가 부담일 때)
- 현황 패널 내부에서 `TeamSidebar` 아래에 `PlayerStatusGrid`를 이어붙임(단일 `overflow-y-auto` 컨테이너). 탭바는 2탭 유지.

권장: 화면 폭·정보량 고려해 **방식 B**(2탭 유지, 통합)가 단순·안전. 별도 탭이 명확히 유익할 때만 방식 A.

## 완료 기준 체크리스트 + 검증
- [ ] 매물 현황이 모바일에서 접근 가능(별도 탭 또는 현황 탭 하단), 세로 스크롤
- [ ] `PlayerStatusGrid`·`player-status-grid.tsx` 무변경(import만)
- [ ] 방식 A 시 3패널 모두 상시 마운트(언마운트 금지 유지), 탭바 접근성(`role=tab`/`aria-selected`) 유지
- [ ] 페이지 스크롤 0 유지, 데스크톱 무변경
- [ ] `any` 미사용 · `cd frontend && npm run lint && npm run build` 통과

## 제약 재확인
- **P1·선택**: P0 머지 이후에만, 여유 있을 때만 착수. 생략 가능.
- 언마운트 금지(CSS 토글) 유지 · 데스크톱/헤더/`hidden lg:grid` 무변경 · `player-status-grid.tsx` 편집 금지.
- `any` 금지 · Tailwind만 · 디자인 토큰 유지 · 신규 CSS/npm 금지 · `mobile-team-strip.tsx` 생성 금지.
