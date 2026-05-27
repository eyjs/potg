# POTG Discord 리팩토링 — 세션 핸드오프

> 최종 갱신: 2026-05-26 (런칭 Phase + Step UI + DM + Streak 보너스 완료)
> 진행 상태: **Phase 1 → 7 + 런칭 인프라 (P0/P1) + Discord 봇 UX 전면 개편 완료**
> 운영 배포 환경 없음 → **테스트 커버리지 + knip으로 회귀/잔재 방어**

---

## 1. 한눈에 보기

| Phase | 상태 | 커밋 | 주요 산출 |
|-------|------|------|-----------|
| 1. 기반 (Entity + Migration) | ✅ | `2a0a0e1` | TypeORM 마이그레이션 인프라, PointTx/Match/BettingMarket 등 신규 엔티티 |
| 2. 핵심 로직 | ✅ | `2a0a0e1` | LedgerService, BettingService, ShopService, MatchService, MarketGate |
| 3. Discord Bot + OAuth2 | ✅ | `8ab9dd4`, `f81f0eb` | discord.js 14.26, 슬래시 명령 7종 |
| 4.1. 백엔드 admin API | ✅ | `f226e0d` | /admin/matches, members, attendance, config, ledger |
| 4.2-T1. 인증 통합 | ✅ | `d9ca612` | HttpOnly 쿠키 통일, JwtStrategy 듀얼 extractor, /auth/logout |
| 4.2-T2~T12. admin 페이지 | ✅ | `b57e078` | /admin 11종 페이지 |
| 4.2-TEST. 단위 테스트 | ✅ | `384c6c8` | 신규 spec 5종 + 기존 spec 복구 |
| 5-A. 프론트 사용자 페이지 폐기 | ✅ | `9c6538d` | betting/shop/wallet/ranking/quiz/gallery/signup 삭제 (−5732 LOC) |
| 5-B. Games 백엔드 + 인증 마무리 | ✅ | `b278509` | Games 모듈 제거, /auth/register 제거, WS 쿠키 가드 (−4891 LOC) |
| 5-C. 단일 클랜 전환 (포인트) | ✅ | `800123d` | ClanMember 포인트 컬럼 DROP, clanId HTTP 흐름 1차 |
| **5-D. 잔여 정리** | ✅ | `f0e4a35` | Bearer 제거, Discord OAuth 직접 구현 교체, Swagger, timeseries endpoint |
| **5-D.2. Dead code** | ✅ | `e54df05` | 24 dead files + 23 unused deps + wallet 슬림화 |
| **5-D.3. Track B-1** | ✅ | `e05aff1` | ws-jwt.guard 제거, ClanRolesGuard 단일 클랜 전제 |
| **5-D.4. Track B-3** | ✅ | `c7d97b6` | Entity clanId 9개 컬럼 DROP + 마이그레이션 + Service/Controller 단순화 |
| **5-D.5. Frontend 정리** | ✅ | `e24d7dd` | hooks/pages ?clanId= cosmetic cleanup |
| **6.1. lint config 확장** | ✅ | `506d314` | 잔여 unused/redundant-type 정리 |
| **6.2. lint error 0** | ✅ | `3050d6a` | unsafe-* / misused-promises / enum 비교 |
| **6.3. controller spec 추가** | ✅ | `70bd4ee` | system-config + match controller spec |
| **6.4. TS strict 강화** | ✅ | `10a1e5e` | noImplicitAny + strictBindCallApply + nullability 1차 |
| **6.5. Entity nullability 감사** | ✅ | `912657d` | 15 entity, 38 필드를 `T \| null`로 정정 |
| **7-A. Controller InjectRepository 제거** | ✅ | `367c611` | 5 controller → Service 위임, strict:true 활성, /context 통합 |
| **7-B5. 핵심 service spec 추가** | ✅ | `1e6fbd7` | auctions 24 tests + clans 26 tests (+50) |
| **7-B1. AuctionsService 분할** | ✅ | `0c51e4f` | 1168 → 626줄, BiddingService(435) + RoomStateService(202) |
| **7-B2. ClansService.getActivities 분리** | ✅ | `eca7e8a` | 130줄 → ClanActivityFeedService (180줄) |
| **7-A보강. 권한 helper 추출** | ✅ | `9ff79a8` | creatorId 체크 17건 → loadAsCreator(Tx) 통합 |
| **7-B3. 페이지네이션 상수화** | ✅ | `3f4b6cb` | DEFAULT_PAGE/PAGE_SIZE 공통 + 도메인 특화 2건 |
| **7-C5. knip dead code** | ✅ | `aa7eefc` | PointTxReason / SystemConfigKey 미사용 타입 제거 |
| **런칭 P0+P1 Stage 0~6** | ✅ | `b34be4c`~`88f3542` | JWT_SECRET 강제, helmet, /health, 채널 화이트리스트, 관리자 명령 5종, 음성출석, 자동 정산, 운영 가이드 |
| **런칭 Critical fix** | ✅ | `2a2ee11` | 정산 알림 SettleSummary 합산 + Voice attendance 무한 polling 방지 |
| **런칭 High C+F** | ✅ | `3f647bf` | createBettingScenario 트랜잭션화 + attendance SELECT FOR UPDATE 시리얼화 |
| **신규 명령 3종** | ✅ | `e2c8069` | /송금, /최근베팅, /팀나누기 (음성채널 인원 분할 + 자동 이동) |
| **팀나누기 단순화** | ✅ | `ceeb466` | 컨펌 버튼 + 현재 채널 재사용 + 빈 채널 자동 탐색 |
| **Step UI Pt.1** | ✅ | `e3cbb60` | /베팅 /관리-정산 → 3-step Select+Modal+Button (UUID 입력 제거) |
| **Step UI Pt.2 + 정산 DM** | ✅ | `6c52af2` | /구매 /순위예측 /관리-베팅마감 step UI + 베팅자 개인 DM (WON/LOST/REFUNDED) |
| **출석 streak 보너스** | ✅ | `4fe8553` | 3/5/10 연속 출석 자동 보너스 mint + STREAK_BONUS reason |
| **Frontend 정리 A+C** | ✅ | `c818758` | reset-password zod+RHF + vitest 인프라 도입 + schema 단위 테스트 5건 |
| **Frontend Phase A~C** | ✅ | (이번) | Tier 1 dead code 제거 + /login/security-settings RHF + admin API generic + map-randomizer custom hook (19 tests pass) |

