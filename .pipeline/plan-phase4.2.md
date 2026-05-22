# Phase 4.2 — 프론트엔드 관리자 페이지 실행 계획

> 작성일: 2026-05-22
> 선행 Phase: 4.1 (백엔드 admin API 완료)
> 산출 디렉토리: `frontend/src/app/admin/*`
> 기술스택: Next.js 16 App Router + React 19 + TanStack Query v5 + Shadcn UI + zod + react-hook-form

---

## 1. 요구사항 요약

- `frontend/src/app/admin/*` 10개 페이지 신규 구성
- Phase 4.1에서 노출한 `/admin/*` REST API를 1:1 매핑
- 인증 흐름을 **쿠키 기반(HttpOnly)** 으로 통일 (Phase 3 OAuth와 정합)
- 기존 사용자 페이지(베팅/상점/지갑 등)는 회귀 없이 동작 유지
- Phase 5에서 사용자 페이지 폐기 예정이므로, 본 Phase에서는 **인증 통합 + admin 신규 구성** 만 수행 (사용자 페이지 UI 변경 X)

---

## 2. 기술적 분석

### 2.1 현재 인증 구조 (탐색 결과)

| 항목 | 현재 상태 |
|------|----------|
| 프론트 토큰 저장 | `localStorage.access_token` |
| 프론트 API 요청 | `Authorization: Bearer ${token}` 헤더 (axios interceptor) |
| 백엔드 JwtStrategy | `ExtractJwt.fromAuthHeaderAsBearerToken()` — Authorization 헤더만 |
| 백엔드 `/auth/discord/callback` | 이미 `res.cookie('access_token', ..., { httpOnly: true })` 전송 중 (Phase 3) |
| 백엔드 `/auth/login` | JSON 응답으로 `{ access_token }` 반환 (쿠키 미설정) |
| 백엔드 CORS | `credentials: true` 이미 활성화 (변경 불필요) |
| 백엔드 `cookie-parser` | **미설치** (추가 필요) |

### 2.2 인증 통합 시 영향 범위

`access_token`/`localStorage` 사용 파일 (grep 결과):
- `frontend/src/lib/api.ts` — interceptor 헤더 주입
- `frontend/src/context/auth-context.tsx` — set/get/remove
- `frontend/src/app/login/page.tsx` — `login(response.data.access_token)` 호출
- `frontend/src/app/utility/quiz/page.tsx` — quiz 소켓 인증에 토큰 사용
- `frontend/src/modules/auction/hooks/use-auction-socket.ts` — 소켓 핸드셰이크에 토큰 사용

소켓(socket.io)은 쿠키 자동 전송이 동작하지만, 현재 코드는 명시적으로 `auth.token`을 넘기는 패턴 → 게이트웨이 측 인증 검증 경로 확인 필요. **본 Phase에서는 socket.io 경로는 기존 토큰 패턴을 유지**하고, HTTP만 쿠키로 전환 (혼합 운영 가능).

### 2.3 리스크

| # | 리스크 | 완화 |
|---|--------|------|
| R1 | 쿠키 전환 후 기존 사용자 페이지 401 폭증 | T1에서 `/auth/login`을 쿠키 + JSON 듀얼 발급으로 전환. 프론트는 쿠키 우선, localStorage 폴백 유지하다 Phase 5에서 제거 |
| R2 | Next.js 16 App Router에서 클라이언트 쿠키 직접 검사 불가(HttpOnly) | AuthContext는 `/auth/profile` 호출 성공/실패로 세션 판단 (현행 패턴 유지) |
| R3 | SSR 중 쿠키 미전송으로 admin 페이지 깜빡임 | admin 페이지는 모두 `"use client"` + `<AdminGuard>`로 클라이언트 보호. SSR 가드 미사용 |
| R4 | 4.1 한계: Excel 헤더 한국어 미지원, products admin 라우트 누락 | T11에서 `/shop` 기존 라우트로 대체. 부족 시 Phase 5 백로그 |
| R5 | Discord 로그인만 사용하는 사용자가 admin role 가질 때 `/auth/discord` → admin 화면 도달 흐름 미정의 | T1 마지막에 `/auth/discord/success` 페이지가 admin 여부 보고 `/admin` 또는 `/` 리다이렉트 |
| R6 | socket.io 인증 — 쿠키 자동 전송이 동작하지 않는 환경 | 본 Phase 범위 외. 소켓은 기존 토큰 유지 |

