# Phase 1 실행 계획 (Planner 산출물)

> 입력: `.pipeline/requirement.md` + `C:/Users/USER/.claude/plans/refactored-mixing-duckling.md`
> 범위: **Phase 1 (기반: Entity + Migration)** 만. Phase 2-5는 별도 호출.

---

## 0. 충돌 사항 및 결정

| # | 사용자 지시 | 충돌 | 결정 |
|---|------------|------|------|
| C1 | DoD "폐기 엔티티 제거 (PointLog/BettingQuestion/BettingTicket/ShopPurchase/GameRoom 등)" | 본 엔티티들을 의존하는 서비스(`wallet.service`, `betting.service`, `shop.service`)는 Phase 2 재작성 예정 → Phase 1에서 제거 시 빌드 깨짐 | **공존 전략**: 신규 엔티티는 추가하고, 폐기 대상 중 *상호 의존이 없는 GameRoom 계열은 유지(Phase 5에서 삭제)*. PointLog/BettingQuestion/BettingTicket/ShopPurchase는 **Phase 2에서 서비스 재작성과 함께 제거**. Phase 1에서는 신규 엔티티만 추가하고 마이그레이션에 둘 다 포함. |
| C2 | "Phase 1엔 엔티티만 정리, 모듈 삭제는 Phase 5" vs "폐기 엔티티 제거" | 자기모순 | C1 결정 채택 (안전 우선) |
| C3 | "단일 클랜 전제 - clanId 의존 코드 제거 진행" | 80+ 파일 영향, Phase 1 스코프 초과 | **Phase 1에서는 User 확장과 신규 엔티티에 clanId 미포함**만 적용. 기존 코드의 clanId 제거는 Phase 2-3에서. |

→ 사용자에게 REPORT-phase1.md에서 명시.

---

## 1. 태스크 분할 (의존성 그래프)

```
T01 (TypeORM migration 인프라)
  ├─ T02 (User 확장)
  ├─ T03 (PointTx 엔티티)
  ├─ T04 (Match/Team/TeamMember 엔티티)
  ├─ T05 (BettingMarket 엔티티)
  ├─ T06 (MarketOrder 엔티티)
  ├─ T07 (SystemConfig 엔티티)
  └─ T08 (AttendanceLog 검토)

T03 ──> T09 (LedgerModule 골격)
T04 ──> T10 (MatchModule 골격)

T01..T08 ──> T11 (baseline 마이그레이션 생성)
T11 ──> T12 (빌드 + 타입체크)
T12 ──> T13 (ERD.md 갱신)
```

병렬 가능: T02-T08 (T01 이후), T09/T10 (각자 deps 후).

---

## 2. 태스크 상세

### T01: TypeORM 마이그레이션 인프라 도입
- `backend/src/database/data-source.ts` 신규 — TypeORM CLI용 DataSource export
- `backend/src/database/migrations/` 디렉토리 생성
- `app.module.ts`의 TypeOrmModule.forRootAsync에 `synchronize: false`, `migrations: [...]`, `migrationsRun: true` 설정
- `backend/package.json` 스크립트 추가: `migration:generate`, `migration:run`, `migration:revert`, `typeorm`
- `.env`에는 변경 없음

### T02: User 엔티티 확장
파일: `backend/src/modules/users/entities/user.entity.ts`
- `UserRole`에 `CAPTAIN = 'CAPTAIN'` 추가 (3-tier)
- 컬럼 추가:
  - `discordId: string` `{ unique: true, nullable: true, name: 'discord_id' }`
  - `pointsBalance: number` `{ default: 0, name: 'points_balance' }` — PointTx 합 캐시
  - `marketGatePassed: boolean` `{ default: false, name: 'market_gate_passed' }`
- 기존 컬럼 보존 (battleTag, email, password, role 등)

### T03: PointTx 신규 엔티티 (LedgerModule)
- 디렉토리: `backend/src/modules/ledger/`
  - `entities/point-tx.entity.ts`
  - `ledger.module.ts`
- 엔티티 스키마 (`point_tx`):
  - `id: uuid PK`
  - `fromAccount: string` (nullable; null = mint, SINK 가상계정 ID = '00000000-0000-0000-0000-000000000000')
  - `toAccount: string` (nullable; null = burn)
  - `amount: bigint` (positive, integer)
  - `reason: string` (예: `SEED`, `BET_STAKE:{marketId}`, `BET_PAYOUT:{marketId}`, `RAKE:{marketId}`, `MARKET_BUY:{orderId}`, `REFUND:{orderId}`)
  - `refType: string nullable` (예: `BettingMarket`, `MarketOrder`, `Match`)
  - `refId: string nullable`
  - `createdAt: timestamp` (append-only, no updatedAt)
- 인덱스: `(from_account)`, `(to_account)`, `(ref_type, ref_id)`, `(created_at)`
- `SINK_ACCOUNT_ID` 상수: `backend/src/modules/ledger/ledger.constants.ts` — `'00000000-0000-0000-0000-000000000000'`

### T04: Match/Team/TeamMember 엔티티 (MatchModule)
- 디렉토리: `backend/src/modules/matches/`
- 엔티티:
  - `Match`: `{ id, title, scheduledAt, status (enum: DRAFT|BETTING_OPEN|LOCKED|SETTLED|CANCELLED), winnerTeamId nullable, settledAt nullable }`
  - `Team`: `{ id, matchId FK, name, captainId FK→User (nullable), placement nullable (1~4) }`
  - `TeamMember`: `{ id, teamId FK, userId FK, bidPrice nullable }`