**현재 검증 상태**:
- backend build ✅
- frontend build ✅
- **unit test 194 PASS + 1 skipped** (21 suites, +76 from baseline 118)
- integration/e2e 7 suite 실패 — DB 미연결 환경 이슈 (회귀 아님)
- lint: 0 error / 0 warning
- TS `strict: true` 전면 활성 (strictPropertyInitialization만 false — TypeORM 보호)
- Controller `@InjectRepository` 0건 / `throw new Error` 0건 / `any` 0건
- Entity nullability: 15 파일 38 필드 `T | null` (overwatch/replay/user는 `?:` 컨벤션 유지)
- knip: 의도적 false positive 외 0건 (마이그레이션/e2e/Shadcn UI/MainRole 보존)

**Phase 7 핵심 변경 요약**:
| Service | Before | After | Helper 신설 |
|---------|--------|-------|------------|
| auctions.service.ts | 1168줄 | 626줄 (∆ -542) | AuctionsBiddingService (435), AuctionsRoomStateService (202) |
| clans.service.ts | 641줄 | 497줄 (∆ -144) | ClanActivityFeedService (180) |

- facade 패턴 유지 — 외부 API 변경 0건 (gateway, controller, 다른 모듈 import 무영향)
- 권한 helper: `loadAsCreator` / `loadAsCreatorTx` (4줄 분기 → 1번 호출)
- 페이지네이션 매직넘버: `DEFAULT_PAGE` / `DEFAULT_PAGE_SIZE` 공통 상수

---

## 2. 아키텍처 현황 (반드시 숙지)

### 2.1 도메인 SSOT

| 도메인 | SSOT | 비고 |
|--------|------|------|
| 포인트 잔액 | `User.pointsBalance` (BigInt) | LedgerService.computeBalanceFromLedger 검증 |
| 회계 원장 | `PointTx` (복식부기) | LedgerService.mint/burn/transfer 경유 필수 |
| 내전 상태 | `Match.status` 상태머신 | DRAFT → BETTING_OPEN → LOCKED → SETTLED |
| 인증 토큰 | HttpOnly 쿠키 `access_token` | **쿠키 단일** (Bearer fallback 제거됨) |
| 디스코드 가입 | `User.discordId` (unique) | DiscordMemberService.findOrCreate 멱등 |
| 베팅 잠금 | `BettingStake.amount` 합산 | UNIQUE 미적용 |
| 클랜 멤버십 | `ClanMember.clanId` | 단일 클랜이라도 row는 유지 (membership 본질) |

