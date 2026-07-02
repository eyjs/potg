# Task 002: bid-timer variant/showNumber/soundEnabled 확장

## 메타데이터
- 복잡도: M
- 병렬그룹: A
- 의존: 없음
- 우선순위: P0 (AD-3)

## 배타 소유 파일 (병렬 충돌 방지 — 이 태스크만 편집)
- 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/bid-timer.tsx`

### import만 하는(수정 아님) 파일
- `hooks/auction-audio-engine.ts` — `startFuseCrackle`/`stopFuseCrackle` (기존 import 유지, 무변경)

## 목적
스테이지 HUD가 사용할 **전폭 게이지 바 변형**과 **사운드 소유 분리**를 위해 `bid-timer.tsx`에 prop을 확장한다. `bid-timer.tsx`는 타이머 시각 로직의 **단일 소유자**로 유지되며 신규 모바일 전용 타이머 컴포넌트는 만들지 않는다. **기존 데스크톱 동작(`size='lg'` 기본)은 100% 불변.**

## 구현 상세 (P0-3, AD-3)

### 1. `variant` prop 추가
- `variant?: 'default' | 'bar'` (기본 `'default'` = 현재 레이아웃 그대로).
- `variant='bar'`: 좌측 시계 아이콘+큰 숫자 박스(현 111-158행)를 생략하고 **전폭 게이지 바**(현 160-215행 게이지)만 렌더. `inline-flex flex-col min-w-*` 대신 `w-full` 컨테이너. 스테이지에선 현재가 숫자가 HUD 주인공이므로 타이머 숫자는 바 형태로만 노출.

### 2. `showNumber` prop 추가
- `showNumber?: boolean` (기본 `true`). `false`면 숫자/`sec`/시계 블록 숨김, 게이지·불꽃·스파크·연소 텍스처는 유지. `variant='bar'`와 조합 가능(구현자가 둘 중 최소 침습 경로 택1 가능하나 **둘 다 기본값은 기존 동작**이어야 함).

### 3. `soundEnabled` prop 추가 (desync 방지 — 핵심)
- `soundEnabled?: boolean` (기본 `true` = 현재 동작). `false`면 `startFuseCrackle`/`stopFuseCrackle` 호출을 **전부 스킵**(useEffect 내부 가드). 스테이지 타이머는 `soundEnabled={false}`로 소비되고, 크래클 사운드는 항상 마운트되는 헤더 타이머(기본 `true`)가 단독 소유한다.

### 4. 보존 필수 (무회귀)
- `isUrgent`(`value<=5 && value>0`)·`isEnded`·`role=timer`·`aria-live`·`aria-label`(`srLabel`)·hue 그라데이션·`sparkCount`(데스크톱3/모바일2)·연소 텍스처 모바일 opacity 축소(0.65)·`prefers-reduced-motion`(globals.css의 timer 키프레임 정지 항목은 무변경) 전부 그대로.

## 성공 기준
- [ ] `variant`/`showNumber`/`soundEnabled` 3개 prop 추가, **모두 기본값이 기존 데스크톱 동작과 동일**
- [ ] `variant='bar'`가 전폭 게이지 바를 렌더(스테이지 조립 시 task-005가 소비)
- [ ] `soundEnabled={false}` 시 크래클 사운드 미발화, `isUrgent` 시각 연출은 유지
- [ ] 기존 `<BidTimer remainingTime totalTime phase />`(prop 미지정) 호출부(헤더/데스크톱 그리드) 렌더 무변경

## 검증 방법
- `cd frontend && npm run lint && npm run build` 통과
- 데스크톱 헤더 타이머가 리팩터 전과 동일(숫자+게이지, 5초 이하 불꽃/크래클) 육안 확인
- `variant='bar' showNumber={false} soundEnabled={false}` 조합 렌더 시 게이지만·무음 확인

## 제약 재확인
- 데스크톱 무변경(기본값 동일), `any` 금지, Tailwind만·신규 CSS 파일 금지, `cn()` 사용, 오버워치 토큰 유지, reduced-motion 대응 유지, `auction-audio-engine.ts`/`components/ui/*` 수정 금지(import만), 백엔드 무변경.
</content>