### 2.4 선행 조건

- backend: `cookie-parser` 의존성 추가 + `main.ts`에 `app.use(cookieParser())`
- backend: `JwtStrategy`가 쿠키에서도 토큰 추출하도록 `jwtFromRequest` 변경 (헤더 → 쿠키 fallback)
- backend: `/auth/login`이 쿠키도 함께 set (응답 바디는 호환을 위해 유지)
- backend: `POST /auth/logout` 추가 (쿠키 clear)

---

## 3. 아키텍처 결정

| # | 결정 | 근거 |
|---|------|------|
| A1 | 쿠키 기반 단일 세션 (HttpOnly + SameSite=Lax) | XSS 토큰 탈취 방어, OAuth 콜백 패턴과 정합 |
| A2 | `/auth/login`에서 쿠키 + JSON 듀얼 발급 (1차), 추후 JSON 응답 제거 | 점진적 마이그레이션. 회귀 위험 최소화 |
| A3 | axios `withCredentials: true` 전역 설정 + Bearer interceptor 제거 | 단일 인증 경로. localStorage 잔존 토큰은 무시 |
| A4 | TanStack Query v5 도입 (이미 의존성 존재) | admin은 목록/페이징/뮤테이션 빈번. 캐싱 표준화 |
| A5 | 폼 검증은 `react-hook-form + zod` (이미 의존성 존재) | `class-validator` DTO와 정합 가능 |
| A6 | admin API 클라이언트는 `frontend/src/modules/admin/api/*.ts` 도메인별 분리 | members.ts, matches.ts, ledger.ts, config.ts, attendance.ts |
| A7 | 차트는 `recharts` (의존성 존재) | dashboard 그래프 |
| A8 | 토스트는 `sonner` (의존성 존재) | 뮤테이션 결과 알림 |
| A9 | `/admin/layout.tsx` 단일 가드 + 사이드바 | 페이지별 가드 중복 제거 |
| A10 | 공통 DataTable은 자체 작성 (Shadcn `@tanstack/react-table` 미설치) | 단순한 페이지네이션 테이블만 필요. 의존성 추가 회피 |

---

## 4. 구현 전략

### 4.1 디렉토리 구조 (신규)

```
frontend/src/
├── app/admin/
│   ├── layout.tsx                     # ADMIN 가드 + 사이드바
│   ├── page.tsx                       # 대시보드
│   ├── matches/
│   │   ├── page.tsx                   # 목록 + 생성
│   │   └── [id]/
│   │       ├── page.tsx               # 상세 + 상태 전이
│   │       ├── settle/page.tsx        # 정산 입력
│   │       └── auction/page.tsx       # 기존 auction 재활용 wrapper
│   ├── members/page.tsx
│   ├── products/page.tsx
│   ├── orders/page.tsx
│   ├── attendance/page.tsx
│   ├── config/page.tsx
│   └── ledger/page.tsx
├── modules/admin/
│   ├── api/
│   │   ├── matches.ts
│   │   ├── members.ts
│   │   ├── attendance.ts
│   │   ├── config.ts
│   │   ├── ledger.ts
│   │   └── shop.ts                    # products/orders 공유
│   ├── components/
│   │   ├── admin-sidebar.tsx
│   │   ├── admin-guard.tsx
│   │   ├── data-table.tsx             # 공통 페이징 테이블
│   │   ├── pagination.tsx
│   │   ├── confirm-dialog.tsx
│   │   └── empty-state.tsx
│   ├── hooks/
│   │   ├── use-paged-query.ts
│   │   └── use-admin-mutation.ts
│   └── schemas/                       # zod 스키마 (form)
│       ├── match-create.schema.ts
│       ├── member-adjust.schema.ts
│       └── config-update.schema.ts
└── providers/
    └── query-provider.tsx             # TanStack Query Provider
```

### 4.2 공통 모듈 설계

**admin API 클라이언트 패턴** (`modules/admin/api/matches.ts` 예시):
```ts
export const matchesApi = {
  list: (params) => api.get('/admin/matches', { params }).then(r => r.data),
  detail: (id) => api.get(`/admin/matches/${id}`).then(r => r.data),
  create: (dto) => api.post('/admin/matches', dto).then(r => r.data),
  open: (id) => api.post(`/admin/matches/${id}/open`).then(r => r.data),
  // ...
}
```