- 상태머신 enum: `backend/src/modules/matches/enums/match-status.enum.ts`

### T05: BettingMarket 엔티티
- 파일: `backend/src/modules/betting/entities/betting-market.entity.ts`
- 스키마:
  - `id, matchId FK, type (enum: WIN | RANK), status (enum: OPEN | LOCKED | SETTLED | CANCELLED)`
  - `lockedAt nullable, settledAt nullable`
  - `winningOption nullable` (string; teamId 또는 placement)
  - `totalPool: bigint default 0`, `rakeBps: int default 500` (5%)
- BettingTicket의 후속(개별 베팅)도 신규로 하되 본 Phase에서는 `BettingMarket`만 추가하고 stake 테이블은 Phase 2에서 추가 (서비스 재작성과 함께)
- 기존 `BettingQuestion`/`BettingTicket` 엔티티는 **유지** (Phase 2 재작성 시 제거)

### T06: MarketOrder 엔티티
- 파일: `backend/src/modules/shop/entities/market-order.entity.ts`
- 스키마:
  - `id, productId FK→ShopProduct, buyerId FK→User`
  - `quantity, unitPrice, totalPrice (bigint)`
  - `status (enum: 구매완료|전달완료|취소 → CODE: COMPLETED|DELIVERED|CANCELLED)`
  - `deliveredAt nullable, cancelledAt nullable, adminNote nullable`
- 기존 `ShopPurchase` 엔티티 **유지** (Phase 2에서 서비스 재작성과 함께 제거)

### T07: SystemConfig 엔티티 + 시드
- 디렉토리: `backend/src/modules/system-config/`
- 엔티티 `system_config`:
  - `key: string PK`
  - `value: string` (JSON 직렬화)
  - `description: string nullable`
  - `updatedAt`
- 모듈/서비스 골격: `SystemConfigService.get<T>(key, defaultValue)`, `set(key, value)`
- 시드 마이그레이션 (T11 일부):
  - `SEED_AMOUNT = 1000`
  - `MONTHLY_CAP = 5000`
  - `RAKE_BPS = 500`
  - `MARKET_GATE_ATTENDANCE_DAYS = 7`
  - `MARKET_GATE_MATCH_COUNT = 2`

### T08: AttendanceLog 검토/확장
- 기존 `AttendanceRecord` 분석 결과: `memberId → ClanMember` FK (clanId scope). 본 Phase에서는 **새로운 통합 `AttendanceLog` 엔티티를 추가하지 않고**, 기존 `AttendanceRecord` 보존. Phase 2에서 마켓 게이트 검증 로직 작성 시 `User.id` 기반 쿼리 헬퍼 추가.
- 사유: requirement는 "검토/확장"으로 명시 — 신규 추가 없이 보존하는 것이 안전.

### T09: LedgerModule 골격
- `LedgerService`: `transfer({from, to, amount, reason, refType?, refId?})` 메서드만 (구현은 Phase 2에서)
- 본 Phase에서는 메서드 시그니처와 `throw new Error('Not implemented in Phase 1')`만

### T10: MatchModule 골격
- `MatchService`: `create, openBetting, lock, settle, cancel` 시그니처만
- 상태머신 가드는 인터페이스만 정의

### T11: 초기 마이그레이션 생성
- `backend/src/database/migrations/{timestamp}-baseline.ts`
- DB가 비어있다고 가정 → 전체 CREATE TABLE 마이그레이션 (기존 엔티티 + 신규 엔티티 모두 포함)
- 수동 작성보다 TypeORM `migration:generate` 사용 권장이나, DB가 비어있는 환경에서 일관성 확보를 위해 **수동 작성** (synchronize: true의 산물과 동일 스키마)
- SystemConfig 시드는 별도 마이그레이션 `{timestamp}-seed-system-config.ts`

### T12: 빌드 + 타입체크 + 테스트
- `cd backend && npm run build`
- 기존 테스트 통과 (`npm test`)
- 기존 테스트 중 폐기된 서비스 의존 테스트가 깨지면 → Phase 2에서 정리. 본 Phase에서는 새 entity 추가만 했으므로 기존 테스트는 영향 없어야 함.

### T13: ERD 갱신
- `docs/erd.md` 또는 `docs/ERD.md` — User 확장 + 신규 엔티티 8종 추가
- 폐기 예정 엔티티에는 "(Phase 2 폐기 예정)" 마킹

---

## 3. 자동 FAIL 리뷰 기준 자가체크

- `any` 타입: 사용 안 함 ✓
- 빌드 실패: T12에서 검증 ✓
- 하드코딩 시크릿: 없음 ✓
- SQL 인젝션: 모두 ORM 사용 ✓
- 태스크 범위: User 확장 + 신규 엔티티 + 마이그레이션 인프라만 ✓

---

## 4. 비포함 (Phase 2-5로 미룸)

- BettingService 패리뮤추얼 재작성 → Phase 2
- ShopService 즉시차감 재작성 → Phase 2
- WalletService → Phase 2 (PointTx 기반 재작성)
- clanId 의존 제거 → Phase 2-3
- 마켓 게이트 가드 → Phase 2
- 디스코드 OAuth → Phase 3
- 프론트엔드 → Phase 4
- 모듈 삭제 (GamesModule 등) → Phase 5