### 2.2 인증 흐름 (5-D 갱신)

```
[자체 로그인]
POST /auth/login → HttpOnly 쿠키 set (7일) + { ok: true }
  → 프론트: AuthContext가 GET /auth/profile로 user 정보 fetch

[Discord OAuth — passport-discord 교체됨 (5-D)]
GET /auth/discord → DiscordOAuthService.getAuthUrl + state 쿠키(5분) + 302
GET /auth/discord/callback → DiscordOAuthGuard:
   1) state 쿠키 vs query.state timingSafeEqual 비교 (CSRF)
   2) code → access_token 교환 (axios)
   3) /users/@me 프로필 조회
   4) DiscordMemberService.findOrCreate (봇과 동일 멱등 경로)
   5) req.user에 User entity 주입
  → HttpOnly 쿠키 set (7일, 자체 로그인과 동일) + redirect

[JWT 추출]
JwtStrategy: cookieExtractor 단일 (Bearer fallback 제거)
WsJwtGuard: 삭제됨 (consumer 0 — auction.gateway는 accessCode 자체 인증)

[로그아웃]
POST /auth/logout → res.clearCookie('access_token')
```

### 2.3 단일 클랜 전환 완료 (5-C → 5-D.4)

**Entity 변경 누적**:
- 5-C: `ClanMember.{totalPoints, lockedPoints}` 컬럼 DROP (마이그레이션 1747900005000)
- 5-D.4: 9개 테이블에서 `clanId` 컬럼 + Clan FK 제거 (마이그레이션 1747900006000)
  - 대상: `posts`, `votes`, `shop_products`, `blind_date_listings`, `point_rules`,
    `announcements`, `clan_join_requests`, `hall_of_fame`, `replays`
  - **보존**: `clan_members.clanId` (멤버십 본질), `clans` 테이블

**HTTP 흐름**:
- ClanRolesGuard: request.clanId 추출 로직 제거 → userId만으로 ClanMember 조회
- Service/Controller/DTO에서 clanId 파라미터 정리 (attendance, shop, votes, posts, blind-date, profiles, clans, overwatch/replay)
- `/clans/:clanId/...` URL **prefix는 유지** (historical resource path, frontend 호환)
- JWT payload + AuthenticatedRequest.user.clanId **유지** (frontend가 user.clanId로 URL 생성)

### 2.4 폴더 구조 (현재)

```
backend/src/
├── modules/
│   ├── auth/                 # discord-oauth.service/guard (5-D 신규)
│   ├── users/                # admin-users.controller
│   ├── ledger/               # /admin/ledger/timeseries (5-D 추가)
│   ├── matches/              # 내전 상태머신
│   ├── betting/              # 패리뮤추얼
│   ├── shop/                 # ShopProduct (clanId 제거됨)
│   ├── system-config/        # 경제 파라미터 KV
│   ├── attendance/           # 출석 + xlsx 업로드
│   ├── discord-bot/          # 슬래시 명령 7종
│   ├── clans/                # 멤버십/role
│   ├── wallet/               # ranking + addPoints (5-D.2 슬림화)
│   ├── auctions/             # 경매 + auction.gateway
│   ├── posts/, votes/, blind-date/, profiles/, overwatch/, scrim-results/, uploads/, my-info/
├── database/migrations/      # 5개 파일 (Baseline + Phase1/2 + 5-C + 5-D.4)
└── common/
    ├── guards/{jwt-auth,roles,market-gate,clan-roles}.guard.ts  # ws-jwt 삭제됨
    └── services/market-gate.service.ts

frontend/src/
├── app/
│   ├── admin/                # Phase 4.2 산출물 (11개)
│   ├── auction/, clan/, community/, my-info/, overwatch/, profile/, vote/, utility/
│   ├── login/, forgot-password/, reset-password/
│   └── page.tsx              # 대시보드
├── modules/
│   ├── admin/, auction/, attendance/, blind-date/, chat/, clan/, community/, my-info/,
│   │   overwatch/, profiles/, scrim-result/, utility/, vote/
│   └── (betting, shop, wallet, games, user 모듈 삭제됨)
└── common/components/ui/     # Shadcn (수정 금지)
```

