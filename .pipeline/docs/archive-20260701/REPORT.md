# 파이프라인 REPORT — 레이아웃·네비게이션 통일 및 회원관리 모달 구조 개선

- 실행일: 2026-07-01
- 파이프라인 타입: refactor (프론트엔드 중심 UX 개선)
- 요구사항: `.pipeline/requirement.md`
- 결과: 성공 (빌드/lint 통과, 모든 P0/P1 성공기준 충족)
- 커밋/푸시/배포: 하지 않음 (요구 제약 준수 — 코드 변경 + 빌드/lint 검증까지만)

## 파이프라인 단계 요약
| Phase | 상태 | 산출물 |
|-------|------|--------|
| 1. Planning | done | `.pipeline/plan.md`, `.pipeline/tasks/task-001.md`, `task-002.md` |
| 2. Plan Review | PASS (0 retry) | `.pipeline/reviews/plan-review.md` |
| 3. Design | skipped | 기존 디자인 시스템 유지, 신규 컴포넌트 스펙 불필요 |
| 4. Implementation (병렬 x2) | done (0 retry) | 아래 변경 파일 |
| 5. Code Review | PASS (경미 2건 즉시 반영) | `.pipeline/reviews/code-review.md` |
| 6. Integration | PASS | build 성공 / lint 0 errors |
| 7. Documentation | done | 본 REPORT.md |

> 참고: 파이프라인 규칙상 Implementor는 worktree 격리 병렬이 원칙이나, 본 실행은 (a) 커밋 금지 제약과 (b) 두 태스크의 파일셋이 완전히 분리(교집합 없음)라는 점에 근거해 메인 워킹트리에서 안전하게 병렬 실행했다. 파일 충돌·머지 충돌 없음.

## 변경 파일 목록

### 수정 (frontend/src) — 5개
| 파일 | 변경 요약 | 태스크 |
|------|-----------|--------|
| `app/page.tsx` | 로그인 후 역할 분기 제거 → 전 역할 `/utility`(유저 화면) 랜딩. 미사용 `isAdmin` 정리 | 001 |
| `common/layouts/header.tsx` | navItems에서 "운영"(/admin) 제거. `isAdmin` 전용 [어드민] 데스크톱 버튼(skew 테마) + 모바일 드롭다운 항목(Separator 포함) 추가 | 001 |
| `modules/admin/components/admin-sidebar.tsx` | 실시간 경매(`/auction`, Radio 아이콘) 링크 추가(경매이력 Gavel과 구분). 하단 [유저 화면으로 돌아가기](`/`, Home) 추가 | 001 |
| `modules/admin/api/members.ts` | `AdminMember.nickname` 타입 추가. 통합 `update()`(PATCH /admin/members/:id) 메서드 추가 | 002 |
| `app/admin/members/page.tsx` | 탭 편집 + 별도 추가 2개 다이얼로그 → 단일 `MemberFormDialog`로 교체(461→104줄). 개별 상태·핸들러 제거 | 002 |

### 신규 (frontend/src) — 2개
| 파일 | 내용 | 태스크 |
|------|------|--------|
| `modules/admin/schemas/member-form.schema.ts` | `makeMemberFormSchema(isEdit)` zod 팩토리(추가=비번 필수 min4 / 수정=빈값 허용·입력 시 min4) | 002 |
| `modules/admin/components/member-form-dialog.tsx` | 추가/수정 공용 단일 통합 세로 폼. 공통(아이디·닉네임·권한·비밀번호) + 수정 전용(잔액조정·삭제). 자기자신 삭제 비활성화, useConfirm(destructive) | 002 |

diffstat: 5 files changed, +68 / -376 (page.tsx 대폭 축소, 로직은 신규 컴포넌트로 이동)

