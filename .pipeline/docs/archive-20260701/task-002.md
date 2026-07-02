# Task 002: 회원관리 통합 모달 (단일 통합 세로 폼)

## 메타데이터
- 복잡도: L
- 병렬그룹: A
- 의존: 없음 (즉시 실행 가능, task-001과 병렬)
- 변경 파일 (충돌 방지용):
  - 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/app/admin/members/page.tsx`
  - 수정: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/admin/api/members.ts`
  - 신규: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/admin/schemas/member-form.schema.ts`
- 예상 파일 충돌: 없음 (task-001과 파일셋 분리)

## 목적
회원관리의 **탭 기반 편집 다이얼로그**(role/adjust/username/password/delete)와 **별도 추가 다이얼로그**를 하나의 **단일 통합 세로 폼**으로 통일한다. 추가/수정이 동일한 모달 구조를 사용하며, 아이디·닉네임·권한·비밀번호는 공통, 잔액조정·삭제는 수정 모드에서만 노출한다.

## 백엔드 계약 참조 (재작업 금지, 계약 고정)
- `PATCH /admin/members/:id` — body `{ username?, nickname?, role?(UserRole), password?(min4) }`. 제공된 필드만 수정, `password`는 truthy일 때만 변경(빈 값 스킵). 반환 `{ ...user, totalPoints: number }` (nickname 포함).
- `POST /admin/members/:id/adjust` — body `{ delta: int(0 불가), memo?: string }` (잔액 조정, 통합수정과 별개 요청).
- `DELETE /admin/members/:id` — 자기자신 삭제는 백엔드에서 차단(프론트에서도 버튼 비활성화).
- `POST /admin/members` — 신규 생성(기존 `create` 유지): `{ username, password, role?, nickname?, battleTag? }`.
- `UserRole` enum = USER | CAPTAIN | ADMIN. **UI Select는 USER/ADMIN 2개만 노출**(기존 동작 유지).

## 구현 가이드

### 1) `modules/admin/api/members.ts` — 통합 update 메서드 + nickname 필드
- **`AdminMember` 인터페이스에 `nickname?: string | null` 추가**(line 3-13 근처). 런타임 list 응답에 spread로 존재하므로 타입만 노출 → 통합 폼 프리필에 사용.
- **`update` 메서드 추가**: 통합 PATCH 호출.
  ```ts
  update: (
    id: string,
    dto: { username?: string; nickname?: string; role?: 'USER' | 'CAPTAIN' | 'ADMIN'; password?: string },
  ): Promise<AdminMember> =>
    api.patch<AdminMember>(`/admin/members/${id}`, dto).then((r) => r.data),
  ```
- 기존 `updateRole/updateUsername/updatePassword`는 페이지에서 미사용 예정(제거 선택 사항, 호환 위해 유지 권장). `adjustPoints`, `create`, `remove`, `list`는 그대로 사용.
- `any` 금지 — DTO는 명시적 옵셔널 필드 타입 사용.

### 2) `modules/admin/schemas/member-form.schema.ts` — 신규 스키마 (P1)
- react-hook-form + zod 리졸버용. 추가/수정 모드 분기(비밀번호: 추가 시 필수 min4, 수정 시 빈 값 허용·입력 시 min4).
- 모드 인자 팩토리로 단일 소스 관리 권장:
  ```ts
  import { z } from 'zod'
  export function makeMemberFormSchema(isEdit: boolean) {
    return z.object({
      username: z.string().min(1, '아이디를 입력하세요').max(50),
      nickname: z.string().max(50).optional().or(z.literal('')),
      role: z.enum(['USER', 'ADMIN']),
      password: isEdit
        ? z.string().refine((v) => v === '' || v.length >= 4, '비밀번호는 4자 이상이어야 합니다')
        : z.string().min(4, '비밀번호는 4자 이상이어야 합니다'),
    })
  }
  export type MemberFormValues = z.infer<ReturnType<typeof makeMemberFormSchema>>
  ```
- 잔액 조정(delta/memo)은 기존 `member-adjust.schema.ts`(memberAdjustSchema)를 그대로 재사용 — 별도 섹션/별도 제출로 처리(스키마 새로 만들지 말 것).

### 3) `app/admin/members/page.tsx` — 통합 폼으로 교체 (P0)
- **제거**: `DETAIL_TABS`(line 46-52)와 탭 UI(line 268-286), 탭별 분기 렌더(role/username/password/delete 각각의 블록), 별도 회원 추가 다이얼로그(line 393-450), 그리고 그에 따른 개별 상태(`dialogMode`, `pendingRole`, `usernameInput`, `passwordInput`, `createOpen`, `createForm`) 및 개별 핸들러(`handleRoleSave`, `handleUsernameSave`, `handlePasswordSave`, `handleCreate`).
- **단일 통합 Dialog 구성** (추가/수정 공용):
  - 상태: `open`, `selectedMember: AdminMember | null`(null이면 추가 모드), `busy`.
  - `isEdit = !!selectedMember`.
  - react-hook-form: `useForm<MemberFormValues>({ resolver: zodResolver(makeMemberFormSchema(isEdit)), defaultValues })`. 모달 열 때 `form.reset(...)`으로 프리필:
    - 추가: `{ username: '', nickname: '', role: 'USER', password: '' }`
    - 수정: `{ username: member.username, nickname: member.nickname ?? '', role: member.role === 'ADMIN' ? 'ADMIN' : 'USER', password: '' }` (CAPTAIN→USER 축약: 기존 동작 보존)
  - `resolver`가 모드에 따라 달라지므로, 추가/수정 모달을 서로 다른 useForm 인스턴스로 두거나, 열 때 resolver 갱신이 필요. **권장**: 하나의 useForm에 `context` 또는 `open` 시점 재생성 대신, `zodResolver`를 열 때 고정하기 위해 모드별로 폼을 재마운트(예: Dialog에 `key={isEdit ? 'edit' : 'create'}` 또는 별도 내부 폼 컴포넌트 분리). 폼 로직이 커지면 `member-form-dialog.tsx` 내부 컴포넌트로 분리 가능하나 **파일은 members 디렉토리 내로 한정**(task-001과 충돌 없게). 신규 컴포넌트 생성 시 경로 예: `modules/admin/components/member-form-dialog.tsx` (신규, 충돌 없음).
- **폼 필드 (세로 섹션)**:
  1. 아이디 (`Input`, register 'username') — 공통
  2. 닉네임 (`Input`, register 'nickname') — 공통
  3. 권한 (`Select` USER/ADMIN, react-hook-form `Controller` 또는 `setValue`) — 공통
  4. 비밀번호 (`Input type="text"`, register 'password') — 공통. 수정 모드 라벨/헬프텍스트에 "빈 값이면 변경 안 함" 명시, 추가 모드 "필수(4자 이상)".
  - 위 4필드는 **저장(submit)** 시 `PATCH update`(수정) 또는 `create`(추가) 호출.
- **수정 모드 전용 섹션** (`isEdit &&`):
  5. 잔액 조정: `memberAdjustSchema` 기반 delta(number)/memo 입력 + [적용] 버튼. `membersApi.adjustPoints(id, { delta, memo })` 별도 호출(폼 submit과 분리). 성공 시 목록 invalidate.
     - (P2) 현재 잔액 표시: `selectedMember.totalPoints`. 입력 delta에 따른 예상 잔액(`totalPoints + delta`) 미리보기 텍스트.
  6. 삭제: [삭제] 버튼 → 전역 `useConfirm()`으로 확인 다이얼로그(`variant: 'destructive'`), 확인 시 `membersApi.remove(id)`.
     - **자기자신 삭제 비활성화(P0)**: `useAuth()`의 `user?.id === selectedMember.id`이면 버튼 `disabled` + 안내 텍스트("본인 계정은 삭제할 수 없습니다").
- **저장 로직 (submit)**:
  - 추가 모드: `membersApi.create({ username, password, role, nickname: nickname || undefined })`.
  - 수정 모드: 변경된 필드만 담아 `membersApi.update(id, dto)` (P1). 최소 구현으로 전 필드 전송도 백엔드가 허용하나(제공 필드만 반영, 빈 password 스킵), **빈 password는 payload에서 제외**할 것(빈 문자열 전송 시 백엔드가 스킵하지만 명시적으로 빼는 편이 안전). 닉네임 빈 값 처리는 정책에 맞게(빈 문자열 유지 or undefined) — 기존 표시와 일관되게.
  - 성공 시 `invalidate()`, 모달 닫기, 토스트. 실패 시 `errMsg`(기존 line 456-461 헬퍼 유지)로 백엔드 메시지 노출.
- **테이블/목록**: 기존 `DataTable`, `columns`, `useQuery`, 페이지네이션, `onRowClick`(→ 통합 모달 열기 with member) 유지. "+ 회원 추가" 버튼은 `selectedMember=null`로 통합 모달 열기.
- **import 정리**: 미사용 import 제거(예: 탭 제거 후 불필요해진 것), `useConfirm`(`@/common/components/confirm-dialog`), `useAuth`(`@/context/auth-context`), `makeMemberFormSchema`/`MemberFormValues` 추가. `any` 금지.

## 성공 기준
- [ ] 신규 추가와 기존 수정이 **동일한 통합 모달 구조**를 사용한다
- [ ] 통합 폼에서 아이디·닉네임·권한·비밀번호를 한 화면에서 수정할 수 있다
- [ ] 수정 모드에서만 잔액 조정 섹션과 삭제 버튼이 노출된다
- [ ] 비밀번호를 빈 값으로 두면 변경되지 않는다(수정 모드), 추가 모드에서는 4자 이상 필수
- [ ] 변경된 필드만 `PATCH /admin/members/:id`로 전송된다 (빈 password 제외) (P1)
- [ ] 잔액 조정은 `POST /admin/members/:id/adjust`로 별도 처리된다
- [ ] 자기자신(`user.id === member.id`) 삭제 버튼이 비활성화된다 (P0)
- [ ] 삭제 시 확인 다이얼로그(useConfirm, destructive)를 거친다
- [ ] `AdminMember`에 `nickname` 타입이 추가되어 수정 모달 프리필에 사용된다
- [ ] (P2) 잔액 조정 시 현재 잔액 및 조정 후 예상 잔액이 표시된다

## 제약
- 수정 금지: `frontend/src/common/components/ui/*` (Shadcn), `frontend/src/lib/utils.ts`
- 백엔드 재작업 금지 — 위 계약만 사용. 엔드포인트/DTO 변경 금지.
- `any` 타입 금지. Tailwind CSS + `cn()`만 사용(별도 CSS 파일 금지). 하드코딩 색상/폰트/간격 금지.
- 오버워치 테마 유지 (기존 Dialog/Button 스타일 톤 준수).
- 역할 Select는 USER/ADMIN 2개만 노출(CAPTAIN 미노출, 기존 동작 보존).
- 신규 파일은 members 관련 디렉토리 내로 한정(`modules/admin/schemas/`, `modules/admin/components/`) — task-001 파일셋과 충돌 없게.

## 검증 방법
```bash
cd /Users/eyjs/Desktop/WorkSpace/potg/potg/frontend
npm run lint
npm run build
```
- 수동: 회원 추가(필수 검증), 기존 회원 수정(아이디/닉네임/권한 변경, 비번 빈 값=미변경, 비번 입력=변경), 잔액 조정(+/-, 0 거부), 삭제(확인 다이얼로그, 본인 비활성화) 시나리오 확인.

## 테스트 요구사항
- 단위 테스트: `member-form.schema.ts`의 `makeMemberFormSchema` 검증 로직(추가 시 password min4 필수, 수정 시 빈 값 허용/입력 시 min4)에 대한 zod 파싱 테스트 권장(테스트 러너 존재 시). UI는 lint + build + 수동 시나리오로 갈음.
