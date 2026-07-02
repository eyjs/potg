# Task 002: bid-timer 확장 — variant / showNumber / soundEnabled

## 메타데이터
- 복잡도: M
- 병렬그룹: A (선행 없음)
- 우선순위: P0
- 의존: 없음

## 담당 파일
- **수정**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/bid-timer.tsx`

## 배타 소유 파일
- `components/parts/bid-timer.tsx` (수정) — 타이머 시각 로직의 **단일 소유자 유지**

## import만 하는 파일 (편집 금지)
- `hooks/auction-audio-engine.ts` — `startFuseCrackle`, `stopFuseCrackle` (기존)
- `lib/utils` — `cn`

## 목표
`bid-timer.tsx`(218줄)를 **재작성 없이 확장**한다. 스테이지 전폭 바 변형(`variant='bar'`), 숫자 숨김(`showNumber`), 크래클 사운드 소유 제어(`soundEnabled`) prop을 추가하되, **모든 신규 prop 기본값 = 기존 데스크톱/헤더 동작 100% 동일**. 스테이지용 무음 바 변형을 task-005가 소비한다(P0-③/④, AD-3). **별도 모바일 전용 타이머 컴포넌트 신규 작성 금지.**

## 구현 상세

### 1) Props 확장 (기존 `remainingTime`/`totalTime`/`phase`/`size` 유지)
- `variant?: 'default' | 'bar'` — 기본 `'default'`(현재 마크업 그대로).
- `showNumber?: boolean` — 기본 `true`(현재 숫자+sec 표시 그대로).
- `soundEnabled?: boolean` — 기본 `true`(현재 크래클 소유 그대로).

### 2) `soundEnabled` — 크래클 사운드 단일 소유 규칙 (P0-⑥, AD-3)
- 현재 `isUrgent` 진입/이탈 크래클 effect(86-102행)를 **`soundEnabled`가 `true`일 때만** `startFuseCrackle/stopFuseCrackle` 호출하도록 감싼다. `false`면 사운드 완전 무음(비주얼만).
- **헤더 상태카드 타이머(기본 `soundEnabled` 미지정=true)가 크래클 단독 소유자.** 헤더 타이머는 탭 콘텐츠 밖(위)·항상 마운트 → 탭 전환/현황 탭에서도 크래클 발화.
- task-005의 스테이지 바 타이머는 `soundEnabled={false}` 전달 → 이중 크래클 방지.
- 언마운트 시 잔류 정지 로직(96-101행)도 `soundEnabled` 게이트 하에 유지(무음 인스턴스는 애초에 시작 안 했으므로 정지 호출 없음).

### 3) `variant='bar'` — 스테이지 전폭 게이지 바
- 기존 게이지(160-215행: 트랙 `bg-muted/40` + 연소 텍스처 `timer-ember` + 진행 바 `width:fraction*100%`·`barColor` + 불꽃 `timer-flame`/스파크 `timer-spark`)의 **시각 로직·클래스를 그대로 재사용**하되, 컨테이너를 전폭(`w-full`)·조금 더 두껍게(예: `h-2`~`h-2.5`) 배치.
- `showNumber={false}`이면 상단 숫자 블록(104-158행 상당) 생략, 바만 렌더. `aria-live`/`role=timer`/`srLabel`(접근성)은 **유지**(스크린리더 안내 보존) — 숫자 시각만 숨기고 `sr-only`로 라벨 노출 권장.
- `isUrgent`(≤5초)·`isEnded`·`hue`·스파크 개수(데스크톱 3/모바일 2) 판정 로직은 **변경 없이 공유**.
- `variant='default'` 경로는 현재 코드 그대로(분기 추가만).

## 완료 기준 체크리스트 + 검증
- [ ] 신규 prop 3종 추가, **기본값에서 렌더/사운드 = 기존과 동일**(데스크톱/헤더 회귀 0)
- [ ] `variant='bar'` + `showNumber={false}` + `soundEnabled={false}` 조합에서 전폭 무음 바 렌더(불꽃/스파크/연소 텍스처 비주얼 유지, 크래클 무음)
- [ ] `soundEnabled={false}` 인스턴스가 `startFuseCrackle`/`stopFuseCrackle`를 **호출하지 않음**
- [ ] `aria-live`/`role=timer`/`isUrgent`/`isEnded` 접근성·판정 무회귀
- [ ] `reduced-motion`은 기존 globals.css `@media` 처리 그대로(신규 CSS 없음)
- [ ] `any` 미사용, `cd frontend && npm run lint && npm run build` 통과

## 제약 재확인
- **데스크톱/헤더 무변경**: 신규 prop 기본값 = 기존 동작 100% 동일.
- 타이머 시각 로직 **단일 소유자 유지**(모바일 전용 타이머 신규 작성 금지).
- `globals.css`/`auction-audio-engine.ts`/`ui/*`/`lib/utils.ts` 편집 금지(재사용·import만).
- `any` 금지 · Tailwind만 · 디자인 토큰 유지 · 신규 npm 금지 · `mobile-team-strip.tsx` 생성 금지.
