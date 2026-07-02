# Task 003: mobile-team-strip (팀 현황 가로 스트립)

## 메타데이터
- 복잡도: M
- 병렬그룹: A
- 의존: 없음
- 우선순위: P0-5 (+ P1-7 바텀시트 선택, P1-8 flight-in 타겟 반쪽 선택)

## 배타 소유 파일 (병렬 충돌 방지 — 이 태스크만 편집)
- 신규: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/mobile-team-strip.tsx`
- (P1-7 채택 시) 바텀시트는 **이 파일 내부에 자기완결**로 포함(신규 별도 파일 지양). 착수 전 `components/parts/team-detail-dialog.tsx` 재사용 가능 여부 먼저 검토.

### import만 하는(수정 아님) 파일
- `components/parts/team-sidebar.tsx` — `diffNewMemberIds`(이미 export) import (P1-8 채택 시, 무변경)
- `hooks/use-heroes.ts` — `useHeroes`(portraitByKey) import
- `../types` — `RoomStateTeam`/`maxPlayersPerTeam`/`RosterMode` import

## 목적
데스크톱 `TeamSidebar`(세로 카드 스택)를 대체하는 **가로 스크롤 팀 칩 스트립**을 신규 작성. 스테이지 바로 아래 `shrink-0` 존에 배치되어, 각 팀의 잔여 포인트·인원을 상시 노출하고 입찰 선두 팀을 강조한다.

## 구현 상세 (P0-5)

### 1. 컴포넌트 시그니처
```ts
export function MobileTeamStrip(props: {
  teams: RoomStateTeam[]
  startingPoints?: number
  rosterMode?: RosterMode          // 기본 'CAPTAIN'
  highlightCaptainId?: string | null   // 입찰 선두 강조 (roomState.currentBid?.bidderId)
  myCaptainId?: string | null      // 팀장 뷰에서 본인 팀 강조(선택)
}): JSX.Element
```

### 2. 레이아웃
- 루트: `flex gap-2 overflow-x-auto` (가로 스와이프). 스크롤바 최소화·`shrink-0` 칩.
- 팀 칩(팀당): 팀명(`teamName ?? '{captainName} 팀'`), 잔여 포인트 `points.toLocaleString()P`, 인원 `n/5`(`TeamSidebar`와 동일 계산: COACH=members.length, 그 외 members.length+1). 좁은 폭이므로 크라운 아이콘 + 팀명 + 포인트 + 인원 뱃지 컴팩트 구성.
- 입찰 선두 강조: `highlightCaptainId === team.captainId` → `game-panel-gold` 계열 골드 글로우(사이드바 `isLeading`과 동일 기준·토큰). 본인 팀(`myCaptainId`)은 부가 강조(선택).
- 잔여 포인트 미니 게이지(선택): `startingPoints` 있으면 `points/startingPoints` 비율 바(`TeamSidebar` progress 토큰 재사용).
- 팀 0개면 "팀 미구성" 폴백(사이드바와 동일 문구 스타일).

### 3. reduced-motion
- 포인트 변경 팝(`bid-pop`)·강조 트랜지션은 `useReducedMotion()` 시 정지/정적. 신규 CSS 키프레임 없이 기존 클래스/토큰만.

## P1-7 (선택) — 팀 로스터 바텀시트
- 칩 탭 시 해당 팀의 영입 멤버 목록(아바타+이름+가격/유찰) 바텀시트. **먼저 `team-detail-dialog.tsx`(Dialog 기반) 재사용 가능한지 확인** → 가능하면 그대로 열고(신규 마크업 최소), 불가하면 `mobile-team-strip.tsx` 내부에 framer-motion 하단 슬라이드 오버레이(신규 npm 금지 → 기존 Dialog primitive 또는 motion `y` 슬라이드)로 자기완결 구현.
- 폴백: 시간 초과 시 칩을 비인터랙티브(정적)로 두어도 회귀 아님.

## P1-8 (선택) — flight-in 타겟 반쪽 (AD-6 문자열 규약)
- `diffNewMemberIds`로 신규 멤버 판정 후 해당 멤버 칩(또는 칩 내부 아바타)에 `layoutId={`flight-card-${member.id}`}` + `layout` 부여(`TeamSidebar` 189-213행 패턴 축소판). `useReducedMotion()` 시 진입 애니메이션 생략.
- **코드 import로 소스와 결합하지 않음** — 문자열 규약만. 뷰(task-006/007)가 모바일 블록을 `LayoutGroup`으로 감싸야 실제 발화(키스톤). 미충족 시 정적 갱신 폴백.

## 성공 기준
- [ ] `MobileTeamStrip` 신규 생성, `overflow-x-auto` 가로 스크롤로 전체 팀 확인 가능
- [ ] 각 칩에 잔여 포인트·인원(`n/5`) 표시, 입찰 선두 칩 골드 강조(사이드바 동일 기준)
- [ ] 오버워치 토큰만 사용(하드코딩 색/간격 없음), reduced-motion 정적 대체
- [ ] (P1-7 채택 시) 칩 탭 → 로스터 바텀시트, 미채택 시 정적 폴백
- [ ] (P1-8 채택 시) 신규 멤버 칩에 `flight-card-${id}` 타겟 부여

## 검증 방법
- `cd frontend && npm run lint && npm run build` 통과
- 375~430px에서 팀 3~4개 가로 스와이프 확인, 선두 강조 전환 확인
- 단위 테스트: 신규 순수 로직(예: 인원 계산 헬퍼를 분리했다면) 대상. `diffNewMemberIds`는 기존 테스트 존재(재사용).

## 제약 재확인
- 데스크톱 무변경(이 신규 컴포넌트는 모바일 블록에서만 마운트됨), `any` 금지, Tailwind만·신규 CSS 파일 금지, `cn()` 사용, 오버워치 토큰 유지, reduced-motion 대응, `team-sidebar.tsx`/`components/ui/*`/`lib/utils.ts` 수정 금지(import만), 신규 npm 금지, 백엔드 무변경(`roomState.teams`만).
</content>
