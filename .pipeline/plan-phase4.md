# Phase 4 실행 계획 — 관리자 웹

> 작성일: 2026-05-22
> 범위: 백엔드 admin API (Phase 4.1) + 프론트엔드 admin 페이지 (Phase 4.2)

---

## 분할 전략

Phase 4 전체는 단일 세션에서 처리하기 큼. 4.1과 4.2로 분할.

### Phase 4.1 (이 세션): 백엔드 Admin API
- AdminGuard (ADMIN/CAPTAIN role)
- Matches controller (CRUD + 상태머신 전이 + BettingMarket 생성)
- Admin shop orders 엔드포인트 (이미 일부 존재 — 보강)
- Members admin 엔드포인트 (잔액 조정, role 변경)
- Attendance excel upload 엔드포인트 (스텁)
- SystemConfig admin 엔드포인트
- Ledger 조회 엔드포인트 (PointTx 페이징)
- Excel 파서 의존성 (`xlsx`)
- 신규 spec

### Phase 4.2 (다음 세션): 프론트엔드 /admin/*
- Next.js 16 admin shell + 사이드바
- 10개 페이지 (대시보드, 내전, 경매, 정산, 상품, 주문, 회원, 출석, 설정, 원장)
- React Query + axios 통합
- Shadcn UI 재활용

---

## Phase 4.1 태스크 분할

```
T01 (AdminGuard 데코레이터 + role check)
T02 (Matches admin controller — CRUD + transitions)
T03 (BettingMarkets admin — createMarket)
T04 (Shop admin orders — markDelivered/cancel 보강)
T05 (Members admin — list, role update, balance adjust via Ledger)
T06 (Attendance admin — excel upload bulk insert)
T07 (SystemConfig admin — list/set)
T08 (Ledger view — PointTx 페이징 조회)
T09 (excel 파서 deps)
T10 (테스트)
T11 (빌드 + 리포트)
```

---

## 상세

### T01 AdminGuard
- 파일: `backend/src/common/guards/admin.guard.ts`
- ADMIN만 허용. `@Roles(UserRole.ADMIN)` 데코레이터 기존 활용 또는 신규 가드

### T02 Matches admin
- 파일: `backend/src/modules/matches/match.controller.ts` (신규)
- Endpoints:
  - `POST   /admin/matches`             — 내전 생성 (DRAFT)
  - `GET    /admin/matches`             — 목록
  - `GET    /admin/matches/:id`         — 상세 (teams, markets 포함)
  - `POST   /admin/matches/:id/open`    — DRAFT → BETTING_OPEN
  - `POST   /admin/matches/:id/lock`    — BETTING_OPEN → LOCKED
  - `POST   /admin/matches/:id/settle`  — LOCKED → SETTLED (winnerTeamId + placements)
  - `POST   /admin/matches/:id/cancel`  — CANCELLED
  - `POST   /admin/matches/:id/teams`   — 팀 생성

### T03 BettingMarket admin
- `BettingController`에 admin 라우트 추가 또는 신규
  - `POST   /admin/betting/markets`     — 마켓 생성 (matchId, type, rakeBps)

### T04 Shop admin orders
- 기존 `shop.controller.ts` 검토. 부족하면 admin 전용 라우트 추가:
  - `GET    /admin/shop/orders`             — 전체 주문 목록
  - `POST   /admin/shop/orders/:id/deliver`
  - `POST   /admin/shop/orders/:id/cancel`

### T05 Members admin
- 신규 `backend/src/modules/users/admin/admin-users.controller.ts`
  - `GET    /admin/members`               — 페이징 + 잔액/marketGate 표시
  - `PATCH  /admin/members/:id/role`      — role 변경 (USER/CAPTAIN/ADMIN)
  - `POST   /admin/members/:id/adjust`    — 잔액 조정 (LedgerService.mint/burn, reason=ADMIN_ADJUST)

### T06 Attendance admin
- `backend/src/modules/attendance/admin/attendance-upload.controller.ts`
- `POST /admin/attendance/upload` — multipart/form-data .xlsx
  - 행 형식: `discord_id | scrim_id | status`
  - `xlsx` 파서 + AttendanceRecord bulk insert
  - 결과: 성공/실패 카운트 + 실패 사유 목록 반환

### T07 SystemConfig admin
- `backend/src/modules/system-config/system-config.controller.ts` 신규
  - `GET    /admin/config`                 — 전체 KV
  - `PATCH  /admin/config/:key`            — value 수정

### T08 Ledger view
- `backend/src/modules/ledger/ledger.controller.ts` 신규
  - `GET    /admin/ledger`                 — PointTx 페이징 (filter: userId, reason, dateRange)
  - `GET    /admin/ledger/summary`         — 총발행/총소각/유통량

### T09 deps
- `xlsx` (SheetJS) — 엑셀 파싱

### T10 테스트
- `match.controller.spec` 1~2 케이스 (상태머신 전이)
- `admin-users.controller.spec` adjustBalance mint/burn 분기

### T11 빌드 + 리포트
- `.pipeline/REPORT-phase4.1.md`

---

## 환경변수

없음 (기존 JWT_SECRET, DATABASE_* 그대로)

---

## 산출물

- `backend/src/modules/matches/match.controller.ts`
- `backend/src/modules/users/admin/admin-users.controller.ts`
- `backend/src/modules/attendance/admin/attendance-upload.controller.ts`
- `backend/src/modules/system-config/system-config.controller.ts`
- `backend/src/modules/ledger/ledger.controller.ts`
- `backend/src/common/guards/admin.guard.ts`
- 각 모듈 갱신 (controllers 등록)
- 신규 spec
- `.pipeline/REPORT-phase4.1.md`
