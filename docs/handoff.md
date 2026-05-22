# POTG Discord 리팩토링 — 세션 핸드오프

> 최종 갱신: 2026-05-22
> 진행 상태: **Phase 1 → 4.2 완료 / Phase 5 (정리) 대기**

---

## 1. 한눈에 보기

| Phase | 상태 | 커밋 |
|-------|------|------|
| 1. 기반 (Entity + Migration) | ✅ 완료 | `2a0a0e1` |
| 2. 핵심 로직 (Ledger/Betting/Shop/Match) | ✅ 완료 | `2a0a0e1` |
| 3. Discord Bot + OAuth2 | ✅ 완료 + 코드리뷰 반영 | `8ab9dd4`, `f81f0eb` |
| 4.1. 백엔드 admin API | ✅ 완료 | `f226e0d` |
| 4.2. 프론트엔드 admin 페이지 | ✅ 완료 | `d9ca612`, `b57e078` |
| 5. 정리 (Games/사용자 페이지 폐기) | ⏳ 대기 | — |

**검증 현황**: backend build PASS, frontend build PASS (admin 라우트 11개 정상), 회귀 없음, 신규 admin 코드 lint 에러 0.

---

## 2. 완료된 작업 (Phase 4.2 추가분)

### Phase 4.2-T1 — 쿠키 기반 인증 통합 (`d9ca612`)
- **백엔드**
  - `cookie-parser` + `@types/cookie-parser` 의존성 추가
  - `main.ts`에 `app.use(cookieParser())`
  - `JwtStrategy`가 `fromExtractors([cookieExtractor, fromAuthHeaderAsBearerToken()])` — 쿠키 우선, Bearer fallback
  - `POST /auth/login`이 HttpOnly 쿠키 + JSON 듀얼 발급 (7일)
  - `POST /auth/logout` 신규 (clearCookie)
- **프론트엔드**
  - `axios`에 `withCredentials: true`, Bearer interceptor 제거
  - `AuthContext`가 `/auth/profile`로 세션 판단, `login(credentials)` / `logout()` async
  - `localStorage.access_token` 완전 제거
  - `utility/quiz/page.tsx`의 localStorage 토큰 참조 무해화 (socket.io 인증은 Phase 5에서 통합)

### Phase 4.2-T2~T12 — 관리자 페이지 11종 (`b57e078`)
- `frontend/src/app/admin/`
  - `layout.tsx` — AdminGuard + Sidebar (ADMIN role 가드, 미인증 → /login, USER → /)
  - `page.tsx` — 대시보드 (mint/burn/circulating 카드 + recharts AreaChart + 최근 PointTx 10건)
  - `members/page.tsx` — 페이징 목록 + role 변경 + 잔액 조정 (Ledger 경유)
  - `matches/page.tsx`, `[id]/page.tsx`, `[id]/settle/page.tsx` — DRAFT→OPEN→LOCK→SETTLE 상태머신
  - `ledger/page.tsx` — 발행/소각/유통량 + 필터 + 페이징
  - `products/page.tsx` — CRUD + 재고/가격 인라인 편집
  - `orders/page.tsx` — 전달/취소 액션
  - `attendance/page.tsx` — xlsx 업로드 + 결과 행별 표시
  - `config/page.tsx` — KV 인라인 편집
- `frontend/src/modules/admin/`
  - `api/{matches,members,attendance,config,ledger,shop}.ts`
  - `components/{admin-guard,admin-sidebar,data-table,empty-state}.tsx`
  - `hooks/{use-paged-query,use-admin-mutation}.ts`
  - `schemas/{match-create,member-adjust,config-update}.schema.ts`
- **백엔드 추가**: `backend/src/modules/shop/admin-products.controller.ts` (T8 위해 신규)
- 기술: TanStack Query v5, react-hook-form + zod, recharts, sonner, Shadcn UI 재사용

---

## 3. 다음 세션에서 해야 할 일

### 우선순위 1 — 수동 검증 (Phase 4.2 자체 점검)

계획서 `.pipeline/plan-phase4.2.md` §8 시나리오 V1~V10:

| # | 시나리오 | 자동/수동 |
|---|---------|----------|
| V1 | 비로그인 → `/admin` → `/login` 리다이렉트 | 수동 |
| V2 | ADMIN 로그인 → `/admin` 진입 → 대시보드 카드 표시 | 수동 |
| V3 | 회원 잔액 +5000 조정 → ledger에서 ADMIN_ADJUST 확인 | 수동 |
| V4 | 내전 생성 → 팀 2개 → OPEN → LOCK → settle → SETTLED | 수동 |
| V5 | 출석 xlsx 업로드 (3행 중 1행 잘못된 discord_id) → 1행 fail | 수동 |
| V6 | config `BET_RAKE_RATE` 변경 후 재조회 시 반영 | 수동 |
| V7 | 상품 등록 → 사용자 `/shop`에서 노출 (회귀) | 수동 |
| V8 | USER 권한으로 `/betting`, `/shop`, `/wallet` 진입 시 401 없음 (회귀) | 수동 |
| V9 | Discord OAuth 로그인 회귀 정상 | 수동 |
| V10 | logout 호출 → 쿠키 clear + 모든 페이지 미인증 | 수동 |

### 우선순위 2 — Phase 5 정리 (대규모 작업, 별도 계획 권장)

- `GamesModule` 삭제 + 관련 소켓 게이트웨이
- 프론트엔드 사용자용 페이지 폐기: `/betting`, `/shop`, `/wallet`, `/ranking`, `/utility/quiz`, `/gallery/*`, `/profile/shop`
- `ClanMember.totalPoints/lockedPoints` 컬럼 DROP (단일 클랜 전환)
- 자체 회원가입 (`/signup`) 폐기 + Discord OAuth로 통합
- `/auth/login` JSON 응답 제거 (듀얼 발급 → 쿠키 단일화)
- `clanId` 의존 코드 제거 (80+ 파일)
- `passport-discord` deprecated → maintained alternative로 교체
- `MarketGateGuard` 캐시 무효화 정책 명확화
- socket.io 인증 쿠키 통일 (`use-auction-socket.ts`, `use-quiz-socket.ts`)
- admin spec 추가 (현재는 빌드 + 수동 검증만)
- Swagger 데코레이터 일괄 부착
- 차트용 `GET /admin/ledger/timeseries?bucket=day&days=30` endpoint 추가 (현재 클라이언트 합산 fallback)

### 우선순위 3 — Discord 봇 실 환경 활성화 (사용자 작업)

`backend/.env`:
```
DISCORD_BOT_ENABLED=true
DISCORD_BOT_TOKEN=<Discord Developer Portal → Bot → Reset Token>
DISCORD_CLIENT_ID=<Application ID>
DISCORD_CLIENT_SECRET=<OAuth2 → Client Secret>
DISCORD_GUILD_ID=<우리 모임 길드 ID>
DISCORD_OAUTH_ENABLED=true
DISCORD_OAUTH_REDIRECT_URI=https://potg.joonbi.co.kr/auth/discord/callback
```

