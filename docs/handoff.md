# POTG Discord 리팩토링 — 세션 핸드오프

> 최종 갱신: 2026-05-22
> 진행 상태: **Phase 1 → 5-C 완료 / 잔여 백로그 → Phase 5-D 이후**
> 운영 배포 환경 없음 → **테스트 커버리지로 회귀 보장**

---

## 1. 한눈에 보기

| Phase | 상태 | 커밋 | 주요 산출 |
|-------|------|------|-----------|
| 1. 기반 (Entity + Migration) | ✅ | `2a0a0e1` | TypeORM 마이그레이션 인프라, PointTx/Match/BettingMarket 등 신규 엔티티 |
| 2. 핵심 로직 | ✅ | `2a0a0e1` | LedgerService, BettingService, ShopService, MatchService, MarketGate |
| 3. Discord Bot + OAuth2 | ✅ | `8ab9dd4`, `f81f0eb` | discord.js 14.26, 슬래시 명령 7종, passport-discord |
| 4.1. 백엔드 admin API | ✅ | `f226e0d` | /admin/matches, members, attendance, config, ledger |
| 4.2-T1. 인증 통합 | ✅ | `d9ca612` | HttpOnly 쿠키 통일, JwtStrategy 듀얼 extractor, /auth/logout |
| 4.2-T2~T12. admin 페이지 | ✅ | `b57e078` | /admin 11종 페이지 (Next.js 16 + TanStack Query + recharts) |
| 4.2-TEST. 단위 테스트 | ✅ | `384c6c8` | 신규 spec 5종 (48 케이스) + 기존 spec 복구 |
| 5-A. 프론트 사용자 페이지 폐기 | ✅ | `9c6538d` | betting/shop/wallet/ranking/quiz/gallery/signup 삭제 (−5732 LOC) |
| 5-B. Games 백엔드 + 인증 마무리 | ✅ | `b278509` | Games 모듈 제거, /auth/register 제거, WS 쿠키 가드 (−4891 LOC) |
| 5-C. 단일 클랜 전환 | ✅ | `800123d` | ClanMember 포인트 컬럼 DROP, clanId HTTP 흐름 제거 |
| 5-D 이후 | ⏳ | — | 백로그 §7 참조 |

**현재 검증 상태**:
- backend build ✅
- frontend build ✅
- **unit test 103/103 PASS** (suite 14개)
- integration/e2e 8 suite 실패 — **DB 미연결 환경 이슈** (회귀 아님, 운영 DB 띄우면 회복)
- lint: 폐기 외 잔여 3 error (Phase 6 처리)

---

## 2. 아키텍처 현황 (반드시 숙지)

### 2.1 도메인 SSOT (Single Source of Truth)

| 도메인 | SSOT | 비고 |
|--------|------|------|
| 포인트 잔액 | `User.pointsBalance` (BigInt) | `LedgerService.computeBalanceFromLedger`로 PointTx 합 검증 가능 |
| 회계 원장 | `PointTx` (복식부기) | `LedgerService.mint/burn/transfer` 경유. 직접 UPDATE 금지 |
| 내전 상태 | `Match.status` 상태머신 | DRAFT → BETTING_OPEN → LOCKED → SETTLED (또는 CANCELLED) |
| 인증 토큰 | HttpOnly 쿠키 `access_token` | localStorage 사용 안 함. WS도 쿠키 우선 |
| 디스코드 가입 | `User.discordId` (unique) | `DiscordMemberService.findOrCreate` 멱등 |
| 베팅 잠금 | `BettingStake.amount` 합산 | UNIQUE 미적용 (서비스 합산 로직 사용) |

### 2.2 인증 흐름

