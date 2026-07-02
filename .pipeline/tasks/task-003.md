# Task 003: mobile-tab-bar — 하단 탭 네비게이션 바

## 메타데이터
- 복잡도: S
- 병렬그룹: A (선행 없음)
- 우선순위: P0
- 의존: 없음

## 담당 파일
- **신규**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/mobile-tab-bar.tsx`

## 배타 소유 파일
- `components/parts/mobile-tab-bar.tsx` (신규)

## import만 하는 파일 (편집 금지)
- `lib/utils` — `cn`
- `lucide-react` — 아이콘 (예: `Gavel`/`Radio` = 경매, `Users` = 현황)

## 목표
오버워치 테마의 **하단 고정 탭바** 프레젠테이션 컴포넌트를 작성한다. **상태는 소유하지 않는다**(부모 `activeTab` state를 props로 받고 `onChange` 콜백만 호출 — AD-4). 경매/현황 2탭(P1에서 3탭 확장 대비), `role=tablist`/`role=tab`/`aria-selected`, 터치 타겟 ≥44px, skewed/네온 스타일(P0-②). task-006/007이 import해 배선한다.

## 구현 상세

### 1) Props 설계 (부모가 state 소유 — 언마운트 방지 원칙과 정합)
- 제네릭 문자열 유니온 기반 탭 배열을 받는 형태 권장(P1 3탭 확장 무리 없게):
  ```ts
  interface TabItem<T extends string> { value: T; label: string; icon: LucideIcon }
  interface Props<T extends string> {
    tabs: readonly TabItem<T>[]
    activeTab: T
    onTabChange: (value: T) => void
  }
  ```
- 내부 state 없음(순수 controlled). `any` 금지 — 제네릭/`LucideIcon` 타입 사용.

### 2) 접근성 (P0-②)
- 컨테이너: `role="tablist"`, `aria-label` 부여.
- 각 버튼: `role="tab"`, `aria-selected={activeTab === value}`, `type="button"`, 클릭 시 `onTabChange(value)`.
- 터치 타겟: 각 탭 버튼 높이 `h-14`(=3.5rem ≥44px). 탭바는 부모가 `shrink-0`으로 배치(자체 `fixed` 불필요 — 뷰 루트가 이미 고정 높이 flex).

### 3) 스타일 (오버워치 테마, 디자인 토큰만)
- 활성 탭: 네온 강조(`text-primary`/`border-primary` 등 기존 토큰), 상단 인디케이터 라인 또는 배경 글로우.
- 비활성 탭: `text-muted-foreground`, hover 시 미세 강조.
- skewed 버튼 스타일은 기존 `game-btn`/`skew-btn` 패턴 참고(하드코딩 색상/간격 금지, 토큰만).
- 아이콘 + 라벨 세로 스택(아이콘 위, 라벨 아래 소형 uppercase).
- 상단 경계선(`border-t border-border/40`) + 배경(`bg-background/95 backdrop-blur-sm` 등) — 탭 콘텐츠와 시각 분리.

### 4) reduced-motion
- 활성 전환 애니메이션(있다면)은 `prefers-reduced-motion` 시 정지/즉시 전환. framer-motion 사용 시 `useReducedMotion()`, CSS transition만이면 globals.css `@media` 처리로 충분(신규 CSS 금지).

## 완료 기준 체크리스트 + 검증
- [ ] controlled 컴포넌트(내부 activeTab state 없음), `tabs`/`activeTab`/`onTabChange` props
- [ ] `role=tablist`/`role=tab`/`aria-selected` 정확, 각 탭 높이 ≥44px(`h-14`)
- [ ] 활성/비활성 시각 구분(네온/skewed, 토큰만·하드코딩 0)
- [ ] `any` 미사용(제네릭 유니온·`LucideIcon`), `cd frontend && npm run lint && npm run build` 통과
- [ ] (단독 렌더 확인) 2탭 렌더·클릭 콜백 정상

## 제약 재확인
- **상태 소유 금지**(부모가 `activeTab` 소유 — 언마운트 방지 원칙, AD-4).
- 오버워치 테마·디자인 토큰만·터치 타겟 ≥44px·하드코딩 금지.
- `any` 금지 · Tailwind만 · 신규 CSS 파일 금지 · 신규 npm 금지.
- `ui/tabs.tsx`(Radix) 사용 금지(비활성 탭 언마운트 이슈) · `mobile-team-strip.tsx` 생성 금지.
