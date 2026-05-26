# 운영 가이드 (Operations)

POTG를 운영 환경에 배포 / 운영 / 롤백하는 절차.

---

## 1. Discord 봇 발급

1. https://discord.com/developers/applications → "New Application"
2. **Bot** 탭:
   - "Add Bot" → `Reset Token` 으로 토큰 발급 → `.env`의 `DISCORD_BOT_TOKEN`
   - **Privileged Gateway Intents** — 모두 OFF (POTG는 음성채널 상태만 사용 → privileged 불필요)
3. **OAuth2** 탭:
   - `Client ID` → `DISCORD_CLIENT_ID`
   - `Client Secret` → `DISCORD_CLIENT_SECRET` (OAuth 활성화 시)
4. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `View Channels`, `Connect`(음성채널 상태 보기에 충분)
   - 생성된 URL을 길드 마스터에게 전달하여 초대
5. 길드 ID 복사 → `DISCORD_GUILD_ID` (개발자 모드 ON 후 길드 우클릭)

봇이 초대되고 `DISCORD_BOT_ENABLED=true` + 토큰이 채워지면 backend 부팅 시 슬래시 명령이 자동 등록됨.

길드 등록 = 즉시 반영. `DISCORD_GUILD_ID` 비우면 글로벌 등록(최대 1시간 지연) — 일반 권장 X.

---

## 2. 환경변수 체크리스트

`backend/.env`에서:

| 키 | 운영 | 비고 |
|----|------|------|
| `NODE_ENV` | `production` | 파일 로깅 + 캐시 활성 |
| `JWT_SECRET` | 32+ bytes | `openssl rand -base64 48` |
| `DATABASE_*` | 강한 패스워드 | docker-compose env와 동기화 |
| `DISCORD_BOT_ENABLED` | `true` | 봇 활성 |
| `DISCORD_BOT_TOKEN` | (발급값) | |
| `DISCORD_CLIENT_ID` | (Application ID) | |
| `DISCORD_GUILD_ID` | (길드 ID) | 권장 (즉시 등록) |
| `DISCORD_COMMAND_CHANNEL_IDS` | 콤마 분리 채널 ID | 비우면 모든 채널 허용 |
| `DISCORD_VOICE_ATTENDANCE_MIN_MINUTES` | `10` | 음성 출석 최소 시간 |
| `DISCORD_BETTING_NOTIFY_CHANNEL_ID` | 알림 채널 ID | 비우면 알림 silent |

채널 ID 얻는 법: Discord 설정 → Advanced → Developer Mode ON → 채널 우클릭 → "ID 복사"

---

## 3. 마이그레이션

### 최초 실행

```bash
docker-compose up -d db   # postgres 먼저
docker exec potg-backend npm run migration:run
```

`backend/src/database/migrations/` 의 5개 파일이 순차 적용. `typeorm_migrations` 테이블에 기록.

### 신규 마이그레이션 추가

```bash
cd backend
npm run typeorm -- migration:create src/database/migrations/MyChange
# (또는 자동 생성)
npm run typeorm -- migration:generate src/database/migrations/MyChange -d src/database/data-source.ts
```

타임스탬프 prefix 사용 (예: `1747900007000-MyChange.ts`).

### 롤백

```bash
docker exec potg-backend npm run migration:revert
```

가장 최근 마이그레이션 1개 되돌림. **운영에서는 데이터 손실 확인 후 사용**.

### 상태 확인

```bash
docker exec potg-backend npm run migration:show
```

---

## 4. 배포 / 재시작

### 일반 배포

```bash
git pull
docker-compose build backend frontend
docker-compose up -d
docker exec potg-backend npm run migration:run  # 마이그레이션 있을 때만
curl http://localhost:8100/health
```

CI/CD (GitHub Actions, `.github/workflows/deploy-backend.yml`)이 self-hosted runner에서 위 과정을 자동 수행.

### 무중단 재시작 (현재 미지원)

