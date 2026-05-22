# POTG Discord 리팩토링 — 세션 핸드오프

> 최종 갱신: 2026-05-22
> 진행 상태: **Phase 1 → 4.1 완료 / Phase 4.2 (프론트엔드 admin) 대기**

---

## 1. 한눈에 보기

| Phase | 상태 | 커밋 |
|-------|------|------|
| 1. 기반 (Entity + Migration) | ✅ 완료 | `2a0a0e1` |
| 2. 핵심 로직 (Ledger/Betting/Shop/Match) | ✅ 완료 | `2a0a0e1` |
| 3. Discord Bot + OAuth2 | ✅ 완료 + 코드리뷰 반영 | `8ab9dd4`, `f81f0eb` |
| 4.1. 백엔드 admin API | ✅ 완료 | `f226e0d` |
| 4.2. 프론트엔드 admin 페이지 | ⏳ 대기 | — |
| 5. 정리 (Games/사용자 페이지 폐기) | ⏳ 대기 | — |

**검증 현황**: 빌드 PASS, 신규 spec 15 PASS, 회귀 없음.

---

## 2. 완료된 작업

### Phase 1 — 기반
- TypeORM 마이그레이션 인프라 (`backend/src/database/`)
- 신규 엔티티: `PointTx`, `Match/Team/TeamMember`, `BettingMarket/Stake`, `MarketOrder`, `SystemConfig`
- User 확장: `discordId`, `pointsBalance`, `marketGatePassed`, `CAPTAIN` role

### Phase 2 — 핵심 로직
- `LedgerService` — 복식부기 mint/burn/transfer + SINK 가상계정 (`00000000-...-000`)
- `BettingService` — 패리뮤추얼 풀 분배 + 5% rake + LOCKED 강제
- `ShopService` — 즉시소각 + 재고 원자적 차감
- `MatchService` — 상태머신 DRAFT → BETTING_OPEN → LOCKED → SETTLED
- `MarketGateService` (Phase 3 리뷰에서 공통화) — 출석 7일 + 내전 2회
- `WalletService` 재작성 (pointsBalance 캐시 기반)
- 폐기 4종 제거 + DROP 마이그레이션: `PointLog`, `BettingQuestion`, `BettingTicket`, `ShopPurchase`

### Phase 3 — Discord Bot
- `DiscordBotModule` (NestJS 내부, discord.js 14.26)
- 슬래시 명령 7종: `/잔액 /출석 /리더보드 /베팅 /순위예측 /상점 /구매`
- `DiscordMemberService.findOrCreate` — discord_id 멱등 가입 + SEED mint
- Components V2 빌더 (embed fallback, IS_COMPONENTS_V2 상수 보존)
- `passport-discord` strategy + `/auth/discord`, `/auth/discord/callback`
- OAuth 콜백은 **HttpOnly Cookie**로 JWT 전달 (Referer 누출 방지)

### Phase 4.1 — 백엔드 admin API
- `/admin/matches` 상태머신 제어 + 팀 생성
- `/admin/members` 페이징 + role 변경 + 잔액 조정 (Ledger 경유)
- `/admin/attendance/upload` xlsx 일괄 (행별 결과)
- `/admin/config` 경제 파라미터 GET/PATCH
- `/admin/ledger` PointTx 페이징 + `/summary` (발행/소각/유통량)
- 전부 `AuthGuard('jwt')` + `RolesGuard` + `@Roles(ADMIN)` 적용

---

## 3. 다음 세션에서 해야 할 일

### 우선순위 1 — Phase 4.2 프론트엔드 admin

`frontend/src/app/admin/*` 새로 구성. Next.js 16 App Router + 기존 Shadcn UI (`src/common/components/ui/`).

페이지 목록:
| 경로 | 화면 | 백엔드 매핑 |
|------|------|-------------|
| `/admin` | 경제 대시보드 (총발행/소각/유통량 그래프) | `GET /admin/ledger/summary` + 시간별 PointTx 집계 |
| `/admin/matches` | 내전 목록 + 생성 | `GET/POST /admin/matches` |
| `/admin/matches/[id]` | 내전 상세 + 상태 전이 컨트롤 | `GET /admin/matches/:id`, `POST :id/open/lock/settle/cancel` |
| `/admin/matches/[id]/auction` | 경매 (기존 AuctionsModule 재활용, 팀장 접근) | 기존 `/auctions/*` |
| `/admin/matches/[id]/settle` | 결과 입력 (winnerTeamId + placements) | `POST /admin/matches/:id/settle` |
| `/admin/products` | 상품 등록/수정/재고 | 기존 `/shop/*` 일부 + 신규 admin 라우트 보강 필요 |
| `/admin/orders` | 주문 목록, 전달/취소 | 기존 `/shop/admin/*` (재확인) |
| `/admin/members` | 회원 목록, role/잔액 조정 | `GET/PATCH/POST /admin/members/*` |
| `/admin/attendance` | 엑셀 업로드 + 결과 표시 | `POST /admin/attendance/upload` |
| `/admin/config` | 경제 파라미터 표 + 인라인 편집 | `GET/PATCH /admin/config/*` |
| `/admin/ledger` | PointTx 검색 + 페이징 | `GET /admin/ledger?filter` |

