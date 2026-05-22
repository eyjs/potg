# Phase 3 실행 계획 — Discord Bot + OAuth2

> 작성일: 2026-05-22
> 범위: DiscordBotModule (NestJS 내부) + 슬래시 명령 7종 + Components V2 + Discord OAuth2

---

## 0. 범위 및 제약

- **discord_keys_pending: true** (status.json) — 실제 봇 토큰/Client ID 없이도 코드 빌드/타입체크 통과해야 함
- 런타임 동작은 환경변수가 채워질 때 활성화. 미설정 시 모듈 자체 로딩은 되나 클라이언트 연결 스킵
- NestJS 모놀리식 내부 모듈 (별도 워커 없음)
- discord.js 14.x 사용

---

## 1. 태스크 분할

```
T01 (deps + env 스캐폴드)
  └─ T02 (DiscordBotModule + DiscordClientService)
       ├─ T03 (CommandRegistry + 슬래시 명령 인터페이스)
       ├─ T04 (Components V2 빌더 헬퍼)
       └─ T05 (MemberService — discord_id 기반 자동 가입)
            ├─ T06 (/잔액)
            ├─ T07 (/출석)
            ├─ T08 (/리더보드)
            ├─ T09 (/베팅)
            ├─ T10 (/순위예측)
            ├─ T11 (/상점 + Components V2 카드)
            └─ T12 (/구매)

T13 (Discord OAuth2 strategy — passport-discord)
T14 (테스트: discord-bot.service.spec — auto-register, command dispatch)
T15 (빌드 + 통합 테스트 + ERD/README 갱신)
```

---

## 2. 환경변수 (신규)

```
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=              # 단일 클랜 가드용 (이 길드 외 호출 거부)
DISCORD_OAUTH_REDIRECT_URI=
DISCORD_OAUTH_ENABLED=false    # 미설정 시 OAuth2 라우트 비활성
DISCORD_BOT_ENABLED=false      # 미설정 시 클라이언트 connect() 스킵
```

---

## 3. 디렉토리 구조

```
backend/src/modules/discord-bot/
├── discord-bot.module.ts
├── discord-client.service.ts          # discord.js Client 라이프사이클
├── discord-member.service.ts          # discord_id → User 자동 가입/조회
├── command-registry.ts                # 슬래시 명령 등록/디스패치
├── interfaces/
│   ├── slash-command.interface.ts
│   └── interaction-context.ts
├── builders/
│   └── components-v2.builder.ts       # Container/TextDisplay/MediaGallery/Button
├── commands/
│   ├── balance.command.ts             # /잔액
│   ├── attendance.command.ts          # /출석
│   ├── leaderboard.command.ts         # /리더보드
│   ├── bet.command.ts                 # /베팅
│   ├── rank-predict.command.ts        # /순위예측
│   ├── shop.command.ts                # /상점
│   └── buy.command.ts                 # /구매
└── discord-bot.service.spec.ts
```

OAuth2:
```
backend/src/modules/auth/
├── strategies/discord.strategy.ts     # passport-discord
├── auth.controller.ts (수정)          # /auth/discord, /auth/discord/callback
```

---

## 4. 슬래시 명령 상세

| 명령 | 옵션 | 동작 |
|------|------|------|
| `/잔액` | — | `LedgerService.getBalance(user)` → ephemeral 임베드 |
| `/출석` | — | 일일 출석체크 (중복 차단) + `LedgerService.mint` 보상 |
| `/리더보드` | `top?: 10` | `User.pointsBalance DESC` 상위 |
| `/베팅` | `match`, `team`, `amount` | `BettingService.placeStake` WIN |
| `/순위예측` | `match`, `rank(1~4)`, `amount` | `BettingService.placeStake` RANK |
| `/상점` | — | Components V2 카드 페이지네이션 |
| `/구매` | `상품` | `MarketGate` 통과 검증 → `ShopService.purchase` |

전 명령 응답은 ephemeral (사용자에게만 보임).

---

## 5. 자동 가입 흐름

1. 인터랙션 수신 → `interaction.user.id` (discord snowflake)
2. `DiscordMemberService.findOrCreate(discordId, username, avatar)`
3. 없으면 `User` row 생성 + `LedgerService.mint(user, 1000, SEED)`
4. 신규 가입 안내 ephemeral 메시지

OAuth2 콜백도 동일 함수 호출 (양방향 멱등).

---

## 6. Components V2 빌더

```ts
buildProductCard(product: ShopProduct): APIComponent[]
// → Container
//    ├ TextDisplay (이름 + 가격)
//    ├ MediaGallery (이미지)
//    └ Button (구매)
// flags: IS_COMPONENTS_V2 (1 << 15)
```

---

## 7. 테스트 전략

- discord.js Client는 모킹 (실제 connect 없음)
- `DiscordMemberService.findOrCreate` 신규/기존 분기 2케이스
- 1개 명령(`balance`) 핸들러 단위 테스트 (LedgerService 모킹)
- 통합 테스트는 Phase 4에서 실 환경 변수 갖춰진 후

---

## 8. 빌드 & 검증

- `npm run build` 통과
- 신규 spec PASS
- 기존 Phase 2 spec 회귀 없음
- 환경변수 미설정 시 부팅 가능 (DISCORD_BOT_ENABLED=false)

---

## 9. 산출물

- 디렉토리 `backend/src/modules/discord-bot/`
- 신규 strategies, controllers 갱신
- `.env.example` 갱신 (있다면)
- `docs/discord-bot.md` (Phase 4 운영자 매뉴얼 초안)
- `.pipeline/REPORT-phase3.md`
