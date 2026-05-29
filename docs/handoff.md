# POTG Discord 리팩토링 — 세션 핸드오프

> 최종 갱신: 2026-05-29 (Phase 5-E/F 완료 — 사용자 채널 디스코드 이관 + 단발성 경매 페이지 신규)
> 진행 상태: **웹은 운영자 전용 + /auction 경매 전용. 사용자 도메인은 100% Discord 봇으로 이관**
> 운영 배포 환경 없음 → **테스트 커버리지 + 코드 리뷰 사이클로 회귀 방어**

---

## 1. 한눈에 보기 — 누적 Phase

| Phase | 상태 | 커밋 | 주요 산출 |
|-------|------|------|-----------|
| 1~4. 기반·핵심·Bot·Admin | ✅ | `2a0a0e1`~`b57e078` | TypeORM/PointTx/Match/BettingMarket, LedgerService, Discord Bot 14.26, /admin 11종 |
| 5-A~D. 사용자 페이지 폐기 + 인증 통합 + 단일 클랜 전환 | ✅ | `9c6538d`~`e24d7dd` | betting/shop/wallet 등 폐기, 쿠키 단일, clanId 9 컬럼 DROP |
| 6. 타입 안전성 + lint | ✅ | `506d314`~`912657d` | strict:true, lint 0, Entity nullability 38필드 |
| 7. 클린 아키텍처 정돈 | ✅ | `367c611`~`aa7eefc` | Controller 격리, AuctionsService 분할, 권한 helper |
| 런칭 P0+P1 + Step UI + 출석 streak | ✅ | `b34be4c`~`4fe8553` | helmet/health/채널 화이트리스트, 3-step UI, streak 보너스 |
| Frontend 정리 A+C / Tier3+4 / 통계 페이지 분할 | ✅ | `c818758`~`ca4c07e` | vitest 인프라 + RHF 표준화 + auction 746→592 |
| **5-E. 사용자 채널 → Discord 봇 전면 이관** | ✅ | `ebc624e`, `7ac9387` | 사용자 페이지/모듈/엔티티 폐기 (−19,339 LOC) + DB drop migration |
| **5-F.1 단발성 경매 페이지 v1** | ✅ | `abafeea` | `/auction` 단일 URL — 마스터/캡틴/관전자 3-role view, socket.io |
| **5-F.2 ASSIGNING + 리셋 + PNG + 가격 배지** | ✅ | `eb5d782` | 드래그앤드롭 유찰자 배정 (@dnd-kit) + 경매 리셋 + 결과 이미지 다운로드 (html-to-image) |
| **5-F.3 3-column 레이아웃 + 매물 아바타 + 남은 매물 큐** | ✅ | `fc36953` | 좌 팀카드 / 중 매물+컨트롤 / 우 큐. RoomState 에 avatarUrl 노출 |
| **5-F.4 리뷰 1차 fix** | ✅ | `4412215` | 새 경매 confirm + `unassignedPlayers` rename + captain key 기반 input 재마운트 + queue 진행 표시 |
| **5-F.5 이력 보존 흐름** | ✅ | `10f5ba7` | 마스터가 [새 경매(저장)] vs [결과 버리기] 명시 선택. backend deleteAuction COMPLETED 허용 |
| **5-F.6 리뷰 Critical fix** | ✅ | `0f0b666` | useCurrentAuction 우선순위 (ACTIVE → COMPLETED fallback) + 안내 카드 dismissible |

---

## 2. 현재 시스템 구조 (반드시 숙지)

### 2.1 도메인 분담