**DataTable 인터페이스**:
```ts
interface DataTableProps<T> {
  columns: Array<{ key: keyof T; header: string; render?: (row: T) => ReactNode }>
  rows: T[]
  loading?: boolean
  emptyMessage?: string
  pagination?: { skip: number; take: number; total: number; onChange: (skip: number) => void }
}
```

**폼 검증 패턴**:
```ts
const schema = z.object({ delta: z.number().int(), memo: z.string().min(1).max(200) })
type FormValues = z.infer<typeof schema>
const form = useForm<FormValues>({ resolver: zodResolver(schema) })
```

---

## 5. 단계별 실행 계획

### Phase 4.2-A: 인증 통합 기반 (T1, T2)
- 목표: 모든 admin 페이지가 빌드/동작할 수 있는 보안 + 레이아웃 기반
- 완료 기준: `/admin`에 비-ADMIN 접근 시 `/login` 리다이렉트, ADMIN 접근 시 빈 대시보드 진입

### Phase 4.2-B: 회원/내전/원장 핵심 운영 (T3, T4, T5, T6, T7)
- 목표: 매주 운영에 필요한 핵심 화면 (회원 조정, 내전 라이프사이클)
- 완료 기준: 내전 DRAFT 생성 → OPEN → LOCK → SETTLE 전 플로우 UI로 가능

### Phase 4.2-C: 상점/주문/출석/설정 (T8, T9, T10, T11)
- 목표: 부가 운영 화면
- 완료 기준: xlsx 업로드 결과 행별 표시, 상품 CRUD 동작

### Phase 4.2-D: 대시보드 시각화 (T12)
- 목표: `/admin` 메인 차트
- 완료 기준: 발행/소각/유통량 카드 + 시간별 그래프

---

## 6. 태스크 목록

| # | 태스크 | 의존성 | 복잡도 (LOC) |
|---|--------|--------|--------------|
| T1 | 인증 통합 (쿠키 전환) | — | High (~250) |
| T2 | /admin/layout + 가드 + 사이드바 | T1 | Mid (~200) |
| T3 | /admin/members | T2 | Mid (~280) |
| T4 | /admin/matches (목록+생성) | T2 | Mid (~250) |
| T5 | /admin/matches/[id] (상세+상태전이) | T4 | Mid (~300) |
| T6 | /admin/matches/[id]/settle | T5 | Low (~200) |
| T7 | /admin/ledger | T2 | Mid (~250) |
| T8 | /admin/products | T2 | Mid (~280) |
| T9 | /admin/orders | T2 | Mid (~220) |
| T10 | /admin/attendance | T2 | Low (~180) |
| T11 | /admin/config | T2 | Low (~200) |
| T12 | /admin (대시보드) | T7 | Mid (~250) |

총 예상 LOC: ~2860 (테스트 제외)

---

## 7. 태스크 상세

### T1. 인증 통합 (쿠키 기반)
**입력**:
- `backend/src/main.ts`, `backend/src/modules/auth/{auth.controller,jwt.strategy}.ts`
- `frontend/src/{lib/api.ts, context/auth-context.tsx, app/login/page.tsx}`

**출력 (생성/수정)**:
- `backend/package.json` — `cookie-parser`, `@types/cookie-parser` 추가
- `backend/src/main.ts` — `cookieParser()` 미들웨어
- `backend/src/modules/auth/jwt.strategy.ts` — `jwtFromRequest`를 `ExtractJwt.fromExtractors([cookieExtractor, fromAuthHeaderAsBearerToken])` 로
- `backend/src/modules/auth/auth.controller.ts` — `/auth/login`에 쿠키 set 추가 + `POST /auth/logout` 신규
- `frontend/src/lib/api.ts` — `withCredentials: true`, Bearer interceptor 제거
- `frontend/src/context/auth-context.tsx` — localStorage 제거, `fetchUser` 무조건 호출 + 401시 미로그인 상태
- `frontend/src/app/login/page.tsx` — `login()` 시그니처 변경 (인자 없음 → 내부에서 profile fetch)
- `frontend/src/app/utility/quiz/page.tsx` — localStorage 토큰 의존 제거 또는 socket.io는 그대로 (회귀 검증)
- `frontend/src/providers/query-provider.tsx` — TanStack Query Provider 신규
- `frontend/src/app/layout.tsx` — QueryProvider 래핑