---

## 3. 테스트 현황

### 3.1 통과 spec (16 suites, 118 PASS + 1 skipped)

```
src/app.controller.spec.ts                                ✅
src/modules/attendance/attendance-upload.controller.spec  ✅  96% cov
src/modules/auth/auth.controller.spec                     ✅  쿠키/Discord/logout
src/modules/auth/discord-oauth.service.spec               ✅  5-D 신규
src/modules/betting/betting.service.spec                  ✅
src/modules/discord-bot/discord-member.service.spec       ✅
src/modules/ledger/ledger.service.spec                    ✅
src/modules/ledger/ledger.controller.spec                 ✅  5-D 신규 timeseries
src/modules/matches/match.service.spec                    ✅  76% cov
src/modules/posts/posts-bulk-like.service.spec            ✅
src/modules/profiles/profiles-equip.service.spec          ✅
src/modules/shop/admin-products.controller.spec           ✅  94% cov (1 skipped: clanId 필터 케이스)
src/modules/shop/shop-profile-items.service.spec          ✅
src/modules/users/admin-users.controller.spec             ✅  잔액 조정 Ledger 검증
test/unit/auth/auth.service.spec                          ✅
test/unit/clans/clans.service.spec                        ✅
```

### 3.2 실패 spec (DB 환경 의존)

```
test/integration/{auctions,auth,betting,clans,scrims,votes}/*.e2e-spec
test/app.e2e-spec
```

다음 진입자: PostgreSQL + `npm run migration:run` 후 재실행. fixture 필요할 수 있음.

### 3.3 커버리지 (unit only)
- 전체 ~22% statements
- 신규 핵심 모듈 60~96% 커버
- 미커버 (Phase 6 백로그):
  - `system-config.controller/service` (0/25%)
  - `match.controller`
  - 프론트엔드 (vitest/RTL 미설치)

---

## 4. 최근 변경 상세 (이번 세션 5개 커밋)

### 4.1 `f0e4a35` — Phase 5-D 잔여 정리

- **Bearer fallback 제거**: `jwt.strategy.ts` cookieExtractor 단일, `ws-jwt.guard.ts` 쿠키 1순위만
- **Discord 쿠키 maxAge 통일**: 1시간 → 7일, `buildAccessTokenCookieOptions(isProd)` 추출
- **passport-discord 교체**: deprecated 패키지 제거. 직접 구현 2파일 신규
  - `discord-oauth.service.ts` — getAuthUrl/exchangeCode/fetchProfile (axios)
  - `discord-oauth.guard.ts` — state CSRF (timingSafeEqual) + DiscordMemberService.findOrCreate
- **`/admin/ledger/timeseries`** endpoint 추가 (bucket=day, days 1~90 clamp)
  - 프론트 대시보드 `buildChartData` 제거 → 서버 집계 사용
- **Swagger 데코**: 7개 컨트롤러(admin 6 + auth) @ApiTags/@ApiOperation/@ApiCookieAuth 부착
  - `main.ts`: addBearerAuth → addCookieAuth('access_token')

### 4.2 `e54df05` — Dead code + 의존성 정리

- **프론트 dead 파일 24개 삭제**:
  - `components/dashboard/*` 7종 (페이지 폐기 후 잔재)
  - `modules/user/` 전체 (참조 0)
  - `modules/vote/components/{create,edit}-vote-modal, vote-card`
  - `modules/blind-date/{components/hero-card, types}`
  - `modules/profiles/{index, components/shop-item-card}`
  - `modules/scrim-result/components/scrim-ranking-table`
  - `modules/admin/components/empty-state, hooks/*, schemas/config-update`
  - `common/components/{action-buttons, toggle-filter}`
- **백엔드 unused export**: `IS_COMPONENTS_V2`, `POINT_TX_REASON` re-export, `PlacementDto`, `SyncProfileDto`, `SlashCommandDefinition`, overfast-api 내부 인터페이스
- **wallet 슬림화**: balance/send/history endpoint + 메서드 + DTO 제거. `ranking` + 내부 `addPoints`만 유지
- **의존성 제거**:
  - backend: `swagger-ui-express`, `@eslint/eslintrc`, `@types/uuid`, `source-map-support`, `ts-loader` / `multer` 명시 등록
  - frontend: radix 14종 + `cmdk`, `embla-carousel-react`, `input-otp`, `next-themes`, `react-day-picker`, `react-loading-skeleton`, `react-resizable-panels`, `vaul`, `tailwindcss-animate`, `autoprefixer`