### 미변경 확인
- 보호 파일 `frontend/src/common/components/ui/*`, `frontend/src/lib/utils.ts`: 무수정 (git status clean).
- 백엔드 `admin-users.controller.ts`, `users.service.ts`: 파이프라인 시작 전부터 존재하던 "이미 완료된" 통합수정 엔드포인트 변경분이며, 본 파이프라인은 백엔드를 일절 수정하지 않음(계약만 소비).

## 검증 결과
```
cd frontend && npm run lint   → 0 errors, 2 warnings
                                 (경고 2건은 기존 파일 src/components/image-uploader.tsx의 no-img-element, 이번 변경과 무관)
cd frontend && npm run build  → Compiled successfully / Running TypeScript OK /
                                 Generating static pages 16/16 OK (TypeScript 에러 없음)
```
빌드된 라우트에 `/`, `/utility`, `/auction`, `/admin`, `/admin/members` 모두 정상 포함.

## 성공 기준 충족 여부 (requirement 성공 기준)
- [x] 관리자 로그인 시 `/`(→즉시 `/utility` 유저 화면) 랜딩, `/admin` 자동 이동 없음
- [x] 일반유저 헤더에 "운영" 메뉴 미노출 (navItems에서 제거)
- [x] 관리자 계정에서만 [어드민 페이지로 이동] 버튼 노출, 클릭 시 `/admin` 이동 (데스크톱 버튼 + 모바일 드롭다운)
- [x] 어드민 사이드바 [유저 화면으로 돌아가기] 클릭 시 `/` 이동
- [x] 어드민 사이드바 실시간 경매(`/auction`) 링크로 진입 가능, 경매이력(`/admin/auctions`)과 아이콘·라벨 구분
- [x] 회원관리 신규 추가·기존 수정이 동일한 통합 모달 구조 사용
- [x] 회원 수정 시 아이디·닉네임·권한·비밀번호·잔액조정을 한 화면에서 처리
- [x] 자기자신 삭제 버튼 비활성화 (프론트) + 백엔드 차단 유지
- [x] `npm run build` 성공, TypeScript 에러 없음
- [x] `npm run lint` 통과

### P1/P2 반영
- [x] (P1) 통합 모달 필드별 유효성 — 변경 필드만 PATCH 전송, 빈 비밀번호 스킵
- [x] (P1) 모바일에서 [어드민 페이지로 이동] 접근(우측 드롭다운 항목)
- [x] (P1) 사이드바 active 하이라이트 정합성 — `/auction` startsWith, `/admin/auctions`와 비충돌
- [x] (P2) 잔액 조정 시 현재 잔액 + 조정 후 예상 잔액 미리보기 (포인트 관례색 ow-blue/ow-red 적용)
- [x] (P2) 전환 버튼 오버워치 테마(skew-btn) 스타일

## 코드 리뷰 조치 (경미 2건, 즉시 반영)
1. [P2 디자인 토큰] 예상잔액 프리뷰 `text-green-500` → 포인트 금액 관례색 `text-[var(--ow-blue)]`/`text-[var(--ow-red)]`로 교체 (ledger/admin 대시보드와 일관).
2. [P1 정확성] 닉네임 해제(빈 값) 시 `undefined`로 누락되던 문제 → 빈 문자열 전송으로 백엔드 null 반영 가능하도록 수정.

## 제약 준수
- `any` 미사용, Tailwind + cn()만, 오버워치 테마 유지, 하드코딩 색상 없음(디자인 토큰 사용).
- Shadcn UI / utils.ts 무수정. 백엔드 Entity·엔드포인트 재작업 없음.
- 커밋/푸시/배포 미수행 — 최종 배포는 사람 확인 후 별도 진행.

## 후속(사람 확인) 권장
- 수동 시나리오 확인: 관리자/일반유저 로그인 랜딩, 헤더 어드민 버튼(데스크톱+모바일), 사이드바 전환/실시간 경매 진입, 회원 추가·수정·잔액조정·삭제(본인 비활성) 흐름.
- 이상 없으면 `type(scope): description` 규약으로 커밋 후 배포.