봇 권한 (OAuth2 URL Generator):
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Use Slash Commands`

---

## 4. 주의사항

### Entity 변경 규칙
- Entity 수정 시 `docs/ERD.md` 동시 갱신 (`CLAUDE.md` 명시)
- 마이그레이션 작성 후 SYNC_SCHEMA=true 임시 허용 또는 `migration:generate`로 재생성

### DB 초기 부트
- `Baseline.ts`는 placeholder. 클린 DB 첫 부트는:
  1. `SYNC_SCHEMA=true npm run start:dev` 1회 (entities로 스키마 생성), 또는
  2. `npm run migration:run` (현재 3 파일 체인 적용)
- 운영 배포 전 통합 baseline 재생성 권장 (REPORT-phase2 리스크 1)

### 회계 무결성
- User.pointsBalance 직접 UPDATE 금지. 반드시 `LedgerService.transfer/mint/burn` 경유
- `LedgerService.computeBalanceFromLedger(userId)` 로 PointTx 합 vs 캐시 일치 검증 가능

### 인증 (Phase 4.2 변경)
- **HTTP 인증은 HttpOnly 쿠키 기반**. localStorage 토큰 코드는 더 이상 없음
- `/auth/login`은 쿠키 + JSON 듀얼 발급 (Phase 5에서 JSON 제거 예정)
- Discord OAuth 콜백 쿠키 maxAge는 1시간, 자체 로그인은 7일 — 비대칭. 운영 후 정책 통일 권장
- AuthContext는 마운트 시 `/auth/profile` 401 여부로 세션 판단
- socket.io는 여전히 localStorage 의존 패턴이나, 현재 localStorage가 빈 상태라 핸드셰이크는 쿠키만으로 동작 (Phase 5에서 명시적 정리)

### 알려진 사전 존재 실패 테스트 (Phase 1부터 동일)
- `test/unit/auth/auth.service.spec.ts` — JWT 환경변수/EmailService DI 미주입
- `src/modules/posts/posts-bulk-like.service.spec.ts` — ClanMemberRepository DI 누락
- `test/app.e2e-spec.ts` — uuid ESM 트랜스폼
- Phase 5 정리에서 수렴 예정. 현 작업과 무관.

### Lint 기존 이슈 (admin 외부)
- `bottom-nav.tsx`, `image-viewer.tsx`, `participant-panel.tsx`, `quiz-game.tsx`, `use-quiz-socket.ts`, `edit-vote-modal.tsx` — Phase 5 사용자 페이지 폐기 시 자연 해소

### 결정 사항 누적 (.pipeline/status.json 참조)
- **RANK 마켓 정산**: `winningOption='1'` 단순화 (정책 모호 — Phase 5에서 재정의)
- **BettingStake UNIQUE 미적용**: (market_id, user_id, side) — 서비스 합산 로직만 사용
- **/구매 MarketGate**: 공통 `MarketGateService` 추출
- **passport-discord deprecated**: Phase 5에서 교체
- **Components V2**: embed fallback, discord.js 정식 지원 시 `buildProductCard`만 교체
- **DataTable**: 자체 작성 (Shadcn `@tanstack/react-table` 미설치). 단순 페이지네이션만 필요
- **timeseries endpoint 미구현**: 대시보드 차트는 `/admin/ledger?take=200` 합산 fallback (Phase 5에서 dedicated endpoint 추가)

---

## 5. 파일 맵

### Phase 4.2 신규 (관리자)
```
backend/src/modules/shop/
└── admin-products.controller.ts        # Phase 4.2-T8

frontend/src/app/admin/
├── layout.tsx                          # AdminGuard + Sidebar
├── page.tsx                            # 대시보드 (recharts)
├── attendance/page.tsx
├── config/page.tsx
├── ledger/page.tsx
├── matches/page.tsx
├── matches/[id]/page.tsx
├── matches/[id]/settle/page.tsx
├── members/page.tsx
├── orders/page.tsx
└── products/page.tsx

frontend/src/modules/admin/
├── api/                                # axios 클라이언트
│   ├── attendance.ts
│   ├── config.ts
│   ├── ledger.ts
│   ├── matches.ts
│   ├── members.ts
│   └── shop.ts
├── components/
│   ├── admin-guard.tsx
│   ├── admin-sidebar.tsx
│   ├── data-table.tsx                  # 자체 구현
│   └── empty-state.tsx
├── hooks/
│   ├── use-paged-query.ts
│   └── use-admin-mutation.ts
└── schemas/                            # zod
    ├── config-update.schema.ts
    ├── match-create.schema.ts
    └── member-adjust.schema.ts
```

### 기존 백엔드 모듈
```
backend/src/modules/
├── ledger/                             # 복식부기 원장
├── matches/                            # 내전 상태머신
├── system-config/                      # 경제 파라미터
├── discord-bot/                        # Phase 3
└── shop/
    ├── shop.controller.ts              # 사용자용
    └── admin-products.controller.ts    # Phase 4.2 신규
```

### 파이프라인 산출물
```
.pipeline/
├── requirement.md
├── plan.md, plan-phase3.md, plan-phase4.md
├── plan-phase4.2.md                    # Phase 4.2 실행계획 (신규)
├── status.json                         # SSOT
├── reviews/plan-review.md
├── REPORT-phase2.md, REPORT-phase3.md, REPORT-phase4.1.md
```

---

## 6. 빠른 시작 (다음 세션 진입자용)

```bash
# 1. 현재 상태 확인
cat .pipeline/status.json | head -50
git log --oneline -10

# 2. 빌드 확인
cd backend && npm run build
cd frontend && npm run build

# 3. 신규 spec 확인 (15개 PASS 기대)
cd backend && npx jest --testPathPatterns='ledger.service.spec|betting.service.spec|discord-member.service.spec'

# 4. Phase 4.2 수동 검증
# 브라우저에서 ADMIN 계정으로 로그인 → /admin 진입 → §3 시나리오 V1~V10

# 5. Phase 5 착수 (대규모 정리)
# 사용자 페이지 폐기 + socket.io 인증 통일 + clanId 제거 등
# 별도 계획 수립 권장: /plan "Phase 5 정리"
```
