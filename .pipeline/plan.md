# 구현 계획 — 레이아웃·네비게이션 통일 및 회원관리 모달 구조 개선

## 요약
유저 헤더(`common/layouts/header.tsx`)와 어드민 사이드바(`modules/admin/components/admin-sidebar.tsx`) 간 전환 동선을 버튼으로 연결하고 권한 기반으로 메뉴를 정리하며(task-001), 회원관리의 탭 편집 + 별도 추가 2개 다이얼로그를 단일 통합 세로 폼으로 통일한다(task-002). 두 태스크는 파일셋이 겹치지 않아 완전 병렬 실행 가능하다.

## 스코프

### 포함 (이번에 만드는 것)
- 로그인 후 랜딩 통일: 관리자·일반유저 모두 유저 화면으로 랜딩 (`app/page.tsx`의 역할별 분기 제거)
- 유저 헤더에서 "운영"(`/admin`) 메뉴 제거 → `isAdmin` 조건부 [어드민 페이지로 이동] 버튼으로 대체 (데스크톱 + 모바일 드롭다운)
- 어드민 사이드바에 [유저 화면으로 돌아가기] 버튼 추가 (→ `/`)
- 어드민 사이드바에 실시간 경매(`/auction`) 링크 추가 (기존 경매이력 `/admin/auctions`과 시각 구분)
- 회원관리 추가/수정 모달을 단일 통합 폼으로 통일 (아이디·닉네임·권한·비밀번호 공통, 잔액조정·삭제는 수정 모드 전용)

### 제외 (이번에 만들지 않는 것)
- 유저 메뉴바와 어드민 메뉴바 통합 (각각 유지, 전환 버튼으로만 연결)
- 백엔드 API 추가/수정 (통합 엔드포인트 `PATCH /admin/members/:id` 이미 존재, 계약 고정)
- 신규 페이지/기능 추가, 디자인 시스템 전면 교체
- Shadcn UI (`common/components/ui/*`), `lib/utils.ts` 수정 (보호 대상)
- 이미 완료된 항목 재작업 (로그인 깜빡임, 슬라이딩 세션, KST, 대시보드 크래시, CRUD API 백엔드)

## 아키텍처 결정

- **랜딩 목적지 = `/utility`**: `app/page.tsx`(`/`)는 redirect 전용 스피너 페이지로 대시보드 콘텐츠가 없다. `app/` 라우트 조사 결과(존재 라우트: `/admin/*`, `/auction`, `/login`, `/utility`) 실질 유저 홈은 `/utility`(AuthGuard + 유틸리티 도구 그리드)뿐이며 별도 대시보드 페이지는 없다. 따라서 `router.replace(isAdmin ? "/admin" : "/utility")` → `router.replace("/utility")`로 전 역할 통일. 이로써 "관리자도 `/admin` 자동이동 없이 유저 화면으로 랜딩" 성공기준 충족. (근거: `/`에 실제 화면을 새로 만드는 것은 스코프 외 신규 페이지에 해당)
- **공유 Header의 실제 노출 범위**: `common/layouts/header.tsx`는 현재 `/auction` 페이지에서만 렌더된다(`/utility`는 자체 인라인 헤더 사용, `/`는 스피너만). 요구사항이 `header.tsx`를 직접 대상으로 지정하므로 이 컴포넌트를 수정하는 것이 정확한 스코프이며, [어드민 페이지로 이동] 버튼은 이 헤더가 쓰이는 화면에서 노출된다. (헤더를 다른 페이지에 새로 다는 것은 스코프 외)
- **모바일 접근성(P1)**: 헤더 데스크톱 nav는 `hidden md:flex`이므로, [어드민 페이지로 이동]을 데스크톱 전용 버튼 + 우측 `DropdownMenu`(모바일 진입점)에 조건부 항목으로 이중 배치. `DropdownMenuSeparator`(export 확인됨)로 로그아웃과 구분.
- **삭제 확인은 전역 `useConfirm()` 재사용**: `common/components/confirm-dialog.tsx`의 promise 기반 `useConfirm()`(ConfirmProvider 루트 마운트 완료)을 사용해 통합 폼 내 별도 중첩 Dialog 없이 삭제 확인 처리. `variant: 'destructive'` 지원.
- **통합 수정은 단일 `update()` 호출**: 개별 엔드포인트(role/username/password) 대신 `PATCH /admin/members/:id` 하나로 변경 필드만 전송. 잔액 조정은 계약상 별개 엔드포인트(`POST /admin/members/:id/adjust`)이므로 폼 내 별도 섹션·별도 요청으로 유지.
- **역할 Select는 USER/ADMIN 2개 유지**: `UserRole` enum에 CAPTAIN이 있으나 기존 UI 동작(CAPTAIN→USER로 프리필 축약)을 보존해 스코프 확대를 방지. `update`의 role 파라미터 타입만 `UserRole`(USER|CAPTAIN|ADMIN)로 백엔드 계약과 정합.

## 태스크 목록
| # | 태스크 | 복잡도 | 의존성 | 병렬그룹 | 파일 |
|---|--------|--------|--------|----------|------|
| 001 | 레이아웃/네비게이션 통일 | M | 없음 | A | task-001.md |
| 002 | 회원관리 통합 모달 | L | 없음 | A | task-002.md |

