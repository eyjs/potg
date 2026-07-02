# Task 002: 낙찰 팀보드 flight-in (사이드바 + 뷰 3개 + LayoutGroup)

## 메타데이터
- 복잡도: L
- 병렬그룹: A (선행 없음, 즉시 실행)
- 의존: 없음 (task-003과 layoutId **문자열 규약**으로만 결합, 코드 import 없음)
- 변경 파일 (충돌 방지용):
  - 수정(배타 소유): `frontend/src/modules/auction/components/parts/team-sidebar.tsx`
  - 수정(배타 소유): `frontend/src/modules/auction/components/auction-ongoing-captain.tsx`
  - 수정(배타 소유): `frontend/src/modules/auction/components/auction-ongoing-master.tsx`
  - 수정(배타 소유): `frontend/src/modules/auction/components/auction-ongoing-spectator.tsx`
  - 읽기전용: `frontend/src/modules/auction/components/parts/current-player-card.tsx` (task-003 소유 — **수정 금지**, layoutId 규약만 맞춘다)

## 목적
낙찰(사용자 명시 P0, **생략/하향 금지**) 시 매물 카드가 낙찰 팀의 `TeamSidebar` 슬롯으로 날아가 앉는 **flight-in**의 "받는 쪽"과 무대 배선을 구현한다: (1) 3개 뷰에서 `CurrentPlayerCard`+`TeamSidebar`를 `LayoutGroup`으로 감싸 공유 레이아웃 컨텍스트 형성 (2) 사이드바 신규 영입 멤버 슬롯에 진입 애니메이션 + flight 타겟 `layoutId` 부여.

## 배경 / 현재 구조 (검증 완료)
- 3개 뷰 모두 `<div className="grid grid-cols-12 gap-4">` 안에 좌측 `<aside>`(`TeamSidebar`) + 중앙 `<section>`(`CurrentPlayerCard`)를 형제로 렌더:
  - captain: 그리드 170행, TeamSidebar 173행, CurrentPlayerCard 184행.
  - master: 그리드 222행, TeamSidebar 225행, CurrentPlayerCard 236행.
  - spectator: 데스크톱 그리드 73행(TeamSidebar 75행, CurrentPlayerCard 91행). **모바일 블록(125-155행)에는 사이드바 없음** → flight-in 자동 미노출(요구사항 부합).
- `team-sidebar.tsx` 멤버 렌더: `team.members.map`(140-167행). member.id는 참가자 id.
- **flight 규약(task-003과 공유)**: 낙찰 카드 소스 layoutId = `flight-card-${player.id}`, 사이드바 신규 멤버 타겟 layoutId = `flight-card-${member.id}` (sold player.id == member.id 이므로 일치).

## 구현 방식

### 1. 뷰 3개 — LayoutGroup 래핑 (최소 침습)
- `framer-motion`에서 `LayoutGroup` import.
- 각 뷰에서 `TeamSidebar`와 `CurrentPlayerCard`를 **동시에 포함하는 최소 상위 요소**(그리드 `<div>`)를 `<LayoutGroup>...</LayoutGroup>`로 감싼다.
  - captain: 170행 그리드, master: 222행 그리드, spectator: 73행 데스크톱 그리드.
  - spectator 모바일 블록은 사이드바가 없으므로 감쌀 필요 없음(감싸도 무해하나 데스크톱 그리드만 감싸는 것으로 충분).
- 기존 grid 클래스/레이아웃/props는 **변경 금지**(래핑만 추가).

### 2. `team-sidebar.tsx` — 신규 멤버 진입 + flight 타겟
- 각 멤버 아바타 div(141행 `team.members.map`)를 `motion.div`로 승격.
- **신규 멤버 감지**: 직전 렌더의 멤버 id 집합을 `useRef`로 보관 → 이번 렌더에 새로 나타난 member.id에만 진입 애니메이션 적용(전체 목록이 매번 애니메이션되지 않도록).
- 신규 멤버 slot:
  - `layoutId={`flight-card-${m.id}`}` 부여(카드 소스와 공유 → flight morph 성립).
  - 진입 연출: pop/flip-in(`initial`/`animate`, spring). 기존 아바타 스타일(테두리/이름 라벨)은 유지.
- reduced-motion: `useReducedMotion()`이 true면 진입/layout 애니메이션 생략, 멤버 즉시 표시(정적).
- 기존 props(`teams, myCaptainId, startingPoints, rosterMode, onTeamClick, highlightCaptainId`)·정원 표시·에너지 게이지·낙찰가 요약은 **회귀 없이 유지**.

## 성공 기준
- [ ] 데스크톱 3개 뷰(captain/master/spectator)에서 `CurrentPlayerCard`와 `TeamSidebar`가 동일 `LayoutGroup` 컨텍스트에 있다(flight 성립 조건 충족).
- [ ] 낙찰 시 해당 팀 사이드바에 신규 멤버 슬롯이 진입 애니메이션과 함께 나타난다(기존 멤버는 재애니메이션되지 않음).
- [ ] 신규 멤버 슬롯의 `layoutId`가 `flight-card-${member.id}` 규약과 정확히 일치.
- [ ] 모바일(<lg) 관전자 뷰에서 사이드바(및 flight-in)가 노출되지 않는다.
- [ ] `prefers-reduced-motion`에서 진입/flight 애니메이션이 생략되고 멤버가 즉시 표시된다.
- [ ] 기존 사이드바 기능(정원 n/5, 포인트, 에너지 게이지, 강조 글로우) 무회귀. 3개 뷰 무회귀.
- [ ] `current-player-card.tsx` 수정 0줄. `any` 미사용. `cd frontend && npm run lint && npm run build` 통과.

## 테스트 요구사항
- 단위 테스트: 신규 멤버 감지 로직(이전 id 집합 대비 diff)이 순수 함수로 분리 가능하면 경계 테스트(추가/무변경/여러 명 동시 추가).
- 수동 검증: 낙찰 반복 시 신규 멤버만 진입, 3개 뷰 각각 확인, reduced-motion 정적, 모바일 사이드바 미노출.
- **주의**: 완전한 flight morph(카드→슬롯 이동)는 task-003(소스) 머지 후 통합 단계에서 검증. 본 태스크 단독으로는 "타겟 슬롯 진입 애니메이션 + LayoutGroup 준비"까지가 완료 범위(소스 부재 시 카드 없이 슬롯만 진입 = graceful).

## 제약사항
- `current-player-card.tsx`는 task-003 소유 → 본 태스크에서 수정 금지(규약만 준수).
- 신규 npm 패키지 금지(framer-motion 재사용). `any` 금지.
- 뷰 파일은 LayoutGroup 래핑 외 로직/레이아웃 변경 금지. 오버워치 테마/토큰 유지.
- flight-in은 사용자 명시 P0 → 생략/하향 금지.
</content>