```
[자체 로그인]
POST /auth/login (username/password)
  → 백엔드: HttpOnly 쿠키 set + { ok: true } 응답 (JSON token 제거됨, Phase 5-B)
  → 프론트: AuthContext가 GET /auth/profile로 user 정보 fetch

[Discord OAuth]
GET /auth/discord (passport-discord 리다이렉트)
GET /auth/discord/callback
  → HttpOnly 쿠키 set (maxAge 1시간) + DISCORD_OAUTH_SUCCESS_REDIRECT로 리다이렉트

[로그아웃]
POST /auth/logout
  → res.clearCookie('access_token')

[JWT 추출 우선순위]
1. 쿠키 access_token (cookieExtractor)
2. Authorization: Bearer <token>  (레거시 호환)

[WS 인증 (auction socket)]
handshake.headers.cookie → access_token 파싱 (1순위)
  → handshake.auth.token / Authorization Bearer / query token (fallback)
```

⚠️ Discord 콜백 쿠키 maxAge=1시간, 자체 로그인=7일. **비대칭 유지 중** — 일관성은 후속 작업.

### 2.3 폴더 구조 (현재)

```
backend/src/
├── modules/
│   ├── auth/                 # 자체 로그인 + OAuth + forgot/reset password
│   ├── users/                # admin-users.controller (잔액 조정)
│   ├── ledger/               # PointTx, LedgerService (mint/burn/transfer)
│   ├── matches/              # 내전 상태머신 + admin/matches API
│   ├── betting/              # BettingMarket + Stake (패리뮤추얼)
│   ├── shop/                 # ShopProduct + admin-products.controller
│   ├── system-config/        # 경제 파라미터 KV
│   ├── attendance/           # 출석 + xlsx 업로드
│   ├── discord-bot/          # 슬래시 명령 7종
│   ├── clans/                # Clan, ClanMember (membership/role만, 포인트 컬럼 없음)
│   ├── auctions/             # 경매 (admin이 활용)
│   ├── community/, posts/, votes/, blind-date/, profiles/, overwatch/, scrim-results/, attendance/, my-info/, uploads/, wallet/
│   └── (Games 모듈 삭제됨)
├── database/migrations/      # 4개 파일 (baseline + Phase1/2 + Phase5-C)
└── common/
    ├── guards/{jwt-auth,ws-jwt,roles,market-gate}.guard.ts
    └── services/market-gate.service.ts

frontend/src/
├── app/
│   ├── admin/                # ★ Phase 4.2 산출물 (11개 페이지)
│   ├── auction/              # 내전 운영 (admin이 활용)
│   ├── clan/                 # 클랜 관리
│   ├── community/, my-info/, overwatch/, profile/[memberId]/, vote/
│   ├── login/, forgot-password/, reset-password/
│   ├── utility/              # quiz 제외, 나머지 진입 허브
│   ├── page.tsx              # 홈 (대시보드)
│   └── (betting, shop, wallet, ranking, signup, gallery, profile/shop, utility/quiz 삭제됨)
├── modules/
│   ├── admin/                # api/components/hooks/schemas
│   ├── auction/, attendance/, blind-date/, chat/, clan/, community/, my-info/, overwatch/, profiles/, scrim-result/, user/, utility/, vote/
│   └── (betting/, shop/, wallet/, games/ 의 페이지 전용 파일 삭제. 모듈 폴더는 잔여 빈 디렉토리 있을 수 있음)
└── common/components/ui/     # Shadcn (수정 금지)
```

---

## 3. 테스트 현황 (중요 — 배포 불가 환경이라 회귀 방어선)

### 3.1 통과 spec (총 124 → 103, Phase 5-B에서 register/games 21개 정상 감소)

```
src/app.controller.spec.ts                                ✅
src/modules/attendance/attendance-upload.controller.spec.ts ✅  96% cov
src/modules/auth/auth.controller.spec.ts                  ✅  ~63% cov
src/modules/betting/betting.service.spec.ts               ✅
src/modules/discord-bot/discord-member.service.spec.ts    ✅
src/modules/ledger/ledger.service.spec.ts                 ✅
src/modules/matches/match.service.spec.ts                 ✅  76% cov
src/modules/posts/posts-bulk-like.service.spec.ts         ✅  (Phase 4.2에서 복구)
src/modules/profiles/profiles-equip.service.spec.ts       ✅
src/modules/shop/admin-products.controller.spec.ts        ✅  94% cov
src/modules/shop/shop-profile-items.service.spec.ts       ✅
src/modules/users/admin-users.controller.spec.ts          ✅  잔액 조정 Ledger 경유 검증
test/unit/auth/auth.service.spec.ts                       ✅  bcrypt jest.mock 패턴 적용
test/unit/clans/clans.service.spec.ts                     ✅
```