```
┌─────────────────────────────────────────────────────────┐
│  Discord 봇 (사용자 도메인 — 베팅/출석/상점/송금/팀나누기)  │
│  슬래시 명령 15종 + 음성 출석 자동 + 정산 DM             │
└─────────────────────────────────────────────────────────┘
                       ↑ 단일 SSOT: User.pointsBalance + PointTx
                       ↓
┌─────────────────────────────────────────────────────────┐
│  웹 (운영자 + 경매 전용)                                  │
│  /admin/* — 관리자 대시보드 7개 (attendance/config/      │
│             ledger/matches/members/orders/products)      │
│  /auction — 단발성 실시간 경매 (마스터+팀장 로그인)        │
│  /utility — 팀나누기/유틸 + Discord 화면공유 송출 화면     │
│  /login   — 마스터+팀장 진입점                            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 도메인 SSOT

| 도메인 | SSOT | 비고 |
|--------|------|------|
| 포인트 잔액 | `User.pointsBalance` (BigInt) | LedgerService.computeBalanceFromLedger 검증 |
| 회계 원장 | `PointTx` (복식부기) | LedgerService.mint/burn/transfer 경유 필수 |
| 내전 상태 | `Match.status` 상태머신 | DRAFT → BETTING_OPEN → LOCKED → SETTLED |
| **경매 상태** | `Auction.status + biddingPhase` | PENDING → ONGOING (WAITING/BIDDING/SOLD 사이클) → ASSIGNING → COMPLETED |
| 인증 토큰 | HttpOnly 쿠키 `access_token` | **쿠키 단일** (Bearer 제거) |
| 디스코드 가입 | `User.discordId` (unique) | DiscordMemberService.findOrCreate 멱등 |
| 클랜 멤버십 | `ClanMember.clanId` | 단일 클랜이라도 row 유지 |

### 2.3 경매 페이지 — `/auction` 단일 URL

**페이지 라우팅**: `/auction` 단일. `[id]` 동적 라우트 없음. `useCurrentAuction()` 이 자동으로 1건 추적:
1. **ACTIVE** (PENDING/ONGOING/PAUSED/ASSIGNING) 중 최근 1건 우선
2. 없으면 최근 **COMPLETED** 1건 (결과 화면 유지용)
3. 그것도 없으면 null → `AuctionNoActive` 화면

**View 분기** (orchestrator: `frontend/src/app/auction/page.tsx`):

| status \ role | master (creatorId 일치) | captain (CAPTAIN role) | spectator |
|--|--|--|--|
| no auction | `<AuctionNoActive canCreate />` | 동일 (비활성 안내) | 동일 |
| PENDING | setup 대시보드 (팀장/매물 incremental) | "마스터 준비 중" 명단 view | 동일 |
| ONGOING | 3-column 흐름 조율 패널 | 3-column 입찰 패널 (본인 잔여P) | 3-column read-only |
| ASSIGNING | 드래그앤드롭 유찰자 배정 | "마스터 수동 배정 중" 안내 | 동일 |
| COMPLETED | 결과 + 3 액션 (이미지/새 경매/버리기) | 결과 view | 동일 |

**3-column 레이아웃** (ONGOING):
```
┌─ 헤더 (제목 · 미배정 N/M · 타이머) ──────────────────────┐
├─ 좌 (col-3) ──┬─ 중앙 (col-6) ────────┬─ 우 (col-3) ─────┤
│ 팀 카드 (세로) │ 매물 카드 (192px 아바타) │ 남은 매물 큐    │
│  - 잔여 P     │   + 디스코드명           │  · 진행 중      │
│  - 영입 멤버  │   + 역할 배지            │  · 대기 그룹    │
│    + 낙찰가  │ 경매조작/입찰 패널         │  · 유찰 그룹    │
└──────────────┴────────────────────────┴─────────────────┘
```

**경매 진행 정책**:
- 매물 1개 당 타이머 **30~60초** (default 30) — 마스터 매물 설명 시간 확보
- 타이머 만료 시 backend 가 자동 처리: `currentBid` 있으면 자동 confirmBid, 없으면 자동 passPlayer
- **다음 매물 진행은 명시적 [다음] 클릭**으로만 (자동 X) — 매물 간 휴식 시간 자유
- **종료 조건**: 모든 PLAYER 가 팀에 배정되어야만 [경매 종료] 활성. 유찰자 남으면 ASSIGNING phase 진입 필요
- **리셋**: 진행 중 언제든 마스터가 모든 매물 배정/입찰/잔여P 초기화 (팀 수/팀장/매물 등록은 유지)

**이력 보존 흐름** (COMPLETED 화면):
- **[결과 이미지]** (Cyan) — PNG 다운로드 (`html-to-image` 1080px 오프스크린 캡처)
- **[새 경매 (이력 저장)]** — 현재 결과는 DB 보존 + 새 PENDING 생성 (= 자동 이력 누적)
- **[결과 버리기]** (destructive ghost) — confirm 후 DB 영구 삭제 (쓰레기 데이터 방지)
- 안내 카드 — 첫 진입 시 보존/삭제 의미 노출, `localStorage('auction-completed-help-seen')` 로 1회 dismiss

### 2.4 인증 흐름 (변경 없음)

```
[자체 로그인 — 마스터+팀장 경매 진입]
POST /auth/login → HttpOnly 쿠키 (7일) + { ok: true }
  → 프론트: AuthContext 가 GET /auth/profile 로 user fetch