docker-compose는 컨테이너 중단 → 재기동 패턴. 진정한 zero-downtime은 별도 로드밸런서/blue-green 인프라 필요 (P2 백로그).

### 로그 확인

```bash
docker logs -f potg-backend
# 또는 파일 (NODE_ENV=production)
docker exec potg-backend tail -f logs/combined.log
docker exec potg-backend tail -f logs/error.log
```

---

## 5. 헬스 체크

```bash
curl http://localhost:8100/health
```

응답:
```json
{
  "status": "ok",
  "uptime": 12345,
  "db": true,
  "discord": { "enabled": true, "ready": true },
  "timestamp": "2026-05-26T..."
}
```

- `status: degraded` — 컴포넌트 일부 비정상. 200 그대로 응답
- `db: false` — PostgreSQL 연결 끊김 → 컨테이너 재시작 또는 DB 점검
- `discord.enabled: true, ready: false` — 토큰/네트워크 문제. backend 로그 확인

---

## 6. 백업

**현재 자동화 X (P2 백로그)**. 수동 백업:

```bash
# 백업
docker exec potg-postgres pg_dump -U postgres potg_db > backup-$(date +%Y%m%d).sql

# 복원
cat backup-20260526.sql | docker exec -i potg-postgres psql -U postgres potg_db
```

운영 환경에서는 cron + S3 등으로 자동화 권장.

---

## 7. Discord 슬래시 명령 재등록

봇 코드 변경 후 슬래시 명령 정의가 바뀌면 backend 재기동만으로 자동 반영 (길드 등록은 즉시).

수동 재등록이 필요하면 backend 재시작.

명령이 안 보이는 경우:
- Discord 클라이언트 캐시 — `Ctrl+R`
- 봇이 `applications.commands` scope로 초대됐는지 확인
- 길드 ID가 일치하는지 확인
- backend 로그에서 `Published N slash command(s)` 메시지 확인

---

## 8. 자주 묻는 문제

### "JWT_SECRET is required" 부팅 에러
→ `.env`에 `JWT_SECRET` 16자 이상 설정. dev에서는 `dev_secret_key_for_local_development_only_change_in_prod` 같은 값 가능.

### Discord 봇이 명령에 응답 안함
→ `DISCORD_COMMAND_CHANNEL_IDS` 설정 시 해당 채널에서만 가능. DM은 항상 가능.

### 음성채널 출석이 안 됨
→ 봇 권한 `Connect` (음성채널 상태 보기) 필요. `GatewayIntentBits.GuildVoiceStates` 활성 (코드에 이미 포함).
→ 봇 재시작 후 음성에 있던 유저는 그 시점부터 카운트 (재시작 전 시간은 카운트 안됨).

### 마이그레이션 conflict
→ 이미 적용된 마이그레이션 시도 시 typeorm이 자동 skip. 새 마이그레이션 작성 시 타임스탬프가 기존 최대값보다 크도록.

### 헬스체크가 degraded 상태로 고정
→ `discord.enabled=true` 인데 `ready=false`면 봇 토큰/네트워크 문제. backend 로그 확인.

---

## 9. 보안 운영 권장

- `JWT_SECRET` 노출 시 즉시 교체 → 기존 세션 모두 invalidate
- DB 패스워드 운영값은 secret manager 사용 권장 (현재 .env 직접 기록)
- helmet 적용됨 (main.ts) — CSP는 Swagger UI 호환 위해 dev에서 완화. frontend에서 별도 CSP 권장
- Discord 토큰은 절대 git에 커밋 X. `.env`는 `.gitignore` 확인
- CORS allowlist는 main.ts에 명시 — 프론트 도메인 변경 시 갱신

---

## 10. 비포함 (P2/P3 백로그)

- Sentry/APM 에러 추적
- DB 자동 백업 + 복구 훈련
- e2e 테스트 활성화 (DB 의존)
- 부정 사용 방어 강화 (rate limit 세분화)
- 봇 다운 시 명령 큐 / 재시도
- Hall of Fame 자동 갱신