### 3.2 실패 spec (전부 DB 환경 의존)

```
test/integration/auctions/auction-flow.e2e-spec.ts        DB 미연결
test/integration/auth/auth-flow.e2e-spec.ts               DB 미연결
test/integration/betting/betting-flow.e2e-spec.ts         DB 미연결
test/integration/clans/clan-flow.e2e-spec.ts              DB 미연결
test/integration/scrims/scrim-flow.e2e-spec.ts            DB 미연결
test/integration/votes/vote-flow.e2e-spec.ts              DB 미연결
test/app.e2e-spec.ts                                      DB 미연결
```

**다음 세션 진입자**: PostgreSQL 띄우고 SYNC_SCHEMA=true 또는 `npm run migration:run` 후 재실행하면 회복 예상. 단, 일부는 fixture/seed가 필요할 수 있음.

### 3.3 커버리지 (unit only)
- 전체: ~21% statements
- 신규 핵심 모듈은 60~96%로 잘 커버됨
- 미커버 영역 (Phase 6 백로그):
  - `system-config.controller/service` (각 0/25%)
  - `ledger.controller` (filter parsing/summary)
  - `match.controller` (service 위임 검증)
  - `auth.service.forgotPassword/resetPassword` (이미 커버, 더 broaden)
  - Discord bot command spec
  - 프론트엔드 (vitest/RTL 미설치)

---

## 4. 최근 변경 상세 (Phase 4.2 ~ 5-C, 다음 세션 진입 시 머리에 넣어야 할 컨텍스트)

### 4.1 인증 모델 (Phase 4.2-T1, 5-B)

**변경 전**:
- 프론트: localStorage.access_token → axios Authorization 헤더
- 백엔드: ExtractJwt.fromAuthHeaderAsBearerToken
- `/auth/login` 응답: `{ access_token: '...' }`

**변경 후 (현재)**:
- 프론트: `withCredentials: true` 만, localStorage 사용 안 함
- AuthContext가 마운트 시 `/auth/profile` 호출로 세션 판단
- 백엔드 JwtStrategy: `fromExtractors([cookieExtractor, fromAuthHeaderAsBearerToken()])` — 쿠키 우선, Bearer fallback (레거시 호환용)
- `/auth/login` 응답: `{ ok: true }` (JSON token 제거됨)
- WS 가드 `ws-jwt.guard.ts`: handshake.headers.cookie 파싱 1순위
- `POST /auth/logout`: `res.clearCookie('access_token')` + 200

**잔여 호환**:
- Bearer fallback은 유지 (Phase 6에서 완전 제거 가능)
- Discord OAuth 콜백 쿠키 maxAge=1시간 vs 자체 로그인=7일 — **비대칭** (운영 시 통일 권장)

### 4.2 관리자 페이지 (Phase 4.2)

**경로 11개**:
```
/admin                     대시보드 (mint/burn/circulating + recharts AreaChart + 최근 PointTx)
/admin/matches             목록 + 생성
/admin/matches/[id]        상세 + 상태 전이 버튼
/admin/matches/[id]/settle 정산 입력 (winnerTeamId + placements)
/admin/members             페이징 목록 + role 변경 + 잔액 조정
/admin/ledger              PointTx 필터/페이징 + 발행/소각/유통량 요약
/admin/products            상품 CRUD + 재고/가격 인라인 편집
/admin/orders              주문 목록 + 전달/취소
/admin/attendance          xlsx 업로드 + 행별 결과
/admin/config              SystemConfig KV 인라인 편집
```

