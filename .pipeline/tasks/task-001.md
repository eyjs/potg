# Task 001: 레이아웃/네비게이션 통일 (랜딩 + 헤더 + 어드민 사이드바)

## 메타데이터
- 복잡도: M
- 병렬그룹: A
- 의존: 없음 (즉시 실행 가능, task-002와 병렬)
- 변경 파일 (충돌 방지용):
  - 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/app/page.tsx`
  - 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/common/layouts/header.tsx`
  - 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/admin/components/admin-sidebar.tsx`
- 예상 파일 충돌: 없음 (task-002와 파일셋 분리)

## 목적
관리자·일반유저가 로그인 후 동일한 유저 화면으로 랜딩하도록 분기를 제거하고, 유저 헤더에서 권한 없는 사용자에게 노출되던 "운영" 메뉴를 제거해 `isAdmin` 조건부 [어드민 페이지로 이동] 버튼으로 대체하며, 어드민 사이드바에 [유저 화면으로 돌아가기] 및 실시간 경매(`/auction`) 진입 링크를 추가해 두 레이아웃 영역 간 전환 동선을 명확히 한다.

## 백엔드 계약 참조
- 해당 없음 (순수 프론트 라우팅/네비 변경). `useAuth()` → `{ user, isAdmin, logout }`, `user.role`만 사용.

## 구현 가이드

### 1) `app/page.tsx` — 랜딩 통일 (P0)
- 현재 line 17: `router.replace(isAdmin ? "/admin" : "/utility")`
- 변경: `router.replace("/utility")` (역할 분기 제거, 전 역할 유저 화면 랜딩)
- `isAdmin`이 더 이상 사용되지 않으면 line 9 구조분해(`const { user, isLoading, isAdmin } = useAuth()`)와 useEffect 의존성 배열(line 18)에서 `isAdmin` 제거하여 lint 미사용 경고 방지.
- 근거: `/`는 redirect 전용 페이지로 대시보드 콘텐츠가 없고, 실질 유저 홈은 `/utility`. (plan.md 아키텍처 결정 참조)

### 2) `common/layouts/header.tsx` — "운영" 제거 + 어드민 이동 버튼 (P0/P1)
- **navItems에서 운영 제거**: line 18 `{ href: "/admin", label: "운영", icon: Shield }` 항목 삭제. (나머지 대시보드/경매/유틸리티 항목 유지)
- **데스크톱 [어드민 페이지로 이동] 버튼**: `user && isAdmin`일 때만 노출. 우측 영역(line 58 `<div className="flex items-center gap-2">`) 안, 기존 ADMIN 배지(line 60-63) 근처에 `hidden sm:flex`로 배치. `Link href="/admin"` + `Button`(오버워치 테마: `skew-btn`, 기존 nav 버튼 클래스 계열, `cn()` 사용). 라벨 예: "어드민". 아이콘 `Shield` 재사용 가능.
- **모바일 드롭다운 항목(P1)**: 데스크톱 nav가 `hidden md:flex`라 모바일 미노출 → 우측 `DropdownMenu`(line 67-82)에 `isAdmin` 조건부 `DropdownMenuItem`("어드민 페이지로 이동", `onClick`으로 `router.push('/admin')` 또는 `Link` asChild) 추가하고, 로그아웃 위에 `DropdownMenuSeparator` 삽입.
  - `DropdownMenuSeparator`는 `@/common/components/ui/dropdown-menu`에서 import (export 확인됨).
  - 네비게이션은 `next/navigation`의 `useRouter().push` 또는 `Link`(asChild) 중 기존 패턴에 맞춰 사용. `Link`를 `DropdownMenuItem asChild`로 감싸는 방식 권장.
- **주의**: `Shield` import는 ADMIN 배지에서 계속 사용하므로 제거하지 말 것. navItems에서 운영만 빼면 됨.

### 3) `modules/admin/components/admin-sidebar.tsx` — 실시간 경매 링크 + 유저 복귀 버튼 (P0/P1)
- **실시간 경매 링크 추가**: navItems(line 26-36)에 `{ href: '/auction', label: '실시간 경매', icon: <아이콘 /> }` 추가. 기존 경매이력(`/admin/auctions`, `Gavel`)과 **아이콘·라벨로 구분**할 것 — 실시간 경매용 아이콘은 `Radio` / `Zap` / `PlayCircle` 등 lucide-react에서 하나 선택(Gavel과 시각적으로 구분). 배치는 경매이력 인접 또는 목록 상단 등 논리적 위치.
- **active 하이라이트 정합성(P1)**: 기존 `isActive`(line 42-45)는 `/admin`만 exact, 나머지는 `startsWith`. `/auction`은 `pathname.startsWith('/auction')`로 동작하며 `/admin/auctions`(경매이력)와 충돌하지 않음(후자는 `/admin`으로 시작). 별도 처리 불필요하나, 추가 후 `/auction` 진입 시 실시간 경매만 하이라이트되는지 확인.
- **[유저 화면으로 돌아가기] 버튼**: 하단 로그아웃 영역(line 79-93) 위 또는 인접에 `Link href="/"` 버튼 추가. 클릭 시 `/`로 이동(= `/utility`로 자동 랜딩). 스타일은 기존 사이드바 링크/로그아웃 버튼 클래스 계열 재사용(`cn()`), 아이콘은 `Home` 또는 `ArrowLeft` 등. (P2: skew 테마 적용 시 사이드바 톤과 일관되게)

## 성공 기준
- [ ] 관리자 로그인 시 `/admin` 자동 이동 없이 유저 화면(`/utility`)에 랜딩된다
- [ ] 일반유저 헤더에 "운영" 메뉴가 보이지 않는다
- [ ] 관리자 계정에서만 헤더에 [어드민 페이지로 이동] 버튼이 보이고, 클릭 시 `/admin`으로 이동한다
- [ ] 모바일(드롭다운)에서도 관리자에게 어드민 이동 항목이 접근 가능하다 (P1)
- [ ] 어드민 사이드바 [유저 화면으로 돌아가기] 클릭 시 `/`로 이동한다
- [ ] 어드민 사이드바 실시간 경매(`/auction`) 링크로 경매 페이지 진입 가능하고, 경매이력과 아이콘·라벨이 구분된다
- [ ] `/auction` 진입 시 사이드바 active 하이라이트가 실시간 경매 항목에만 적용된다 (P1)

## 제약
- 수정 금지: `frontend/src/common/components/ui/*` (Shadcn), `frontend/src/lib/utils.ts`
- `any` 타입 금지. Tailwind CSS + `cn()`만 사용(별도 CSS 파일 금지)
- 오버워치 테마 유지 (skew-btn, 고대비 네온) — 기존 헤더/사이드바 스타일 톤 준수
- 하드코딩 색상/폰트/간격 금지 (디자인 토큰/CSS 변수 사용)
- 스코프 외 변경 금지 (헤더/사이드바 구조 통합 X, 두 메뉴바 각각 유지)

## 검증 방법
```bash
cd /Users/eyjs/Desktop/WorkSpace/potg/potg/frontend
npm run lint
npm run build
```
- 수동: 관리자/일반유저 각각 로그인 후 랜딩 위치, 헤더 버튼 노출 여부, 사이드바 전환 버튼 동작, `/auction` 하이라이트 확인.

## 테스트 요구사항
- 단위 테스트: 프론트 라우팅/네비 UI 변경으로 기존 프로젝트에 컴포넌트 테스트 인프라 부재 시 신규 테스트 강제 아님. 검증은 lint + build + 수동 시나리오로 갈음. (테스트 러너 존재 시 header/sidebar 조건부 렌더 스냅샷/RTL 추가 권장)
