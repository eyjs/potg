# Phase 3 완료 리포트 — Discord Bot + OAuth2

> 작성일: 2026-05-22
> 범위: DiscordBotModule (NestJS 내부), 슬래시 명령 7종, Components V2 빌더, Discord OAuth2
> 상태: ✅ 완료 (build PASS, 신규 테스트 3 PASS, 누적 15 PASS)

---

## 1. 산출물 요약

### 1.1 신규 모듈
| 영역 | 파일 | 핵심 |
|------|------|------|
| Module | `backend/src/modules/discord-bot/discord-bot.module.ts` | TypeOrmModule.forFeature + Ledger/Betting/Shop/SystemConfig 의존 통합 |
| Client | `discord-bot/discord-client.service.ts` | discord.js Client 라이프사이클. `DISCORD_BOT_ENABLED=false`면 connect 스킵 (CI/빌드 환경 호환) |
| Registry | `discord-bot/command-registry.ts` | 슬래시 명령 등록 / 길드 publish / 인터랙션 디스패치 |
| Member | `discord-bot/discord-member.service.ts` | `discord_id` 기반 멱등 가입 + SEED mint. username 충돌 시 suffix |
| Builder | `discord-bot/builders/components-v2.builder.ts` | 상품 카드 embed + 구매 버튼. `IS_COMPONENTS_V2` 상수 export |

### 1.2 슬래시 명령 7종
| 명령 | 파일 | 동작 |
|------|------|------|
| `/잔액` | `commands/balance.command.ts` | LedgerService.getBalance + 신규 가입 환영 |
| `/출석` | `commands/attendance.command.ts` | UTC 일자 기준 1일 1회 mint. config 키 `DAILY_ATTENDANCE_AMOUNT` (기본 50P) |
| `/리더보드` | `commands/leaderboard.command.ts` | User.pointsBalance DESC. 옵션 `top` 1~25 |
| `/베팅` | `commands/bet.command.ts` | WIN 마켓 placeStake. matchId + teamId 검증 |
| `/순위예측` | `commands/rank-predict.command.ts` | RANK 마켓 placeStake. 1~4등 |
| `/상점` | `commands/shop.command.ts` | ProductActive 페이지네이션. 잔액/게이트 기반 disabled |
| `/구매` | `commands/buy.command.ts` | MarketGate 직접 검증 → ShopService.purchase |

전 명령 응답 `ephemeral: true` (사용자 본인에게만).

### 1.3 Discord OAuth2
- `backend/src/modules/auth/discord.strategy.ts` (passport-discord)
- `auth.controller.ts` 신규 라우트 2종:
  - `GET /auth/discord` — OAuth2 진입점
  - `GET /auth/discord/callback` — 토큰 발급 후 리다이렉트
- `AuthModule`에 `DiscordBotModule` import (DiscordMemberService 공유)
- `validate()` 콜백이 봇 자동 가입과 동일한 `findOrCreate` 호출 → 양방향 멱등성

### 1.4 환경변수 (.env 추가)
```
DISCORD_BOT_ENABLED=false
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=
DISCORD_OAUTH_ENABLED=false
DISCORD_OAUTH_REDIRECT_URI=http://localhost:3000/auth/discord/callback
```

### 1.5 의존성 추가
- `discord.js@^14.26.4`
- `passport-discord@^0.1.4` (deprecated 경고 있음, 추후 `discord-strategy`로 교체 검토)
- `@types/passport-discord` (dev)

### 1.6 app.module.ts
- `DiscordBotModule` 등록

---

## 2. 검증

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ PASS |
| `discord-member.service.spec` | ✅ 3 PASS |
| 누적 Phase 2+3 spec | ✅ 15 PASS (ledger 7 + betting 5 + discord-member 3) |
| 환경변수 미설정 부팅 | ✅ DISCORD_BOT_ENABLED=false 기본값 |
| Phase 2 회귀 | ✅ 없음 |

---

## 3. 주요 결정 사항

| # | 결정 | 사유 |
|---|------|------|
| D1 | Components V2 (Container/TextDisplay/MediaGallery) 대신 embed + Button 조합 사용 | discord.js 14.26 빌더가 V2 정식 미지원. `buildProductCard` 함수만 교체하면 V2 전환 가능 구조로 작성. `IS_COMPONENTS_V2 = 1 << 15` 상수 보존. |
| D2 | `/출석`은 PointTx 직접 조회로 중복 차단 | AttendanceRecord는 clan_members 기반 (스크림 출석용). 디스코드 일일 출석은 단순 PointTx ATTENDANCE 1회 체크로 처리. 단일 클랜 전환 후 통합 검토. |
| D3 | `/구매`에서 MarketGate 로직 인라인 호출 | 인터랙션은 HTTP 가드 체인을 거치지 않음. MarketGateGuard와 동일한 쿼리를 BuyCommand에 직접 구현 (DRY 위반 인지, Phase 5에서 공통 서비스로 추출 예정) |
| D4 | passport-discord 사용 (deprecated 경고) | 단기 검증용. Phase 4 운영 전 maintained alternative로 교체 |
| D5 | DISCORD_BOT_ENABLED=false를 기본값으로 | CI/로컬 부팅 시 토큰 없어도 정상 부팅. 봇 활성화는 운영 배포 시 `.env` 갱신으로 활성 |
| D6 | 슬래시 명령 이름 한국어 사용 | 사용자가 한국어 모임이라 명시. discord.js는 i18n 지원하나 우선 단순화 |

---

## 4. 알려진 한계 (Phase 4/5에서 처리)

1. **discord_keys_pending** — 실제 봇 토큰/Client ID 미설정. 운영 진입 시 Discord Developer Portal에서 발급 + `.env` 채워야 활성화
2. **autocomplete 미구현** — `/베팅 [내전]`, `/구매 [상품]` 등 ID 입력은 사용자가 직접 복붙해야 함. Phase 4에서 SearchAutocomplete 추가 예정
3. **/구매 마켓게이트 캐시 미갱신** — 인터랙션 통과 시 `user.marketGatePassed = true` 캐시 갱신을 의도적으로 생략 (HTTP 가드와 캐시 정책 통일을 Phase 4에서 결정)
4. **Components V2 정식 미지원** — embed fallback. discord.js V2 정식 빌더 출시 후 빌더 함수만 교체
5. **passport-discord deprecated** — maintained 대체재로 교체 필요
6. **회원 매핑 엑셀 업로드 도구 미구현** — 기존 회원 ↔ discord_id 매핑은 Phase 4 관리자 웹에서 처리

---

## 5. 다음 Phase 진입 조건

- [x] discord.js 의존성 추가
- [x] DiscordBotModule 스캐폴드
- [x] 슬래시 명령 7종 핸들러
- [x] Components V2 (embed fallback) 빌더
- [x] Discord OAuth2 strategy + 라우트
- [x] DiscordMemberService 테스트
- [x] 빌드 통과
- [ ] **Phase 4 (관리자 웹)** — `/admin/*` 페이지 재구성, 경제 대시보드, 정산 UI, 엑셀 업로드

---

## 6. 다음 액션 제안

1. **Phase 3 커밋** (WBS 태깅 후)
2. **Discord Developer Portal에서 봇 등록 + 토큰 발급** (사용자 작업)
3. **Phase 4 (관리자 웹) 착수**