**공통 모듈** (`frontend/src/modules/admin/`):
- `api/{matches,members,attendance,config,ledger,shop}.ts` — axios 클라이언트
- `components/{admin-guard,admin-sidebar,data-table,empty-state}.tsx` — Shadcn UI 재사용 + 자체 DataTable
- `hooks/{use-paged-query,use-admin-mutation}.ts`
- `schemas/{match-create,member-adjust,config-update}.schema.ts` — zod

**가드**: `admin/layout.tsx`의 `<AdminGuard>`가 클라이언트에서 ADMIN role 확인. 미인증 → `/login`, USER → `/`

### 4.3 폐기된 페이지/모듈 (Phase 5-A, 5-B)

**프론트 페이지 삭제**:
```
/betting, /betting/my-bets
/shop
/profile/shop
/wallet
/ranking
/utility/quiz
/gallery (전체)
/signup
```

**프론트 모듈 삭제 (페이지 전용 파일)**:
```
modules/betting/participant-panel.tsx
modules/shop/components/product-card.tsx
modules/wallet/components/{send-points-form,transaction-history}.tsx + types.ts
modules/games/components/quiz/* + hooks/use-quiz-socket.ts + types.ts
```

**백엔드 삭제**:
```
backend/src/modules/games/ (전체 — gateway, services, 9개 entity)
auth.controller#register
auth.service#register
RegisterDto
```

**네비게이션 수정**:
- header, bottom-nav, dashboard 카드들, utility 허브 페이지, my-info, login 페이지에서 폐기 링크 제거

### 4.4 단일 클랜 전환 (Phase 5-C)

**Entity 변경** (마이그레이션 `1747900005000-Phase5CDropClanMemberPoints`):
- `clan_members` 테이블에서 `total_points`, `locked_points` 컬럼 DROP
- ClanMember entity에서 두 필드 제거
- 롤백: 두 컬럼을 default 0으로 ADD (단, 이전 잔액 데이터 복구 불가 — SSOT는 PointTx)

**서비스 변경**:
- `ShopService.findAll/createProduct`: clanId 필터 제거
- `ScrimResultsService`: clanId 의존 제거
- `ClansService`: clanId 관련 분기 정리
- `AuthController/Service`: 응답에서 clanId 처리 정리

**프론트**:
- `ClanMember.totalPoints`를 optional로 (`types.ts`)
- `member-row.tsx`, `use-clan-manage.ts`, `clan-stats-row.tsx`: undefined 안전 처리 (`?? 0`)
- `admin/members/page.tsx`, `admin/api/members.ts`: clanId 의존 제거
- `context/auth-context.tsx`: clanId 처리 정리

**의도적으로 유지된 것** (제거 금지):
- `Clan`, `ClanMember` Entity 자체 (멤버십 + role 정보 필요)
- Entity FK `clanId` 컬럼 (post.entity, vote.entity, blind-date-listing.entity 등) — **데이터 관계** 용도
- forgot/reset-password 경로 (기존 회원 락아웃 방지)

---

## 5. 마이그레이션 현황

```
backend/src/database/migrations/
├── 1747900000000-Baseline.ts                       placeholder (실제 스키마는 entities로)
├── 1747900001000-Phase1DiscordRefactor.ts          PointTx, Match/Team, BettingMarket/Stake, MarketOrder, SystemConfig, User 확장
├── 1747900002000-Phase2CoreLogic.ts                폐기 4종 DROP (PointLog, BettingQuestion, BettingTicket, ShopPurchase)
└── 1747900005000-Phase5CDropClanMemberPoints.ts    ClanMember 포인트 컬럼 DROP
```

**클린 DB 부팅** 절차:
1. PostgreSQL 띄우고 .env 설정
2. 둘 중 택일:
   - `SYNC_SCHEMA=true npm run start:dev` 1회 (entities 기반 스키마 생성)
   - `npm run migration:run` (4개 체인 적용 — Baseline placeholder 때문에 첫 케이스 추천)