### 4.3 `e05aff1` — Track B-1

- `ws-jwt.guard.ts` 삭제 (Games 폐기 후 consumer 0건)
- `ClanRolesGuard`: request.{params,body,query}.clanId 추출 로직 제거 → userId만으로 ClanMember 조회 (단일 클랜 전제)

### 4.4 `c7d97b6` — Track B-3 (DB schema 영구 변경)

- **Entity**: 9개 테이블에서 `clanId` 컬럼 + Clan FK 제거
- **마이그레이션** `1747900006000-Phase5D3DropClanIdFKs`:
  - FK/index 동적 탐색 후 안전 삭제
  - 롤백: nullable uuid 컬럼 복원 (이전 데이터 복구 불가 — 단일 클랜이라 무의미)
- **Service/Controller/DTO**:
  - `attendance`: clanId 파라미터 전부 제거
  - `shop.createProduct/findAll`: clanId 제거, CreateProductDto.clanId 제거
  - `votes.findAll`: clanId 제거, CreateVoteDto.clanId 제거
  - `posts.getCommunityFeed/getFeed/createPost`: clanId 제거
  - `blind-date.findAll/CreateListingDto`: clanId 제거
  - `profiles.getMemberIdByUserId(userId)`: 시그니처 축소
  - `clans.{getClanRequests, approve/reject, announcement, hallOfFame}`: 단일 클랜 전제
  - `overwatch/replay`: `findByClan→findAll`, `getClanStats→getStats`, req.user.clanId 검증 제거
- **URL**: `/replays/clan/:clanId`, `/replays/stats/:clanId` → `/replays`, `/replays/stats`
- **유지**: `/clans/:clanId/...` URL prefix, ClanMember.clanId, JWT clanId, AuthenticatedRequest.user.clanId

### 4.5 `e24d7dd` — Frontend cosmetic cleanup

- hooks 정리: `use-community` (6 함수), `use-replays`, `use-scrim-result` (2 함수)
- 페이지 정리: `profile/[memberId]` 12개 ?clanId=, `community/page`, `vote/page`, `overwatch/replays/page`
- 컴포넌트 정리: `post-detail`, `post-write-form`
- 유지: `dashboard/{announcements,hall-of-fame}`, `clan-manage`, `attendance hooks`의 URL path `/clans/${clanId}/...` (route prefix는 backend가 유지)

---

## 5. 마이그레이션 현황

```
backend/src/database/migrations/
├── 1747900000000-Baseline.ts                       placeholder
├── 1747900001000-Phase1DiscordRefactor.ts          신규 도메인 테이블
├── 1747900002000-Phase2CoreLogic.ts                폐기 4종 DROP
├── 1747900005000-Phase5CDropClanMemberPoints.ts    ClanMember 포인트 컬럼
└── 1747900006000-Phase5D3DropClanIdFKs.ts          9개 테이블 clanId 컬럼/FK
```

**클린 DB 부팅** 절차:
1. PostgreSQL 띄우고 .env 설정
2. 둘 중 택일:
   - `SYNC_SCHEMA=true npm run start:dev` 1회 (entities 기반)
   - `npm run migration:run` (5개 체인)

---

## 6. 환경 변수 (Discord 봇 활성화 시)

```
# DB
DATABASE_URL=postgresql://...
SYNC_SCHEMA=false

# JWT
JWT_SECRET=<강력한 키>
NODE_ENV=development|production

# Discord 봇
DISCORD_BOT_ENABLED=true
DISCORD_BOT_TOKEN=<...>
DISCORD_CLIENT_ID=<...>
DISCORD_CLIENT_SECRET=<...>
DISCORD_GUILD_ID=<...>

# Discord OAuth (웹 로그인)
DISCORD_OAUTH_ENABLED=true
DISCORD_OAUTH_REDIRECT_URI=https://potg.joonbi.co.kr/auth/discord/callback
DISCORD_OAUTH_SUCCESS_REDIRECT=/
```

---

## 7. 다음 세션 백로그