**완료 기준**:
- [ ] `cd backend && npm run build` PASS
- [ ] `cd frontend && npm run lint && npm run build` PASS
- [ ] 자체 회원가입 로그인 후 `/profile` 페이지에 사용자 정보 표시 (회귀)
- [ ] Discord OAuth 콜백 후 동일하게 세션 유지 (회귀)
- [ ] DevTools Application 탭에서 `access_token` 쿠키가 HttpOnly + Secure(prod)로 설정됨
- [ ] localStorage에 `access_token` 키 부재
- [ ] `POST /auth/logout` 호출 시 쿠키 clear + 401 응답

**테스트**:
- backend: `auth.controller.spec.ts`에 logout + cookie set 케이스 추가 (가능 시)
- 수동: 기존 페이지 (`/betting`, `/shop`, `/wallet`) 1회씩 진입하여 401 없음 확인

---

### T2. /admin/layout + 가드 + 사이드바
**입력**: T1 결과, `auth-context.tsx`의 `isAdmin`

**출력**:
- `frontend/src/app/admin/layout.tsx` — `<AdminGuard><AdminSidebar />{children}</AdminGuard>`
- `frontend/src/modules/admin/components/admin-guard.tsx` — `useAuth()` 기반 가드 (isLoading 중 스피너, 미로그인/비-ADMIN시 `/login` 또는 `/`)
- `frontend/src/modules/admin/components/admin-sidebar.tsx` — 메뉴 11개 (대시보드/내전/회원/상품/주문/출석/원장/설정 등) + 오버워치 테마 (skewed accent)
- `frontend/src/app/admin/page.tsx` — placeholder "Phase 4.2-D에서 구현"

**완료 기준**:
- [ ] 비로그인 → `/admin` 접근 시 `/login` 리다이렉트
- [ ] USER 권한 로그인 → `/admin` 접근 시 `/` 리다이렉트 + 토스트 "권한 없음"
- [ ] ADMIN 로그인 → 사이드바 표시 + 대시보드 placeholder 표시
- [ ] 사이드바 활성 메뉴 하이라이트 (`usePathname` 기반)
- [ ] 색상: `bg-card`, `bg-primary`(active), `text-ow-blue`(hover) 하드코딩 hex 없음

---

### T3. /admin/members
**입력**: `GET/PATCH/POST /admin/members`

**출력**:
- `frontend/src/modules/admin/api/members.ts`
- `frontend/src/modules/admin/schemas/member-adjust.schema.ts` — `z.object({ delta: z.number().int(), memo: z.string().min(1) })`
- `frontend/src/app/admin/members/page.tsx`
  - 페이징 테이블 (id, username, role, pointsBalance, marketGatePassed)
  - 행 클릭 → 상세 다이얼로그 (role select + 잔액 조정 폼)

**완료 기준**:
- [ ] 페이지 진입 시 100명 페이징 로드
- [ ] role 변경 → PATCH 호출 → 토스트 + 목록 갱신
- [ ] 잔액 조정 (delta=1000, memo="테스트 지급") → POST 호출 → 잔액 갱신 확인
- [ ] memo 빈값 시 zod 에러 표시

---

### T4. /admin/matches (목록 + 생성)
**입력**: `GET/POST /admin/matches`, `POST /admin/matches/:id/teams`

**출력**:
- `frontend/src/modules/admin/api/matches.ts`
- `frontend/src/modules/admin/schemas/match-create.schema.ts`
- `frontend/src/app/admin/matches/page.tsx`
  - 상태 필터 (DRAFT/BETTING_OPEN/LOCKED/SETTLED/CANCELLED)
  - 생성 모달 (title, scheduledAt, teamCount)

**완료 기준**:
- [ ] 목록에서 상태별 색상 뱃지 (DRAFT 회색, OPEN 파랑, LOCKED 노랑, SETTLED 초록, CANCELLED 빨강)
- [ ] 생성 후 목록 최상단에 신규 매치 표시
- [ ] 행 클릭 → `/admin/matches/[id]` 이동

---

### T5. /admin/matches/[id] (상세 + 상태 전이)
**입력**: `GET /admin/matches/:id`, `POST :id/{open,lock,cancel}`, `POST :id/teams`

