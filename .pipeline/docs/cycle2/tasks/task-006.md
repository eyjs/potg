# task-006 — 팀장(captain) 화면 모바일 대응 (feedback-002, P0)

## 출처
사용자 직접 피드백 `.pipeline/feedback-002.md` — "팀장 화면도 모바일 대응해줘". 금요일(2026-07-03, 오늘) 경매에서 팀장/감독이 폰으로 입찰 가능해야 함. **P0, 시급.**

## 배경
1차는 관전자 뷰(`auction-ongoing-spectator.tsx`)만 모바일 대응. 팀장은 `auction-ongoing-captain.tsx`(데스크톱 전용 12칼럼 그리드)를 그대로 받아 모바일에서 사용 어려움(입찰 버튼이 그리드 리플로우로 작게 표시, 엄지 접근성 나쁨).

## 대상 파일 (단독 소유)
- `frontend/src/modules/auction/components/auction-ongoing-captain.tsx`

## 파일 충돌 상태 (해소됨)
2차 flight-in(task-002)이 이 파일에 `LayoutGroup` 래핑(171-254행)을 이미 추가·머지함. 이 태스크는 **flight-in 머지 후 순차 실행**이라 충돌 없음. 데스크톱 그리드/`LayoutGroup`은 그대로 두고 반응형 분기만 추가.

## 요구 (관전자 뷰와 동일 패턴)
- `auction-ongoing-spectator.tsx`의 `hidden lg:grid` / `lg:hidden` 분기 패턴을 그대로 따른다. **데스크톱 JSX(현 그리드) 무변경** — 기존 그리드를 `hidden lg:grid`(또는 감싸는 래퍼에 `hidden lg:block`)로 데스크톱 전용화하고, 별도 모바일 블록(`lg:hidden`)을 추가.
- 모바일 세로 스택(위→아래), 100dvh 기준:
  1. 현재 매물 카드(`CurrentPlayerCard`) + 타이머(`BidTimer`)
  2. **입찰 컨트롤** (현재가 표시 + `BidButtonsRow` 재사용) — 팀장 핵심 기능. 엄지 닿는 위치에 크게, **최소 터치 타겟 44px**. sticky 하단 고정 검토(채팅 스크롤 중에도 항상 접근).
  3. 채팅(`ChatPanel`, `flex-1`로 남은 높이)
- 팀 현황(`PlayerStatusGrid`)/입찰 로그(`BidLog`) 등 부가 정보는 모바일에서 숨기거나 접기(P1 — 최소 숨김).
- 기존 상태(PAUSED/ASSIGNING 배너, teamFull/isHighestBidder 안내), `handleBid`/`bidDisabled` 로직을 모바일 블록에서도 동일하게 재사용(중복 로직 신설 금지, 기존 계산값 공유).

## 제약
- `any` 금지, 신규 npm 패키지 금지, shadcn `ui/*`·`lib/utils.ts` 수정 금지, 백엔드 무변경.
- 오버워치 테마/디자인 토큰 유지(하드코딩 색/폰트/간격 금지). 4px 배수 간격.
- 모바일 flight-in 미노출(사이드바 자체가 모바일 미표시) — 모바일 블록은 `LayoutGroup` 불필요.
- 데스크톱 팀장 화면 **회귀 없음**(JSX 무변경 래핑).
- 접근성: 입찰 버튼 최소 44px 터치 타겟, 명확한 대비.

## 완료 기준
- 모바일(375~430px)에서 팀장 접속 시 세로 레이아웃 + 입찰 버튼 정상 동작.
- 데스크톱(lg+) 회귀 없음.
- `cd frontend && npm run lint && npm run build` 통과.

## 참고
- 관전자 모바일 구현: `frontend/src/modules/auction/components/auction-ongoing-spectator.tsx`
- 관전자 모바일 스펙(1차 보존본): `.pipeline/docs/cycle1/` 또는 `.pipeline/design/screen-specs/`
