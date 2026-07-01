# Plan Review — 레이아웃·네비게이션 통일 및 회원관리 모달 구조 개선

## VERDICT: PASS

리뷰어 에이전트를 디스패치했으나 본 환경에서 비동기 에이전트 메시지 회수가 불가하여, 오케스트레이터가 실제 코드 대조로 plan-review 게이트를 직접 판정한다. 아래 항목은 모두 실제 파일을 읽어 교차 검증했다.

## 검증된 사실 (실제 코드 대조)
- Shadcn UI 실제 경로 = `frontend/src/common/components/ui/*` (요구사항의 `components/ui`는 근사치). 계획은 이 경로를 정확히 참조하고 수정 대상에서 제외 → OK.
- `useConfirm()` / `ConfirmProvider`: `common/components/confirm-dialog.tsx`에 존재, `variant:'destructive'` 지원, `app/layout.tsx` 39행에 마운트 확인 → task-002 삭제 확인 다이얼로그 근거 유효.
- `User.nickname: string | null` 엔티티 24행 존재. `PATCH /admin/members/:id` 응답에 nickname 포함 → task-002 프리필 근거 유효.
- 백엔드 계약 (admin-users.controller.ts 191-201행): `PATCH /admin/members/:id` = `UpdateMemberDto{ username?, nickname?, role?(UserRole), password?(min4) }`, password는 truthy일 때만 반영. `POST :id/adjust` = `{delta:int(0불가), memo?}`. `DELETE :id` 자기자신 차단. → 계획 반영 정확, 백엔드 재작업 없음.
- UserRole = USER|CAPTAIN|ADMIN (user.entity.ts 5-9행). 계획의 "UI Select는 USER/ADMIN 유지, update role 타입만 UserRole" 판단 정합.

## 파일 충돌 검사 (병렬 안전성)
- task-001 파일셋: `app/page.tsx`, `common/layouts/header.tsx`, `modules/admin/components/admin-sidebar.tsx`
- task-002 파일셋: `app/admin/members/page.tsx`, `modules/admin/api/members.ts`, `modules/admin/schemas/member-form.schema.ts`(신규), `modules/admin/components/member-form-dialog.tsx`(신규 가능)
- 교집합: 없음 → 메인 워킹트리 병렬 실행 안전. PASS.

## 요구사항 성공기준 커버리지 (9개)
1. 관리자 로그인 시 /admin 자동이동 없이 유저 화면 랜딩 → task-001 (page.tsx 분기 제거, /utility 랜딩) — 커버
2. 일반유저 헤더 "운영" 미노출 → task-001 (navItems에서 /admin 제거) — 커버
3. 관리자만 [어드민 페이지로 이동], 클릭 시 /admin → task-001 (isAdmin 조건 버튼) — 커버
4. 어드민 사이드바 [유저 화면으로 돌아가기] → / → task-001 — 커버
5. 어드민 사이드바 실시간 경매(/auction) 링크, 경매이력과 구분 → task-001 — 커버
6. 회원관리 신규추가·수정 동일 모달 구조 → task-002 — 커버
7. 수정 시 아이디·닉네임·권한·비밀번호·잔액조정 한 화면 → task-002 — 커버
8. npm run build 성공 (TS 에러 없음) → task-001/002 검증 방법 명시 — 커버
9. npm run lint 통과 → task-001/002 검증 방법 명시 — 커버

## 리스크 및 완화
- 랜딩 목적지 해석(/ vs /utility): `/`는 redirect 전용 스피너(콘텐츠 없음)이므로 `router.replace("/utility")`로 통일. `/`로 진입해도 즉시 `/utility` 재이동하여 성공기준1·성공기준4 모두 만족. 수용.
- CAPTAIN 편집 시 USER로 프리필 축약: 기존 동작 보존, 스코프 외로 명시. 수용.
- 비밀번호 모드 분기: `makeMemberFormSchema(isEdit)` 팩토리로 단일 소스. 수용.
- 보호 파일 무수정: 계획상 `common/components/ui/*`, `lib/utils.ts` 미포함 확인. OK.

## 결론
P0 전부 커버, 태스크 분할·의존성·병렬 그룹 적절, 백엔드 계약 정확, 보호 파일 안전. **PASS → Phase 4(구현) 진행.**