**출력**:
- `frontend/src/app/admin/matches/[id]/page.tsx`
  - 상태 머신 표시 (현 상태 강조)
  - 전이 버튼 (현 상태에서 가능한 것만 활성, 나머지 disabled)
  - 팀 카드 + 멤버 목록
  - "결과 입력" 버튼 (LOCKED 상태에서만) → `/admin/matches/[id]/settle`
  - "경매 페이지로" 버튼 → `/auctions/[matchId]` (기존 페이지 재활용)

**완료 기준**:
- [ ] DRAFT → open 클릭 → 상태 BETTING_OPEN 갱신
- [ ] BETTING_OPEN → lock 클릭 → LOCKED 갱신
- [ ] DRAFT/OPEN/LOCKED 단계에서 cancel 버튼 활성, SETTLED에서 모든 전이 disabled
- [ ] 전이 실패(409 등) 시 sonner 에러 토스트

---

### T6. /admin/matches/[id]/settle
**입력**: `POST /admin/matches/:id/settle` (`{ winnerTeamId, placements: [{teamId, rank}] }`)

**출력**:
- `frontend/src/app/admin/matches/[id]/settle/page.tsx`
  - 팀 목록 + winnerTeamId radio
  - 팀별 순위 입력 (1~N)
  - 확인 다이얼로그 ("정산은 되돌릴 수 없습니다")

**완료 기준**:
- [ ] LOCKED 외 상태 접근 시 페이지 진입 차단 (`/admin/matches/[id]` 리다이렉트)
- [ ] 순위 중복 시 클라이언트 검증 에러
- [ ] 정산 성공 시 `/admin/matches/[id]` 리다이렉트 + SETTLED 상태 확인

---

### T7. /admin/ledger
**입력**: `GET /admin/ledger?userId&reason&from&to&skip&take`, `GET /admin/ledger/summary`

**출력**:
- `frontend/src/modules/admin/api/ledger.ts`
- `frontend/src/app/admin/ledger/page.tsx`
  - 요약 카드 3개 (발행/소각/유통량)
  - 필터 (userId 검색, reason select, date range)
  - 페이징 테이블 (id, createdAt, fromUserId, toUserId, amount, reason, memo)

**완료 기준**:
- [ ] 필터 변경 시 1페이지로 리셋
- [ ] take는 200 이하 (백엔드 제약 일치)
- [ ] amount는 양수(입금)/음수(출금) 색상 분기 (`text-ow-blue` / `text-ow-red`)

---

### T8. /admin/products
**입력**: 기존 `/shop` 라우트 (Phase 4.1 한계 §3 — admin 전용 products 라우트 부족 가능. 진입 시 백엔드 라우트 재확인 필요)

**출력**:
- `frontend/src/modules/admin/api/shop.ts`
- `frontend/src/app/admin/products/page.tsx` — CRUD 테이블
- (필요 시 신규 backend 라우트 — T8 진입 시 결정)

**완료 기준**:
- [ ] 상품 목록 페이징
- [ ] 신규 등록 모달 (name, price, stock, imageUrl)
- [ ] 재고/가격 인라인 편집
- [ ] 비활성화(soft delete) 토글

**리스크**: 백엔드 admin 라우트 미존재 시 T8 보류 + 백로그 (Phase 4.2-X로 분기). 작업 시작 직후 `backend/src/modules/shop/*.controller.ts` 재확인 필요.

---

### T9. /admin/orders
**입력**: 기존 `/shop/admin/*` (재확인)

**출력**:
- `frontend/src/app/admin/orders/page.tsx`
  - 주문 목록 (페이징 + 상태 필터)
  - "전달 완료" / "취소" 액션

**완료 기준**:
- [ ] 상태 변경 시 목록 즉시 갱신
- [ ] 취소 시 환불 PointTx가 `/admin/ledger`에서 조회됨 (회계 무결성 검증)

---

### T10. /admin/attendance
**입력**: `POST /admin/attendance/upload` (multipart)

**출력**:
- `frontend/src/modules/admin/api/attendance.ts` (axios + FormData)
- `frontend/src/app/admin/attendance/page.tsx`
  - 파일 드롭존 (xlsx만)
  - 업로드 결과 테이블 (`{ total, success, failed, results[] }`)
  - 실패 행 csv 다운로드 버튼