### 우선순위 1 — 운영 환경 셋업 (DB + Discord 봇 토큰 필요)
1. PostgreSQL + 5개 마이그레이션 적용
2. `.env` 채우기 (`.env.example` 참고)
   - JWT_SECRET (16+ chars)
   - DISCORD_BOT_TOKEN / DISCORD_CLIENT_ID / DISCORD_GUILD_ID
   - DISCORD_COMMAND_CHANNEL_IDS (콤마 분리)
   - DISCORD_BETTING_NOTIFY_CHANNEL_ID
   - DISCORD_VOICE_ATTENDANCE_MIN_MINUTES=10
3. Discord Developer Portal:
   - SERVER MEMBERS INTENT ON (팀나누기 명령)
   - Bot Permissions: Send Messages, Embed Links, View Channels, Connect, **Move Members**
4. 첫 ADMIN 사용자 지정: `UPDATE users SET role='ADMIN' WHERE discord_id='...'`
5. V1~V10 수동 검증 — `docs/operations.md` 참조

### 우선순위 2 — 프론트엔드 일관성 (Phase 7-C)
1. **C1. 폼 표준화**: zod + react-hook-form 적용 (reset-password, clan/create, community/write — 현재 수동 정규식)
2. **C2. ClanSettingsFormProps 12 props 분해** → 객체 그룹 + custom hook
3. **C3. `/app/auction/[id]/page.tsx` 746줄** → custom hooks 분리 (`useAuctionRoom`, `useAuctionBidding`)
4. **C4. inline 색상/임의값** → tailwind 토큰 (`teamColors`, `max-w-[200px]` 등)
5. **프론트엔드 vitest + RTL** 인프라 도입
6. admin 페이지 컴포넌트 테스트

### 우선순위 3 — 잔여 정리 (선택)
1. **MainRole.TANK/SUPPORT/FLEX enum 결정** — DB 컬럼 영향 확인 후 정리
2. **Bearer Swagger 흔적 정리** — `addBearerAuth` 미사용 (이미 cookie로 교체됨)
3. **MarketGateGuard 캐시 무효화** 정책 명확화
4. **BettingStake UNIQUE 적용** 검토
5. **RANK 마켓 정산 정책** 재정의 (`winningOption='1'` 단순화 → 정책 합의 필요)
6. **B4 모듈 경계 DTO**: clans/posts → ledger.PointTx 직접 import 등 cross-module entity 누출 (38건) — over-engineering 위험 평가 후 선택적 진행

---

## 8. 주의사항 (자주 잊는 것)

### 회계 무결성 (CRITICAL)
- `User.pointsBalance` 직접 UPDATE 금지
- 반드시 `LedgerService.{mint, burn, transfer}` 경유
- admin 잔액 조정도 LedgerService (admin-users.controller.spec.ts 보장)

### 인증
- **Bearer fallback 완전 제거됨** (5-D). 쿠키만 사용
- Discord OAuth는 passport 의존 없음 — `DiscordOAuthService/Guard` 직접 구현
- ws-jwt.guard 삭제됨 — 신규 WebSocket 생기면 직접 구현 필요

### Entity 변경
- 마이그레이션 동반 필수 (timestamp는 1747900006000보다 커야 함)
- 신규 마이그레이션 파일명: `{timestamp}-{PascalCaseName}.ts`
- ERD 업데이트 (`docs/ERD.md` 있다면)

### 단일 클랜
- 새 entity에 clanId 추가 금지 — ClanMember를 통한 멤버십으로 표현
- URL path `/clans/:clanId/...`는 유지하되 service에서는 무시
- 프론트 `user.clanId`는 URL 생성용으로 계속 사용 가능

### lint
- 0 error / 0 warning (Phase 7 완료)

### 코드 구조 (Phase 7 이후)
- AuctionsService는 **facade** — 입찰/RoomState는 helper service로 위임 (services/ 디렉토리)
- 외부에서 `AuctionsService` 그대로 import (호환성). 새 입찰 로직은 `AuctionsBiddingService`에 직접 추가
- ClansService도 동일 — getActivities는 `ClanActivityFeedService`에 위임
- 경매 권한 체크: `loadAsCreator` / `loadAsCreatorTx` helper 사용 (creator + status 패턴)
- 페이지네이션 default: `common/constants/pagination.ts` 임포트 (도메인 특화는 모듈 내부 상수)