[Discord OAuth — 사용자 도메인이지만 웹 진입 시도 시 사용 가능]
GET /auth/discord → state 쿠키 + 302
GET /auth/discord/callback → DiscordOAuthGuard (state CSRF + code 교환 + 멱등 user 생성)

[제거됨]
- /auth/forgot-password, /auth/reset-password, /auth/verify-reset-token (Phase 5-E 잔여 정리)
- EmailService, PasswordReset entity
```

---

## 3. 이번 세션의 핵심 변경 상세

### 3.1 Phase 5-E — 사용자 채널 폐기 (커밋 `ebc624e`, `7ac9387`)

**삭제된 frontend 페이지** (12개):
`vote/`, `community/`, `clan/`, `my-info/`, `profile/`, `overwatch/`, `forgot-password/`,
`reset-password/`, `auction/[id]/`, 그리고 `auction/page.tsx` (목록 페이지)

**삭제된 frontend 모듈** (12개):
`community`, `clan`, `my-info`, `profiles`, `overwatch`, `statistics`, `blind-date`,
`chat`, `vote`, `auction` (기존), `scrim-result`, `attendance` (frontend)

**삭제된 backend 모듈** (6개):
`posts`, `profiles`, `overwatch`, `blind-date`, `votes`, `scrim-results`

**삭제된 백엔드 잔여물**:
- `app.controller/service/spec` (Hello World 스캐폴드)
- `auth.controller`: forgot-password/reset-password/verify-reset-token 3개 엔드포인트
- `auth.service`: forgotPassword/resetPassword/verifyResetToken 메서드
- `auth/email.service.ts`, `auth/entities/password-reset.entity.ts`
- `auth.module`: `EmailService` provider, `PasswordReset` TypeOrm 등록 해제
- `users.service`: `findByEmail`, `updatePassword` (forgot 전용)

**DB 마이그레이션** `1747900007000-DropUserChannelTables.ts`:
- 10개 dead 테이블 drop (`posts`, `post_comments`, `votes`, `vote_records`, `blind_date_listings`,
  `member_profiles`, `overwatch_profiles`, `replays`, `scrim_results`, `password_resets`)
- CASCADE + IF EXISTS 멱등

**Header/layout 정리**:
- BottomNav 컴포넌트 완전 제거 (모바일 사용자 X)
- Header navItems → 4개 (대시보드/경매/운영/유틸리티)
- `/` → 자동 redirect: ADMIN→`/admin`, 일반→`/utility`, 비인증→`/login`

**누적 변경량**: 153 파일 / **−19,339 LOC**

### 3.2 Phase 5-F — 단발성 경매 페이지 신규 (커밋 `abafeea`~`0f0b666`)

**신규 frontend 모듈**: `src/modules/auction/` 18 파일
```
types.ts                                    백엔드 RoomState 미러
api/auctions.ts                             /auctions REST wrapper + usersApi
schemas/auction-create.schema.ts            zod (turnTimeLimit 30~60)
hooks/
  use-current-auction.ts                    ACTIVE 우선 + COMPLETED fallback
  use-auction-socket.ts                     io('/auction') + 17 이벤트 구독
  use-auction-role.ts                       master/captain/spectator
components/
  auction-no-active.tsx                     빈 상태 + 새 경매 CTA
  auction-pending-master.tsx                setup 대시보드 (incremental 추가)
  auction-pending-waiting.tsx               비-마스터 대기 view
  auction-ongoing-{master,captain,spectator}.tsx  3-role × 3-column
  auction-completed.tsx                     결과 + 3 액션 + 안내 카드
  parts/
    create-auction-dialog.tsx               신규 경매 폼 (재사용)
    team-sidebar.tsx                        좌측 세로 팀 카드
    player-queue.tsx                        우측 매물 큐 (진행/대기/유찰)
    current-player-card.tsx                 매물 대형 카드 (192px 아바타)
    bid-timer.tsx                           20s/10s 색상 분기
    assignment-panel.tsx                    @dnd-kit 드래그앤드롭
    auction-result-poster.tsx               1080px PNG 캡처용
    user-picker-dialog.tsx                  매물/팀장 multi-select
    participant-list.tsx                    팀장/매물 명단 + 제거