운영 배포 전 통합 baseline 재생성 권장.

---

## 6. 환경 변수 (Discord 봇 실 활성화 시 사용자 작업)

`backend/.env`:
```
# DB
DATABASE_URL=postgresql://...
SYNC_SCHEMA=false       # 운영. 개발 클린 부팅 시 true

# JWT
JWT_SECRET=<강력한 키>
NODE_ENV=development|production

# Discord 봇
DISCORD_BOT_ENABLED=true
DISCORD_BOT_TOKEN=<Developer Portal → Bot → Reset Token>
DISCORD_CLIENT_ID=<Application ID>
DISCORD_CLIENT_SECRET=<OAuth2 → Client Secret>
DISCORD_GUILD_ID=<우리 모임 길드 ID>

# Discord OAuth (웹 로그인)
DISCORD_OAUTH_ENABLED=true
DISCORD_OAUTH_REDIRECT_URI=https://potg.joonbi.co.kr/auth/discord/callback
DISCORD_OAUTH_SUCCESS_REDIRECT=/  # 콜백 후 리다이렉트 (옵션)
```

봇 권한 (OAuth2 URL Generator):
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Use Slash Commands`

활성화 후 길드 초대 → 백엔드 재시작 → 슬래시 명령 자동 등록 (길드 즉시 반영).

---

## 7. 다음 세션 백로그

### 우선순위 1 — 운영 환경 셋업 (수동 검증 가능해지면 즉시)
1. PostgreSQL + 마이그레이션 4개 적용
2. `.env` 채우기 + Discord 봇 활성화
3. **수동 검증 시나리오** (계획서 `.pipeline/plan-phase4.2.md` §8 V1~V10):
   - V1: 비로그인 → `/admin` → `/login` 리다이렉트
   - V2: ADMIN 로그인 → `/admin` 대시보드 카드 표시
   - V3: 회원 잔액 +5000 조정 → ledger에서 ADMIN_ADJUST 확인
   - V4: 내전 생성 → 팀 2 → OPEN → LOCK → settle → SETTLED
   - V5: 출석 xlsx 업로드 (3행 중 1행 잘못된 discord_id) → 1행 fail
   - V6: config `BET_RAKE_RATE` 변경 후 재조회 반영
   - V7: 상품 등록 → 디스코드 `/상점`에서 노출 (회귀 → 봇 활성화 필요)
   - V8: 디스코드 봇 `/잔액 /출석 /베팅 /구매` 전체 흐름
   - V9: Discord OAuth 로그인
   - V10: logout → 쿠키 clear + 401

### 우선순위 2 — Phase 5-D (잔여 정리)
1. **passport-discord deprecated 교체** — maintained alternative 조사 (passport-discord-token? 직접 구현?)
2. **Swagger 데코레이터** 일괄 부착 (admin 라우트 전체)
3. **`GET /admin/ledger/timeseries?bucket=day&days=30`** endpoint 추가 (현재 대시보드는 클라이언트 합산 fallback)
4. **Bearer fallback 제거** — JwtStrategy/WS guard에서 쿠키만 (호환 마이그레이션 완료 후)
5. **Discord OAuth 쿠키 maxAge 통일** (현재 1시간 vs 자체 7일)

### 우선순위 3 — Phase 6 (테스트/품질)
1. **system-config / ledger.controller / match.controller spec** 추가
2. **integration test DB 환경** 셋업 (CI에 docker-compose Postgres)
3. **프론트엔드 테스트 인프라** (vitest + RTL)
4. **admin E2E** (Playwright 옵션)
5. **잔여 lint 3 error** 처리 (폐기 외 기존 파일)

### 우선순위 4 — Phase 6-X (선택)
1. Entity FK `clanId` 정리 — 단일 클랜이라 무의미한 컬럼이지만 데이터 관계. 가치 낮음
2. `MarketGateGuard` 캐시 무효화 정책 명확화
3. RANK 마켓 정산 정책 재정의 (현재 `winningOption='1'` 단순화)
4. BettingStake UNIQUE 적용 검토
5. Components V2: discord.js 정식 지원 시 `buildProductCard` 교체

---

## 8. 주의사항 (자주 잊는 것)

### 회계 무결성 (CRITICAL)
- `User.pointsBalance` 직접 UPDATE 금지. **반드시 `LedgerService.transfer/mint/burn` 경유**
- `LedgerService.computeBalanceFromLedger(userId)`로 PointTx 합 vs 캐시 일치 검증 가능
- admin 잔액 조정 (`POST /admin/members/:id/adjust`)도 LedgerService 경유 — 직접 SQL 금지
- `admin-users.controller.spec.ts`가 이를 보장 (mint/burn 호출 검증)

### Entity 변경 규칙
- Entity 수정 시 `docs/ERD.md` (있다면) 동시 갱신 — CLAUDE.md 명시
- 마이그레이션 작성 (entity 변경만 하고 마이그레이션 없으면 prod 깨짐)
- 신규 마이그레이션 파일명: `{timestamp}-{PascalCaseName}.ts`. timestamp는 이전 것보다 커야 함

### 인증 디버깅
- 401이 자꾸 뜨면:
  1. 브라우저 DevTools → Application → Cookies에 `access_token` 있는지
  2. `withCredentials: true` 설정 확인 (`lib/api.ts`)
  3. 백엔드 `cookieParser()` 미들웨어 등록 확인 (`main.ts`)
  4. JwtStrategy의 `cookieExtractor`가 `req.cookies.access_token` 읽는지

### lint 잔여 (admin 외)
폐기되지 않은 기존 파일에 setState-in-effect 등 3개 error 잔존. Phase 6에서 처리 권장.

### 결정 사항 누적 (`.pipeline/status.json` 참조)
- **RANK 마켓 정산**: `winningOption='1'` 단순화 (정책 모호)
- **BettingStake UNIQUE 미적용**: (market_id, user_id, side) — 서비스 합산만 사용
- **Components V2**: embed fallback, discord.js 정식 지원 시 builder만 교체
- **passport-discord deprecated**: 교체 백로그
- **인증 듀얼 (cookie+Bearer)**: Phase 5-B에서 JSON token은 제거됐으나 Bearer extractor는 유지 (WS 등 fallback)

---

## 9. 파일 맵 (다음 세션 진입 시 IDE 북마크 추천)

### 백엔드 핵심
```
backend/src/
├── app.module.ts                                          # 모듈 등록 SSOT
├── main.ts                                                # cookieParser, CORS 설정
├── common/
│   ├── guards/{jwt-auth,ws-jwt,roles,market-gate}.guard.ts
│   └── services/market-gate.service.ts
├── modules/auth/
│   ├── auth.controller.ts                                 # /login (쿠키), /logout, /discord, /profile
│   ├── auth.service.ts                                    # validateUser, login, forgot/reset password
│   ├── jwt.strategy.ts                                    # cookieExtractor + Bearer fallback
│   └── auth.controller.spec.ts                            # 쿠키 발급/로그아웃 검증
├── modules/ledger/
│   ├── ledger.service.ts                                  # mint/burn/transfer (회계 핵심)
│   ├── ledger.controller.ts                               # /admin/ledger
│   └── entities/point-tx.entity.ts                        # 원장
├── modules/matches/
│   ├── match.service.ts                                   # 상태머신 (76% spec cov)
│   └── match.controller.ts                                # /admin/matches
├── modules/users/
│   └── admin-users.controller.ts                          # 잔액 조정 (Ledger 경유)
├── modules/shop/
│   ├── shop.controller.ts                                 # 사용자용 (디스코드 봇이 사용)
│   ├── admin-products.controller.ts                       # /admin/products
│   └── admin-products.controller.spec.ts                  # 94% cov
├── modules/discord-bot/                                   # 슬래시 명령 7종
└── database/migrations/                                   # 4개 파일
```

### 프론트엔드 핵심
```
frontend/src/
├── app/admin/                                             # ★ 관리자 UI 11종
│   ├── layout.tsx                                         # AdminGuard + Sidebar
│   └── page.tsx                                           # 대시보드 (recharts)
├── modules/admin/                                         # 관리자 공통 모듈
├── context/auth-context.tsx                               # /auth/profile 기반 세션 판단
├── lib/api.ts                                             # axios + withCredentials
└── providers/query-provider.tsx                           # TanStack Query
```

### 파이프라인 산출물
```
.pipeline/
├── requirement.md
├── plan.md, plan-phase3.md, plan-phase4.md
├── plan-phase4.2.md                                       # admin 페이지 계획 + V1~V10
├── status.json                                            # SSOT
├── reviews/plan-review.md
├── REPORT-phase2.md, REPORT-phase3.md, REPORT-phase4.1.md
```

---

## 10. 빠른 시작 (다음 세션 진입자용)

```bash
# 1. 상태 파악
cd /c/Users/USER/dev/potg
git log --oneline -12
cat docs/handoff.md | head -100