**완료 기준**:
- [ ] 잘못된 확장자 거부 (클라이언트 검증)
- [ ] 응답 results 행별 success/fail 컬러 표시
- [ ] 실패 사유 hover tooltip

---

### T11. /admin/config
**입력**: `GET/PATCH /admin/config[/:key]`

**출력**:
- `frontend/src/modules/admin/api/config.ts`
- `frontend/src/modules/admin/schemas/config-update.schema.ts`
- `frontend/src/app/admin/config/page.tsx`
  - 전체 KV 테이블
  - 행별 인라인 편집 + "저장" 버튼

**완료 기준**:
- [ ] PATCH 성공 시 row optimistic update + 토스트
- [ ] description 표시 (있을 때)
- [ ] value는 string 입력. 숫자 키에 비숫자 입력 시 백엔드 400 → 토스트 표시

---

### T12. /admin (대시보드)
**입력**: `GET /admin/ledger/summary`, `GET /admin/ledger` (최근 100건 시간별 집계 또는 별도 endpoint 추가 검토)

**출력**:
- `frontend/src/app/admin/page.tsx`
  - 카드 3개 (총 발행 / 총 소각 / 유통량)
  - recharts AreaChart: 최근 30일 일별 발행/소각 추이
  - 최근 PointTx 10건 미니 테이블 → "전체 보기" → `/admin/ledger`

**완료 기준**:
- [ ] summary 카드는 placeholder 없이 즉시 표시
- [ ] 차트 로딩 중 스켈레톤
- [ ] 차트 색상은 디자인 토큰 (`var(--primary)`, `var(--ow-blue)`)

**리스크**: 시간별 집계 endpoint 부재 → T12 시작 시 `GET /admin/ledger/timeseries?bucket=day&days=30` 백엔드 추가 필요 여부 결정. 부재 시 클라이언트에서 PointTx 페이지 합산(최대 200건 제약 → 기간 한정).

---

## 8. 수동 검증 시나리오 (Phase 종료 시 일괄 실행)

| # | 시나리오 |
|---|---------|
| V1 | 비로그인 → `/admin` → `/login` 리다이렉트 |
| V2 | ADMIN 로그인 → `/admin` 진입 → 대시보드 카드 표시 |
| V3 | 회원 1명 잔액 +5000 조정 → ledger에서 ADMIN_ADJUST PointTx 확인 |
| V4 | 내전 생성 → 팀 2개 추가 → OPEN → LOCK → settle → SETTLED 확인 |
| V5 | 출석 xlsx 업로드 (3행 중 1행 잘못된 discord_id) → 1행 fail 표시 |
| V6 | config 키 `BET_RAKE_RATE` 0.05 → 0.06 변경 후 재조회 시 반영 |
| V7 | 상품 등록 → 사용자 화면 `/shop`에서 노출 확인 (회귀) |
| V8 | 사용자 권한으로 `/betting`, `/shop`, `/wallet` 진입 시 401 없음 (회귀) |
| V9 | Discord OAuth 로그인 회귀 정상 |
| V10 | logout 호출 → 쿠키 clear + 모든 페이지 미인증 상태 |

---

## 9. 빌드/검증 명령

```bash
# 백엔드 (T1 영향)
cd backend && npm run build
cd backend && npx jest --testPathPatterns='auth'

# 프론트엔드 (모든 태스크)
cd frontend && npm run lint
cd frontend && npm run build
```

각 태스크 완료 시 위 명령 PASS 필수. 빌드 실패 또는 lint 에러 발생 시 해당 태스크 미완료.

---

## 10. Phase 5 백로그 (본 Phase 범위 외)

- 사용자 페이지 폐기 (`/betting`, `/shop`, `/wallet`, `/ranking`, `/utility/quiz`, `/gallery/*`, `/profile/shop`)
- 자체 회원가입 `/signup`, `/login` 폐기 → Discord OAuth 단일화
- localStorage 토큰 호환 코드 완전 제거 (`/utility/quiz`, auction socket)
- socket.io 인증 쿠키 통일
- admin spec 추가 (현재는 빌드 + 수동 검증만)
- Swagger 데코레이터 일괄 부착
- 차트용 timeseries endpoint
- products admin 라우트 보강 (있다면 확인, 없다면 추가)
