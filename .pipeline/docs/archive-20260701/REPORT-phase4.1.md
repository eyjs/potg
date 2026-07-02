# Phase 4.1 완료 리포트 — 백엔드 Admin API

> 작성일: 2026-05-22
> 범위: 관리자 웹용 백엔드 엔드포인트 (Matches/Members/Config/Ledger/Attendance Upload)
> 상태: ✅ 완료 (build PASS, 회귀 0, 누적 spec 15 PASS)

---

## 1. 산출물 요약

### 1.1 신규 컨트롤러

| 경로 | 파일 | 권한 |
|------|------|------|
| `POST/GET /admin/matches/*` | `modules/matches/match.controller.ts` | ADMIN |
| `POST /admin/betting/markets/*` | (기존 betting.controller에 존재 — 검증) | ADMIN |
| `GET/PATCH/POST /admin/members/*` | `modules/users/admin-users.controller.ts` | ADMIN |
| `POST /admin/attendance/upload` | `modules/attendance/attendance-upload.controller.ts` | ADMIN |
| `GET/PATCH /admin/config/*` | `modules/system-config/system-config.controller.ts` | ADMIN |
| `GET /admin/ledger /summary` | `modules/ledger/ledger.controller.ts` | ADMIN |

### 1.2 엔드포인트 카탈로그

**Matches (내전 상태머신 제어)**
- `GET /admin/matches` — 목록
- `GET /admin/matches/:id` — 상세 (+teams)
- `POST /admin/matches` — 생성 (DRAFT)
- `POST /admin/matches/:id/teams` — 팀 추가
- `POST /admin/matches/:id/open` — BETTING_OPEN 전이
- `POST /admin/matches/:id/lock` — LOCKED 전이 (BettingMarket 연쇄 LOCK)
- `POST /admin/matches/:id/settle` — SETTLED + 정산 (winnerTeamId + placements)
- `POST /admin/matches/:id/cancel` — CANCELLED + 환불

**Members**
- `GET /admin/members?skip&take` — 페이징 목록 (잔액/마켓게이트 포함)
- `GET /admin/members/:id` — 상세
- `PATCH /admin/members/:id/role` — USER/CAPTAIN/ADMIN 변경
- `POST /admin/members/:id/adjust` — `{ delta, memo }` 잔액 조정 (Ledger ADMIN_ADJUST)

**Attendance**
- `POST /admin/attendance/upload` (multipart `file=*.xlsx`)
  - 헤더: `discord_id | scrim_id | status`
  - 반환: `{ total, success, failed, results[] }`

**SystemConfig**
- `GET /admin/config` — 전체 KV
- `GET /admin/config/:key` — 단건
- `PATCH /admin/config/:key` — `{ value, description? }`

**Ledger (PointTx 원장)**
- `GET /admin/ledger?userId&reason&from&to&skip&take` — 페이징 조회
- `GET /admin/ledger/summary` — `{ minted, burned, circulating }`

### 1.3 의존성
- `xlsx@^0.18.5` (엑셀 파싱) — `@nestjs/platform-express` 기존 활용

### 1.4 모듈 변경
- `matches.module.ts` — MatchController 등록
- `users.module.ts` — AdminUsersController + LedgerModule import
- `attendance.module.ts` — AttendanceUploadController + User repo import
- `system-config.module.ts` — SystemConfigController 등록
- `ledger.module.ts` — LedgerController 등록

---

## 2. 검증

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ PASS |
| Phase 2+3 spec | ✅ 15 PASS (회귀 없음) |
| 권한 가드 일관성 | ✅ 모든 admin 경로 `AuthGuard('jwt')` + `RolesGuard` + `@Roles(ADMIN)` |
| 잔액 조정 회계 무결성 | ✅ LedgerService.mint/burn 통해서만 (PointTx 자동 기록) |

---

## 3. 주요 결정 사항

| # | 결정 | 사유 |
|---|------|------|
| D1 | 별도 AdminGuard 생성 안 함 | 기존 `RolesGuard` + `@Roles(ADMIN)` 충분. DRY 유지 |
| D2 | Members 잔액 조정은 LedgerService 경유 | balance 직접 UPDATE 금지. 모든 변동은 PointTx로 추적 가능해야 함 |
| D3 | Attendance upload 결과 행별 반환 | 일괄 처리 중 일부 실패도 부분 성공 허용. 클라이언트가 실패 행만 재시도 가능 |
| D4 | `xlsx` 파서 사용 (SheetJS) | NestJS 생태계 표준. 추후 보안 이슈 시 `exceljs`로 교체 가능 |
| D5 | Ledger 조회 페이지 최대 200 | 메모리 보호. 큰 범위는 date 필터 권장 |

---

## 4. 알려진 한계 (Phase 4.2 / 5에서 처리)

1. **Spec 추가 미작성** — Phase 4.2에서 컨트롤러 단위 테스트 보강 (현재는 빌드 + 통합 회귀로 검증)
2. **OpenAPI 문서** — Swagger 데코레이터 미부착. Phase 4.2 또는 5에서 일괄 추가
3. **Excel column 유연성** — 현재 헤더명 고정 (`discord_id`, `scrim_id`, `status`). 다국어 헤더 매핑 미지원
4. **단일 클랜 가정** — `attendance-upload`가 ClanMember 조회. Phase 5 단일 클랜 전환 시 단순화
5. **rate limiting** — admin 엔드포인트는 ThrottlerGuard 적용 중이나 별도 admin-tier 정책 없음

---

## 5. 다음 Phase 진입 조건

- [x] Matches 관리 API
- [x] Members 관리 API (잔액 조정 포함)
- [x] Attendance Excel 업로드
- [x] SystemConfig 관리 API
- [x] Ledger 조회 API
- [x] BettingMarket 관리 API (기존)
- [x] 빌드 통과 + 회귀 없음
- [ ] **Phase 4.2 (프론트엔드 /admin/*)** — 10개 페이지, Next.js 16 + Shadcn UI

---

## 6. 다음 액션

1. **Phase 4.1 커밋** (WBS 태깅 후)
2. **Phase 4.2 (프론트엔드 admin)** 착수
3. (선택) Discord Developer Portal 토큰 발급 후 실 디스코드 테스트
