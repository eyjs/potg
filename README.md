# POTG — 오버워치 클랜 커뮤니티 관리 시스템

Discord 봇 + Next.js 어드민 + PostgreSQL 기반 클랜 운영 플랫폼.
출석/베팅/포인트/상점/내전 운영을 Discord 슬래시 명령과 웹 어드민에서 통합 관리.

## 빠른 시작 (Docker)

```bash
# 1. 환경변수 준비
cp backend/.env.example backend/.env
# .env 열어서 JWT_SECRET (필수, 16자 이상) + Discord 토큰 채우기

# 2. 전체 스택 기동
docker-compose up -d

# 3. 마이그레이션 실행 (최초 1회 또는 신규 마이그레이션 추가 후)
docker exec potg-backend npm run migration:run

# 4. 헬스 체크
curl http://localhost:8100/health
# → { "status": "ok", "db": true, "discord": { ... } }
```

서비스 접근:
- Backend API: http://localhost:8100
- Backend Swagger: http://localhost:8100/api-docs
- Frontend (Admin): http://localhost:3001
- PostgreSQL: localhost:8101

## 운영 배포

상세 가이드: [`docs/operations.md`](./docs/operations.md)

핵심 체크리스트:
- [ ] `JWT_SECRET` — `openssl rand -base64 48` 같은 강한 시크릿
- [ ] `DISCORD_BOT_TOKEN` + `DISCORD_CLIENT_ID` + `DISCORD_GUILD_ID`
- [ ] `DISCORD_COMMAND_CHANNEL_IDS` — 봇 명령 허용 채널 (콤마 분리)
- [ ] `DISCORD_BETTING_NOTIFY_CHANNEL_ID` — 베팅 알림 채널
- [ ] 운영 PostgreSQL 자격증명
- [ ] 도메인 + SSL (frontend / backend)

## Discord 봇 명령

| 명령 | 권한 | 용도 |
|------|------|------|
| `/도움말` | 전체 | 명령 카탈로그 |
| `/잔액` | 전체 | 포인트 잔액 |
| `/출석` | 전체 | 일일 출석 (1회/일) |
| `/베팅` | 전체 | 승패 베팅 |
| `/순위예측` | 전체 | 등수 베팅 |
| `/상점` | 전체 | 상품 둘러보기 |
| `/구매` | 전체 | 상품 구매 |
| `/리더보드` | 전체 | 포인트 랭킹 |
| `/관리-베팅시작` | ADMIN | 새 베팅 마켓 생성 |
| `/관리-베팅마감` | ADMIN | 베팅 종료 |
| `/관리-정산` | ADMIN | 베팅 정산 (수동 fallback) |
| `/관리-포인트조정` | ADMIN | 포인트 mint/burn |

자동 동작:
- **음성채널 출석**: 음성채널에 `DISCORD_VOICE_ATTENDANCE_MIN_MINUTES`(기본 10분) 이상 체류 시 자동 출석
- **자동 정산**: 웹 어드민에서 내전 결과 등록(`POST /admin/matches/:id/settle`) 시 연결된 베팅 마켓 자동 정산 + Discord 알림

## 기술 스택

| 영역 | 스택 |
|------|------|
| Backend | NestJS 11, TypeORM, PostgreSQL 16, discord.js 14, JWT (httpOnly 쿠키) |
| Frontend | Next.js 16 App Router, React 19, Tailwind 4, Shadcn UI |
| Infra | Docker Compose, Winston, Throttler, Helmet |

## 코드 구조

```
backend/src/
├── modules/
│   ├── auth/            # JWT + Discord OAuth
│   ├── users/           # User entity, admin 관리
│   ├── clans/           # 단일 클랜 정책
│   ├── matches/         # 내전 상태머신
│   ├── betting/         # 패리뮤추얼 베팅
│   ├── ledger/          # 복식부기 PointTx
│   ├── shop/            # 마켓 + 프로필 아이템
│   ├── attendance/      # 출석/포인트 룰
│   ├── auctions/        # 경매 (분할: BiddingService + RoomStateService)
│   ├── discord-bot/     # 슬래시 명령 + 음성 출석 + 알림
│   ├── health/          # /health 엔드포인트
│   └── ...
├── common/
│   ├── constants/       # DEFAULT_PAGE_SIZE 등
│   ├── decorators/      # @Roles 등
│   └── guards/          # RolesGuard, ClanRolesGuard
└── database/
    └── migrations/      # TypeORM 마이그레이션 (5개)
```

## 개발

```bash
# Backend
cd backend
npm install
npm run start:dev        # NestJS dev (포트 3000)
npm test                 # 단위 테스트 (21 suite / 194 pass)
npm run lint
npx tsc --noEmit         # strict 타입 체크

# Frontend
cd frontend
npm install
npm run dev              # Next.js (포트 3000, docker는 3001)
npm run typecheck
npm run lint
```

## 참고 문서

- [`docs/operations.md`](./docs/operations.md) — 운영 배포 가이드
- [`docs/handoff.md`](./docs/handoff.md) — 최근 세션 핸드오프
- [`docs/ERD.md`](./docs/ERD.md) — 데이터 모델
- [`docs/v2-spec.md`](./docs/v2-spec.md) — Phase 2 핵심 로직 명세

## 라이선스 / 기여

내부 프로젝트.