### 결정 사항 누적
- RANK 마켓 정산: `winningOption='1'` 단순화 (정책 모호)
- BettingStake UNIQUE 미적용
- Components V2 embed fallback (discord.js 정식 지원 시 builder 교체)
- 인증 쿠키 단일 (Bearer 완전 제거 — Phase 5-D)
- Shadcn `accordion/popover` 미사용이지만 보존 (재사용 가능성)
- `MainRole.TANK/SUPPORT/FLEX` enum 보존 (DB 영향 확인 후 처리)
- 프론트 일부 ?clanId= 잔존 (URL path만 사용, cosmetic — 무영향)

---

## 9. 파일 맵 (IDE 북마크 추천)

### 백엔드 핵심 (5-D 갱신)
```
backend/src/
├── app.module.ts                                       # 모듈 등록 SSOT
├── main.ts                                             # cookieParser, addCookieAuth Swagger
├── common/
│   ├── guards/{jwt-auth,roles,market-gate,clan-roles}.guard.ts
│   └── services/market-gate.service.ts
├── modules/auth/
│   ├── auth.controller.ts                              # /login(쿠키), /logout, /discord*, /profile
│   ├── auth.service.ts                                 # validateUser, login, forgot/reset
│   ├── jwt.strategy.ts                                 # cookieExtractor 단일
│   ├── discord-oauth.service.ts                        # ★ 5-D 신규
│   ├── discord-oauth.guard.ts                          # ★ 5-D 신규 (state CSRF)
│   └── auth.controller.spec.ts
├── modules/ledger/
│   ├── ledger.service.ts                               # mint/burn/transfer
│   ├── ledger.controller.ts                            # list/summary/timeseries
│   └── ledger.controller.spec.ts                       # ★ 5-D 신규
├── modules/matches/match.service.ts                    # 상태머신
├── modules/users/admin-users.controller.ts             # 잔액 조정
├── modules/shop/admin-products.controller.ts
├── modules/wallet/                                     # ranking + addPoints만
├── modules/discord-bot/                                # 슬래시 명령 7종
└── database/migrations/                                # 5개 파일
```

### 프론트엔드 핵심
```
frontend/src/
├── app/admin/                                          # 관리자 UI 11종
├── modules/admin/                                      # 관리자 공통 모듈
├── context/auth-context.tsx                            # /auth/profile 기반
├── lib/api.ts                                          # axios + withCredentials
└── providers/query-provider.tsx                        # TanStack Query
```

---

## 10. 빠른 시작 (다음 진입자용)

```bash
# 1. 상태 파악
cd /c/Users/USER/dev/potg
git log --oneline -8
cat docs/handoff.md | head -150

# 2. 빌드 검증
cd backend && npm run build
cd frontend && npm run build

# 3. 단위 테스트
cd backend && npx jest --testPathIgnorePatterns='test/integration|test/app.e2e'
# 기대: 118 pass + 1 skipped, 16 suites

# 4. knip (dead code 재확인)
cd backend && npx -y knip --reporter compact
cd frontend && npx -y knip --reporter compact

# 5. 다음 작업 선택
# - 우선순위 1: 운영 환경 + V1~V10 (사용자 작업 필요)
# - 우선순위 2: system-config/match controller spec / 프론트 vitest
# - 우선순위 3: cosmetic 잔여 / MainRole 결정
```

---

## 11. 변경 회피 가이드

| 절대 건드리지 말 것 | 이유 |
|--------------------|------|
| `frontend/src/common/components/ui/*` | Shadcn — 일관성 보존 |
| `backend/src/modules/*/*.entity.ts` (마이그레이션 없이) | DB 스키마 |
| `.env`, `.env.local` | 시크릿 |
| LedgerService 직접 호출 외의 잔액 변경 | 회계 무결성 |
| `Clan`, `ClanMember` Entity | 멤버십/role 필요 |
| `/clans/:clanId/...` URL prefix | frontend 호환 |

| 변경 시 동반 작업 필수 | 동반 사항 |
|----------------------|---------|
| Entity 변경 | 마이그레이션 + ERD + spec 영향 검토 |
| auth 흐름 변경 | auth.controller.spec / auth.service.spec |
| 신규 admin API | RolesGuard + ADMIN role + Swagger 데코 + spec |
| Phase 백로그 진입 | `.pipeline/`에 plan 작성 권장 |

---

이 핸드오프는 **세션 종료 직전 작성됨**. 다음 진입자가 컨텍스트 100% 복원 가능하도록 상세 기술.
운영 배포 없는 환경 — 문서가 유일한 외부 메모리.