작업 시 주의:
- **인증 흐름 통합**: Phase 3에서 OAuth 콜백을 HttpOnly Cookie로 변경했으나 `frontend/src/lib/api.ts`는 여전히 `localStorage` 사용. `withCredentials: true` 추가 + AuthContext에서 쿠키 기반 세션 확인 분기 필요. 또는 admin 페이지는 localStorage 토큰 유지하고 디스코드 사용자만 쿠키 사용 → 결정 필요.
- **레이아웃 가드**: `/admin/layout.tsx`에서 ADMIN role 확인 후 children 렌더. 미통과는 `/login` 리다이렉트.
- **오버워치 테마 유지**: `bg-primary` (#f99e1a), skewed buttons, `text-ow-blue` 등. 하드코딩 색상 금지.
- **상태 관리**: 기존 React Query 사용 여부 확인. 없으면 axios + useState 정도로 시작.

### 우선순위 2 — Discord 봇 실 환경 활성화 (사용자 작업)

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

활성화 후:
1. 길드에 봇 초대
2. 백엔드 재시작 — 슬래시 명령 자동 등록 (길드 등록은 즉시 반영)
3. 디스코드에서 `/잔액` 호출 → 자동 가입 + SEED 1000P 확인

### 우선순위 3 — Phase 5 정리 (병행 가능)

- `GamesModule` 삭제 + 관련 소켓 게이트웨이
- 프론트엔드 사용자용 페이지 폐기: `/betting`, `/shop`, `/wallet`, `/ranking`, `/utility/quiz`, `/gallery/*`, `/profile/shop`
- `ClanMember.totalPoints/lockedPoints` 컬럼 DROP (단일 클랜 전환)
- 자체 회원가입 (`/signup`) 폐기 + Discord OAuth로 통합
- `clanId` 의존 코드 제거 (80+ 파일)
- `passport-discord` deprecated → maintained alternative로 교체
- `MarketGateGuard` 캐시 무효화 정책 명확화

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
- `LedgerService.computeBalanceFromLedger(userId)` 로 PointTx 합 vs 캐시 일치 검증 가능 (관리자 모니터링)

### 알려진 사전 존재 실패 테스트 (Phase 1부터 동일)
- `test/unit/auth/auth.service.spec.ts` — JWT 환경변수 미주입
- `src/modules/posts/posts-bulk-like.service.spec.ts` — ClanMemberRepository DI 누락
- `test/app.e2e-spec.ts` — uuid ESM 트랜스폼
- Phase 5 정리에서 수렴 예정. 현 작업과 무관.

### 결정 사항 누적 (.pipeline/status.json 참조)
- **RANK 마켓 정산**: `winningOption='1'` 단순화 (정책 모호 — Phase 5에서 재정의)
- **BettingStake UNIQUE 미적용**: (market_id, user_id, side) — 서비스 합산 로직만 사용
- **/구매 MarketGate**: 인라인 검증 → 공통 `MarketGateService`로 추출 완료 (Phase 3 리뷰 반영)
- **passport-discord deprecated**: Phase 5에서 교체
- **Components V2**: embed fallback, discord.js 정식 지원 시 `buildProductCard`만 교체

---

## 5. 파일 맵

### 신규 백엔드 모듈
```
backend/src/modules/
├── ledger/                         # 복식부기 원장
│   ├── entities/point-tx.entity.ts
│   ├── ledger.service.ts
│   ├── ledger.controller.ts        # /admin/ledger
│   ├── ledger.constants.ts         # SINK_ACCOUNT_ID, REASON
│   └── ledger.module.ts
├── matches/                        # 내전 상태머신
│   ├── entities/{match,team,team-member}.entity.ts
│   ├── enums/match-status.enum.ts
│   ├── match.service.ts
│   ├── match.controller.ts         # /admin/matches
│   └── matches.module.ts
├── system-config/                  # 경제 파라미터
│   └── system-config.{service,controller,module}.ts
├── discord-bot/                    # Phase 3
│   ├── discord-{client,member}.service.ts
│   ├── command-registry.ts
│   ├── commands/{balance,attendance,leaderboard,bet,rank-predict,shop,buy}.command.ts
│   ├── builders/components-v2.builder.ts
│   └── discord-bot.module.ts
└── ...

backend/src/common/
├── guards/market-gate.guard.ts     # HTTP 가드 (MarketGateService 위임)
└── services/market-gate.{service,module}.ts  # 공통 게이트 로직
```

### 폐기된 파일 (git history만 남음)
- `betting/entities/{betting-question,betting-ticket}.entity.ts`
- `betting/enums/betting.enum.ts`
- `clans/entities/point-log.entity.ts`
- `shop/entities/shop-purchase.entity.ts`
- `shop/shop.service.spec.ts` (재작성 필요)

### 파이프라인 산출물
```
.pipeline/
├── requirement.md              # Phase 1~5 요구사항 (consultant 산출)
├── plan.md                     # Phase 1 계획
├── plan-phase3.md
├── plan-phase4.md
├── status.json                 # SSOT
├── reviews/plan-review.md
├── REPORT-phase2.md
├── REPORT-phase3.md
└── REPORT-phase4.1.md
```

---

## 6. 빠른 시작 (다음 세션 진입자용)

```bash
# 1. 현재 상태 확인
cat .pipeline/status.json | head -50
git log --oneline -8

# 2. 빌드 확인
cd backend && npm run build

# 3. 신규 spec 확인 (15개 PASS 기대)
cd backend && npx jest --testPathPatterns='ledger.service.spec|betting.service.spec|discord-member.service.spec'

# 4. Phase 4.2 착수
ls frontend/src/app/                          # 기존 사용자 페이지 확인
ls frontend/src/common/components/ui/         # Shadcn UI 재활용 컴포넌트
cat .pipeline/REPORT-phase4.1.md              # 백엔드 API 카탈로그
```

진입 시 우선 `.pipeline/REPORT-phase4.1.md`의 §1.2 엔드포인트 카탈로그를 읽고, 그 다음 위 §3 "다음 세션에서 해야 할 일"의 페이지 목록대로 진행.
