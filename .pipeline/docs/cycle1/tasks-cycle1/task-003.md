# Task 003: 모바일 관전자 반응형 레이아웃 (경매현황 + 채팅)

## 메타데이터
- 우선순위: P0
- 복잡도: L
- 병렬그룹: A
- 의존: 없음 (Design 단계의 모바일 레이아웃 스펙을 소비)
- 변경 파일 (충돌 방지용):
  - 수정: `frontend/src/modules/auction/components/auction-ongoing-spectator.tsx` (단일 파일)
- 이 태스크 외 파일 수정 금지. `CurrentPlayerCard`, `BidTimer`, `ChatPanel`, `PlayerStatusGrid`, `TeamSidebar`, `BidLog`, `LiveChip`는 **import만** 하며 수정하지 않는다.
- **Design 산출물 참조 필수**: Design 단계가 생성한 모바일 레이아웃 스펙(간격, breakpoint, 채팅 높이 계산, sticky 입력창)을 반영한다.

## 목적
모바일 관전자가 12-col 데스크톱 그리드에 눌려 아무것도 볼 수 없는 문제를 해결한다. 같은 URL에서 `lg` breakpoint로 분기해, 모바일에서는 트위치/치지직 세로 시청 스타일(상단=실시간 경매현황, 하단=채팅)만 노출한다. 데스크톱(`lg` 이상)은 기존 레이아웃을 회귀 없이 유지한다.

## 배경 (조사 완료 — requirement.md P0-3)
현재 `auction-ongoing-spectator.tsx`는 `grid grid-cols-12`에 각 영역이 `lg:col-span-N`만 지정되어 `lg` 미만에서는 `col-span-12`(팀 사이드바)/`col-span-6`(선수현황·채팅)로 압축되어 사실상 시청 불가.
- 상단 헤더 카드(제목 + `BidTimer` + `LiveChip`)와 PAUSED 안내는 현재 그리드 밖에 있음.
- 그리드 내부 4영역: `TeamSidebar`(aside), 현황 섹션(`CurrentPlayerCard` + `BidLog`, 또는 배정 중 안내), `PlayerStatusGrid`(aside), `ChatPanel`(aside).
- 관전자는 조작 불가(스크롤만) — 기존 권한 유지.

## 구현 가이드
1. **데스크톱 격리 (최소 침습)**
   - 기존 `<div className="grid grid-cols-12 gap-4">` 를 `<div className="hidden lg:grid grid-cols-12 gap-4">` 로 변경해 데스크톱 전용으로 격리한다. 내부 JSX(4영역)는 **구조 변경 없이 그대로 유지**한다(회귀 방지).
2. **모바일 전용 블록 추가 (`lg:hidden`)**
   - 데스크톱 그리드 바로 옆(형제)으로 `<div className="lg:hidden ...">` 블록을 추가한다. 구성:
     - **상단 — 실시간 경매현황**: `CurrentPlayerCard`(현재 매물 + 현재가/입찰선두 통합), 그리고 필요 시 `BidTimer`. (헤더 카드의 `BidTimer`는 이미 상단에 있으나, 모바일에서 현황 카드와 함께 잘 보이도록 Design 스펙에 따라 배치.) 배정 중(`isAssigning`)일 때는 데스크톱과 동일한 "유찰자 배정 중" 안내를 표시.
     - **하단 — 채팅**: `ChatPanel`(messages/onSend/participants/myUserId). 화면 하단에서 남은 높이를 채우며 자체 스크롤, 입력창은 하단 고정. (Design 스펙의 높이 계산·sticky 처리 반영.)
   - 모바일에서는 `TeamSidebar`, `BidLog`, `PlayerStatusGrid`를 **숨김**(렌더하지 않음). (P1에서 탭/바텀시트로 확장 예정 — 이번 스코프 아님.)
3. **상단 헤더/PAUSED 카드**: 기존처럼 breakpoint 무관하게 상단에 유지하되, 모바일에서 과밀하지 않도록 Design 스펙에 따라 간격/타이머 표시를 조정(구조 대변경은 지양).
4. **Props 재사용**: 컴포넌트가 이미 받는 `roomState`, `timerRemaining`, `chatMessages`, `bidEvents`, `stageEvent`, `onSendChat`, `myUserId`를 모바일 블록에서 그대로 사용한다. **새 prop/소켓 로직 추가 금지** (모바일도 동일 데이터 소스 공유).
5. **관전자 read-only 유지**: 입찰/조작 UI를 모바일에 추가하지 않는다.

## 제약사항 (requirement.md + CLAUDE.md)
- 라우팅/URL 변경 금지 — 같은 경매 페이지에서 반응형 분기만.
- `any` 타입 사용 금지.
- **Tailwind CSS만 사용, 별도 CSS 파일 생성 금지.** `cn()` 유틸로 클래스 병합.
- `frontend/src/components/ui/*`, `frontend/src/lib/utils.ts` 수정 금지.
- 오버워치 테마(futuristic, skewed buttons, 고대비 네온)·기존 디자인 토큰/색상 체계 유지. 하드코딩 색상/폰트/간격 금지 — 4px 배수 또는 디자인 토큰.
- 반응형·접근성 준수 (mobile-first, WCAG 2.1 AA — 관전자 뷰라 조작은 없으나 텍스트 대비/스크롤 접근성 유지).
- 데스크톱(`lg` 이상) 레이아웃 회귀 금지.

## 성공 기준
- [ ] 375~430px 뷰포트 및 DevTools 반응형 모드에서 "현재 매물/입찰 현황"과 "채팅"이 세로 스크롤만으로 자연스럽게 확인 가능하다.
- [ ] 모바일에서 `TeamSidebar`/`BidLog`/`PlayerStatusGrid`는 노출되지 않는다.
- [ ] 채팅 입력창이 하단에 고정되고 메시지 영역이 자체 스크롤된다.
- [ ] 데스크톱(`lg` 이상)에서는 기존 12-col 레이아웃이 그대로 유지된다(회귀 없음).
- [ ] 배정 중(`ASSIGNING`)·일시정지(`PAUSED`) 상태가 모바일에서도 올바르게 표시된다.
- [ ] Design 스펙(간격/breakpoint/채팅 높이/sticky 입력창)이 반영되었다.
- [ ] `cd frontend && npm run lint && npm run build` 통과.

## 테스트 요구사항
- 단위 테스트: 레이아웃 컴포넌트라 자동 단위 테스트 필수 아님. 수동 검증 시나리오를 핸드오프에 기록: (1) 375/390/430px 폭에서 현황+채팅 확인, (2) 데스크톱 1280px+에서 기존 레이아웃 회귀 없음, (3) PAUSED/ASSIGNING 상태 모바일 표시, (4) 채팅 스크롤·입력창 고정 동작.