## 의존성 그래프
```
task-001 (독립)   task-002 (독립)
   |                 |
   +---- 병렬 실행 ---+
```
두 태스크는 선행 의존이 없고 변경 파일셋이 완전히 분리되어 동시 실행 가능하다.

## 병렬 실행 계획
- **그룹 A (동시 실행)**: task-001, task-002
  - task-001 파일셋: `app/page.tsx`, `common/layouts/header.tsx`, `modules/admin/components/admin-sidebar.tsx`
  - task-002 파일셋: `app/admin/members/page.tsx`, `modules/admin/api/members.ts`, `modules/admin/schemas/member-form.schema.ts`(신규)
  - 교집합 없음 → worktree 격리 병렬 안전. 머지 충돌 예상 없음.

## P0/P1/P2 매핑
| 우선순위 | 항목 | 태스크 |
|----------|------|--------|
| P0 | 통합 랜딩 (역할 무관 유저 화면) | task-001 |
| P0 | 헤더 "운영" 제거 + 어드민 이동 버튼 (isAdmin) | task-001 |
| P0 | 사이드바 유저 복귀 버튼 + 실시간 경매 링크 | task-001 |
| P0 | 회원관리 통합 모달 (추가/수정 단일 폼) | task-002 |
| P0 | 자기자신 삭제 방지 (버튼 비활성화) | task-002 |
| P1 | 통합 모달 필드별 유효성 (변경 필드만 전송, 빈 비번 스킵) | task-002 |
| P1 | 모바일 어드민 이동 버튼 접근성 (드롭다운) | task-001 |
| P1 | 사이드바 active 하이라이트 정합성 (`/auction` 포함) | task-001 |
| P2 | 잔액 조정 시 현재/예상 잔액 미리보기 | task-002 |
| P2 | 전환 버튼 오버워치 테마(skew-btn) 스타일 | task-001 |

## 리스크
- **랜딩 목적지 해석 차이**: requirement 문구는 "`/`로 랜딩"이나 `/`는 콘텐츠 없는 redirect 페이지. 실제 유저 화면인 `/utility`로 통일하는 것으로 해석(위 아키텍처 결정). → 완화: task-001 수용기준에 "관리자가 `/admin`으로 자동 이동하지 않고 유저 화면(`/utility`)에 랜딩"으로 명시. 리뷰어 확인 포인트.
- **CAPTAIN 역할 편집 엣지케이스**: Select가 USER/ADMIN만 노출하므로 CAPTAIN 회원 편집 시 USER로 프리필. → 완화: 기존 동작 보존으로 명시, 스코프 외 처리.
- **비밀번호 검증 모드 분기**: 추가 시 필수(min4), 수정 시 선택(빈 값=변경 안 함, 입력 시 min4). → 완화: zod 스키마를 모드 인자로 생성(`makeMemberFormSchema(isEdit)`)하여 단일 소스로 관리.
- **미사용 API 메서드**: 통합 폼 도입 후 `updateRole/updateUsername/updatePassword`가 페이지에서 미사용. → 완화: export는 lint 경고 대상 아님. 제거는 선택(호환성 위해 유지 권장), 페이지 import에서만 제외.
- **헤더 노출 범위 오해**: 공유 Header가 `/auction`에만 붙어 있어 버튼이 전 화면에 안 보인다고 오인 가능. → 완화: 아키텍처 결정에 노출 범위 명시, 스코프는 header.tsx 컴포넌트 수정으로 한정.

## 성공 기준 체크리스트 (requirement 매핑)
- [ ] 관리자 로그인 시 유저 화면(`/utility`)으로 랜딩, `/admin` 자동 이동 없음 (task-001)
- [ ] 일반유저 로그인 시 헤더에 "운영" 메뉴 미노출 (task-001)
- [ ] 관리자 계정에서만 [어드민 페이지로 이동] 버튼 노출, 클릭 시 `/admin` 이동 (task-001)
- [ ] 어드민 사이드바 [유저 화면으로 돌아가기] 클릭 시 `/` 이동 (task-001)
- [ ] 어드민 사이드바 실시간 경매(`/auction`) 링크로 경매 진입 가능, 경매이력과 시각 구분 (task-001)
- [ ] 회원관리 신규 추가·기존 수정이 동일 모달 구조 사용 (task-002)
- [ ] 회원 수정 시 아이디·닉네임·권한·비밀번호·잔액조정을 한 화면에서 처리 (task-002)
- [ ] 자기자신 삭제 버튼 비활성화 (task-002)
- [ ] `npm run build` 성공, TypeScript 에러 없음 (task-001, task-002)
- [ ] `npm run lint` 통과 (task-001, task-002)

## 검증 방법 (공통)
```bash
cd /Users/eyjs/Desktop/WorkSpace/potg/potg/frontend
npm run lint
npm run build
```
`any` 미사용, 하드코딩 색상/폰트/간격 없음(디자인 토큰/Tailwind + cn()), 보호 파일(`common/components/ui/*`, `lib/utils.ts`) 무수정 확인.