src/app/auction/page.tsx                    orchestrator (역할×상태 분기)
```

**백엔드 변경** (모듈 `backend/src/modules/auctions/`):
- `AuctionsService.reset(auctionId, userId)` 신규 — 트랜잭션으로 bids 삭제 + participants 재초기화 + auction state 복원. 마스터(creator) 전용. ONGOING/PAUSED/ASSIGNING 만 허용
- `AuctionsService.deleteAuction()` status 가드 확장: PENDING/CANCELLED → **PENDING/CANCELLED/COMPLETED**. ONGOING/PAUSED/ASSIGNING 여전히 차단
- Gateway 신규 이벤트: `'resetAuction'` 핸들러 → `stopBiddingTimer` + service.reset + broadcast `'auctionReset'`
- `auctions-room-state.service.ts` 확장: `participants[].user.avatarUrl`, `currentPlayer.avatarUrl`, `unsoldPlayers[].avatarUrl + wasUnsold` 노출

**신규 의존성** (frontend):
- `socket.io-client@^4.8.3` (사용 시작)
- `html-to-image@^1.11.13` (PNG 캡처)
- `@dnd-kit/core` (드래그앤드롭)

### 3.3 코드 리뷰 사이클

3회 리뷰 → 즉시 수정:
- 리뷰 1 (`fc36953` 직후) → `4412215`: dead code, 네이밍, 캡처 wrapper, captain input key 기반 reset, queue 진행 표시
- 리뷰 2 (`10f5ba7` 직후) → `0f0b666`: **Critical** useCurrentAuction COMPLETED fallback + 안내 카드 dismissible + cascade 주석 정정 + isDiscarding mutex

---

## 4. 현재 검증 상태

| 항목 | 결과 |
|------|------|
| backend typecheck (strict:true) | ✅ 0 error |
| backend lint | ✅ 0 error |
| backend build (nest build) | ✅ |
| backend unit test | ✅ **9건** (auth 4 + clans 5) |
| frontend typecheck | ✅ 0 error |
| frontend lint | ✅ 0 error (2 unrelated warnings — image-uploader) |
| frontend build (next build) | ✅ 14 routes 정상 |
| frontend vitest | ✅ **9건** (login.schema + utility hooks) |

**참고**: backend 의 integration/e2e 7 suite 는 DB 미연결로 인한 사전 실패 (회귀 아님). frontend test 가 일부 축소된 것은 사용자 페이지 폐기 영향.

---

## 5. 다음 세션 백로그

### 우선순위 1 — 경매 이력 관리 페이지 (Phase 5-G)

사용자 요구: "DB 에 이력 보존하는 이유는 나중에 포인트 지급해주려고". 따라서 이력 페이지 + 포인트 지급 흐름 필요.

1. **`/admin/auctions` 페이지 신설** — 경매 이력 리스트
   - GET `/auctions` 의 COMPLETED 만 필터링 → table 렌더
   - 컬럼: 제목, 종료일, 팀 수, 영입 인원, 마스터, status
   - row 클릭 → 상세 (panel 또는 `/admin/auctions/[id]`)
2. **이력 상세 view** — TeamRosters/AuctionResultPoster 재사용
   - 팀별 영입 + 낙찰가 + 미낙찰 명단
   - **결과 이미지 재다운로드** (이미 만든 poster + html-to-image)
3. **포인트 지급 흐름** — LedgerService.mint 활용
   - "이 경매 영입 선수들에게 보상 지급" 버튼 → DTO (per-팀 또는 per-매물 amount + reason) → 일괄 mint
   - Idempotency: PointTx.reason 에 `AUCTION_REWARD:{auctionId}:{userId}` 같은 패턴
   - PointTx 조회로 중복 지급 방지
4. **이력 페이지 진입점**:
   - Header 또는 `/admin` 대시보드에 [경매 이력] 링크

### 우선순위 2 — Critical UX/보안 보강

1. **bidderId 위조 방지** — socket.io gateway 의 `placeBid` 가 payload `bidderId` 와 socket auth user 일치 검증
   - 현재 v1 모델은 마스터+팀장 신뢰 가정. 보강 권장
2. **타이머 0 도달 시각화** — 자동 낙찰 순간 전체 화면 flash 또는 소리 (현재 BidTimer 색상 분기만)
3. **@dnd-kit KeyboardSensor** — a11y. ASSIGNING 패널에서 키보드만으로 배정 가능
4. **결과 PNG 모바일 viewport 실측 검증** — 1080px wrapper 가 좁은 viewport 에서 잘리지 않는지

### 우선순위 3 — 잔여 정리 (선택)

1. **MainRole.TANK/SUPPORT/FLEX enum 결정** — DB 컬럼 영향 확인 후 정리
2. **Bearer Swagger 흔적 정리** — `addBearerAuth` 미사용 (이미 cookie)
3. **MarketGateGuard 캐시 무효화** 정책 명확화
4. **RANK 마켓 정산 정책** 재정의

---

## 6. 주의사항 (자주 잊는 것)

### 회계 무결성 (CRITICAL)
- `User.pointsBalance` 직접 UPDATE 금지
- 반드시 `LedgerService.{mint, burn, transfer}` 경유
- **포인트 지급 시 Idempotency 보장** — PointTx.reason 에 식별 가능한 key 포함

### 인증
- 쿠키 단일 — Bearer 완전 제거됨
- Discord OAuth: `DiscordOAuthService/Guard` 직접 구현 (passport 미사용)
- ws-jwt.guard 삭제됨 — 신규 WebSocket 생기면 직접 구현 필요

### 경매 상태 변경 시 주의
- `AuctionStatus` 추가/삭제 시 `useCurrentAuction` 의 `ACTIVE_STATES` 갱신 필요
- 신규 socket 이벤트 추가 시 `use-auction-socket.ts` 의 `on()` 등록 + emit fn 추가
- 마스터 전용 mutation 은 backend gateway 에서 `adminId === creatorId` 검증 — 클라이언트 분기는 UX 만

### Entity 변경
- 마이그레이션 동반 필수. 신규 timestamp는 `1747900007000` 보다 커야 함
- 신규 마이그레이션 파일명: `{timestamp}-{PascalCaseName}.ts`
- ERD 업데이트 (`docs/ERD.md`)

### 단일 클랜
- 새 entity 에 `clanId` 추가 금지 — ClanMember 를 통한 멤버십으로 표현
- URL path `/clans/:clanId/...` 는 유지하되 service 에서는 무시

### Frontend 경매 페이지 변경 시
- COMPLETED 화면을 손대면 **useCurrentAuction 의 fallback 정책** 영향 검토 (Critical 회귀 가능)
- 새 socket 이벤트 추가 → `AuctionEmitFns` interface + `emit.xxx` 함수 추가 필수
- 백엔드 RoomState DTO 변경 시 frontend `types.ts` 미러 동기화 필수

### lint
- 0 error / 0 warning (image-uploader 의 `<img>` warning 2건만 사전 존재)

---

## 7. 파일 맵 (IDE 북마크)

### 백엔드 핵심
```
backend/src/
├── app.module.ts                                       # 모듈 등록 SSOT
├── main.ts                                             # helmet + cookieParser
├── common/guards/{jwt-auth,roles,market-gate,clan-roles}.guard.ts
├── modules/auth/
│   ├── auth.controller.ts                              # /login, /logout, /discord*, /profile
│   ├── auth.service.ts                                 # validateUser + login
│   ├── jwt.strategy.ts                                 # cookieExtractor 단일
│   └── discord-oauth.{service,guard}.ts                # 5-D
├── modules/auctions/
│   ├── auctions.service.ts                             # facade + reset()
│   ├── services/auctions-bidding.service.ts            # placeBid/selectPlayer/confirmBid/autoConfirmOnTimeout
│   ├── services/auctions-room-state.service.ts         # RoomState DTO (avatarUrl 포함)
│   ├── auction.gateway.ts                              # 17 socket 이벤트
│   ├── auctions.controller.ts                          # 14 REST endpoints
│   └── entities/{auction,auction-participant,auction-bid}.entity.ts
├── modules/ledger/
│   ├── ledger.service.ts                               # mint/burn/transfer
│   └── ledger.controller.ts
├── modules/discord-bot/                                # 슬래시 명령 15종
└── database/migrations/                                # 7개 (최신: 1747900007000)
```

### 프론트엔드 핵심
```
frontend/src/
├── app/
│   ├── page.tsx                                        # / → role-based redirect
│   ├── auction/page.tsx                                # 경매 orchestrator
│   ├── admin/*                                         # 운영 페이지 7종
│   ├── utility/page.tsx                                # 팀나누기/유틸
│   └── login/page.tsx                                  # 마스터+팀장 진입
├── modules/auction/                                    # 신규 — 단발성 경매 모듈
│   ├── types.ts                                        # RoomState 미러
│   ├── api/auctions.ts
│   ├── hooks/{use-current-auction,use-auction-socket,use-auction-role}.ts
│   ├── schemas/auction-create.schema.ts
│   └── components/{auction-*, parts/*}.tsx
├── modules/admin/                                      # 관리자 공통
├── modules/utility/                                    # 팀나누기/맵 추첨
├── modules/auth/schemas/login.schema.ts                # 로그인 폼 zod
├── context/auth-context.tsx                            # /auth/profile 기반
├── lib/api.ts                                          # axios + withCredentials
├── common/layouts/header.tsx                           # 4개 navItem
└── providers/query-provider.tsx                        # TanStack Query
```

---

## 8. 빠른 시작 (다음 진입자용)

```bash
# 1. 상태 파악
cd /c/Users/USER/dev/potg
git log --oneline -12
head -100 docs/handoff.md

# 2. 빌드 검증
cd backend && npm run build && npm run test:unit
cd ../frontend && npm run build && npx vitest run

# 3. 운영 환경 셋업 (DB + 봇 토큰 필요)
cd backend
# .env 설정 후
npm run migration:run   # 7개 마이그레이션
npm run start:dev       # 포트 3000 (외부 8100)

cd ../frontend
npm run dev             # 포트 3000 (외부 3001)

# 4. 첫 ADMIN 지정 (DB 콘솔)
# UPDATE users SET role='ADMIN' WHERE discord_id='...';

# 5. 다음 작업 선택
# - 우선순위 1: /admin/auctions 이력 페이지 + 포인트 지급
# - 우선순위 2: bidderId 위조 방지 + 타이머 0 강조 + a11y
# - 우선순위 3: cosmetic 잔여
```

---

## 9. 변경 회피 가이드

| 절대 건드리지 말 것 | 이유 |
|--------------------|------|
| `frontend/src/common/components/ui/*` | Shadcn — 일관성 보존 |
| `backend/src/modules/*/*.entity.ts` (마이그레이션 없이) | DB 스키마 |
| `.env`, `.env.local` | 시크릿 |
| LedgerService 외 잔액 변경 | 회계 무결성 |
| `useCurrentAuction` 의 `ACTIVE_STATES` 정책 | 경매 화면 전이 |
| `RoomState` DTO 형상 (frontend 미러 동기) | 클라/서버 형상 깨짐 |

| 변경 시 동반 작업 필수 | 동반 사항 |
|----------------------|---------|
| Entity 변경 | 마이그레이션 + ERD + spec 영향 검토 |
| auth 흐름 변경 | auth.controller.spec / auth.service.spec |
| 신규 admin API | RolesGuard + ADMIN role + Swagger 데코 + spec |
| 경매 socket 이벤트 추가 | gateway 핸들러 + use-auction-socket emit + RoomState |
| RoomState 필드 추가 | backend service + frontend types 동시 |

---

## 10. 결정 사항 누적 (역사적 컨텍스트)

### 사용자 채널 이관 (Phase 5-A → 5-E)
- 전체 사용자 페이지를 점진적으로 폐기 → 최종적으로 Discord 봇이 단일 사용자 인터페이스
- 웹 = 운영자 + 경매 + 유틸 진입점만
- 사용자 OAuth 가입은 유지 (Discord 만)

### 경매 모델 결정
- **단발성** (사용자 발언: "두 건 이상 동시 진행 X")
- **마스터+팀장 로그인 필수** (마스터는 Discord 화면공유로 송출)
- **팀장이 본인 입찰** (마스터는 흐름 조율만 — UX 가 더 재미있음)
- **자동 낙찰 + 명시적 다음 진행** (마스터 설명 시간 확보)
- **유찰자 수동 배정** (ASSIGNING phase + 드래그앤드롭)
- **전체 배정 후에만 종료** (미배정 0 조건)
- **이력 보존** (포인트 지급 위한 DB 영속) + **마스터 저장/버리기 선택** (쓰레기 데이터 방지)

### 그 외
- `MainRole.TANK/SUPPORT/FLEX` enum 보존 (DB 영향 확인 후 처리)
- BettingStake UNIQUE 미적용
- RANK 마켓 정산: `winningOption='1'` 단순화
- 인증 쿠키 단일 (Bearer 완전 제거)
- Shadcn `accordion/popover` 미사용이지만 보존

---

이 핸드오프는 **세션 종료 직전 작성됨**. 다음 진입자가 컨텍스트 100% 복원 가능하도록 상세 기술.
운영 배포 없는 환경 — 문서가 유일한 외부 메모리.

마지막 커밋: `0f0b666 fix(auction): 리뷰 Critical/Med/Low 일괄 처리`