# 2. 빌드 검증
cd backend && npm run build
cd frontend && npm run build

# 3. 단위 테스트 (DB 불요)
cd backend && npx jest --testPathIgnorePatterns='test/integration' --testPathIgnorePatterns='test/app.e2e'
# 기대: 103/103 PASS, 14 suites

# 4. integration 테스트 (DB 필요)
# docker-compose up postgres 또는 로컬 PG 실행 후
cd backend && npm run migration:run  # 또는 SYNC_SCHEMA=true npm run start:dev
cd backend && npm run test:integration

# 5. 다음 작업 선택
# - 우선순위 1: 환경 셋업 + V1~V10 수동 검증
# - 우선순위 2: passport-discord 교체 / Swagger / timeseries endpoint
# - 우선순위 3: 테스트 보강 (system-config/ledger/match controller spec)
# - 우선순위 4: 잔여 lint / Entity FK 정리

# 6. 새 작업 시작 시 (계획부터)
# /plan "원하는 작업"
# 또는 /go "원하는 작업"으로 자동 파이프라인
```

---

## 11. 변경 회피 가이드 (실수 방지)

| 절대 건드리지 말 것 | 이유 |
|--------------------|------|
| `frontend/src/common/components/ui/*` | Shadcn UI — 수정 시 일관성 파괴 |
| `backend/src/modules/*/*.entity.ts` (마이그레이션 없이) | DB 스키마 — 마이그레이션 동반 필수 |
| `.env`, `.env.local` | 시크릿 — 커밋 금지 |
| `node_modules/`, `dist/`, `.next/` | 빌드 산출물 |
| `frontend/src/app/admin/*`, `frontend/src/modules/admin/*` | Phase 4.2 산출물 — 다른 작업 중이면 보호 |
| LedgerService 직접 호출 외의 잔액 변경 코드 | 회계 무결성 |
| `Clan`, `ClanMember` Entity 자체 | 멤버십/role 정보 필요 (포인트 컬럼만 제거됨) |

| 변경 시 동반 작업 필수 | 동반 사항 |
|----------------------|---------|
| Entity 추가/변경 | 마이그레이션 작성 + ERD 갱신 + 기존 spec 영향 검토 |
| auth 흐름 변경 | auth.controller.spec + auth.service.spec 갱신 |
| 신규 admin API | RolesGuard + ADMIN, spec 추가 권장 |
| Phase 백로그 항목 진입 | `.pipeline/`에 plan 작성 권장 |

---

이 핸드오프는 **세션 종료 직전에 작성됨**. 다음 진입자가 컨텍스트를 100% 복원할 수 있도록 의도적으로 상세하게 기술. 짧게 줄이지 말 것 — 운영 배포가 없는 환경에서 문서가 유일한 외부 메모리.
