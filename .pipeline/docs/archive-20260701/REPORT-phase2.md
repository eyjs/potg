# Phase 2 완료 리포트 — 핵심 비즈니스 로직

> 작성일: 2026-05-22
> 범위: Phase 2 (Ledger / Betting / Shop / Match / MarketGate / Wallet 재작성 + 폐기 엔티티 4종 제거)
> 상태: ✅ 완료 (build PASS, 신규 테스트 12 PASS)

---

## 1. 산출물 요약

### 1.1 신규/재작성 서비스
| 영역 | 파일 | 핵심 |
|------|------|------|
| Ledger | `backend/src/modules/ledger/ledger.service.ts` | 복식부기 `PointTx` mint/burn/transfer. `#SINK` 가상계정 = `'00000000-0000-0000-0000-000000000000'`. |
| Betting | `backend/src/modules/betting/betting.service.ts` | 패리뮤추얼 풀 분배. 5% rake → SINK. `LOCKED` 이후 변경 차단. WIN/RANK 마켓 정산. |
| Shop | `backend/src/modules/shop/shop.service.ts` | 즉시소각 (구매 시 buyer → SINK). 재고 원자적 차감 (`UPDATE stock = stock - 1 WHERE stock > 0`). `MarketOrder` 생성. |
| Match | `backend/src/modules/matches/match.service.ts` | 상태머신 `DRAFT → BETTING_OPEN → LOCKED → SETTLED`. 정산 시 BettingMarket 연쇄 settle. |
| MarketGate | `backend/src/common/guards/market-gate.guard.ts` | 출석 7일 + 내전 2회 게이트. SystemConfig에서 임계값 로드. |
| Wallet | `backend/src/modules/wallet/wallet.service.ts` | `User.pointsBalance` 캐시 기반 잔액/송금. PointLog 의존 제거. |

### 1.2 폐기 엔티티 4종 (코드 + DROP 마이그레이션)
- `PointLog` → `PointTx`로 대체
- `BettingQuestion` → `BettingMarket`
- `BettingTicket` → `BettingStake`
- `ShopPurchase` → `MarketOrder`

### 1.3 마이그레이션 체인
```
backend/src/database/migrations/
├── 1747900000000-Baseline.ts             (placeholder, 클린 DB용)
├── 1747900001000-Phase1DiscordRefactor.ts (User 확장 + 신규 9개 테이블)
└── 1747900002000-Phase2CoreLogic.ts       (폐기 4개 테이블 DROP)
```

### 1.4 신규 테스트
| 파일 | 케이스 | 결과 |
|------|--------|------|
| `backend/src/modules/ledger/ledger.service.spec.ts` | mint/burn/transfer + SINK 무결성 7케이스 | PASS |
| `backend/src/modules/betting/betting.service.spec.ts` | 패리뮤추얼 분배 + LOCKED 차단 + rake 5케이스 | PASS |
| **합계** | **12** | **12 PASS** |

### 1.5 회귀 수정
- `shop-profile-items.service.spec.ts` — ShopPurchase 폐기 반영 + LedgerService 주입
- `clans.service.spec.ts` (test/unit) — PointLog → PointTx + DataSource DI 보강

---

## 2. 검증

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ PASS |
| Phase 2 신규 spec (ledger + betting) | ✅ 12 PASS |
| 기존 통과 spec 회귀 | ✅ 영향 없음 |
| Phase 1 통과 spec | ✅ 유지 |

### 사전 존재 실패 (Phase 2 범위 외)
- `test/unit/auth/auth.service.spec.ts` — JWT 환경변수 미주입 (Phase 1과 동일)
- `src/modules/posts/posts-bulk-like.service.spec.ts` — ClanMemberRepository DI 누락
- `test/app.e2e-spec.ts` — uuid ESM 트랜스폼 이슈
- `profiles-equip.service.spec.ts` — Mock 타입 캐스팅 (Phase 2 외)

→ 이후 Phase 5 정리 단계에서 수렴 예정.

---

## 3. 주요 결정 사항

| # | 결정 | 사유 |
|---|------|------|
| D1 | RANK 마켓 정산 시 `winningOption = '1'`로 단순화 | 요구사항 §5.1 RANK 정책 모호. Phase 3/4 운영 검토 후 재정의. |
| D2 | `BettingStake (market_id, user_id, side)` UNIQUE 제약 미적용 | 서비스 합산 로직만으로 충분. 재고와 달리 동시성 충돌 영향 적음. Phase 4 운영 데이터 확인 후 검토. |
| D3 | `ClanMember.scrimPoints` 컬럼 보존 | 활동 피드 호환 위해 Phase 5까지 유지. `ScrimResultsService.addScrimPoints`는 scrimPoints+activityPoints 통합 mint로 변경. |
| D4 | `ShopController` 프로필 아이템 API 잔존 | ClanMember 식별 코드만 유지. Phase 5에서 정리. |
| D5 | `ClansService` 활동 피드 = PointTx 기반 | 사용자 정보 풍부도는 Phase 4 관리자 웹에서 보강 |
| D6 | 베이스라인 마이그레이션 = placeholder 전략 | 클린 DB 첫 부트 시 `SYNC_SCHEMA=true` 1회 또는 `migration:generate`로 통합 baseline 재생성 권장 |

---

## 4. ERD 갱신

`docs/ERD.md` 업데이트 항목:
- PointTx (append-only 원장)
- Match / Team / TeamMember
- BettingMarket / BettingStake
- MarketOrder
- SystemConfig
- User 확장 (discordId, pointsBalance, marketGatePassed, CAPTAIN role)
- 폐기 4종 표기 (취소선)

---

## 5. 다음 Phase 진입 조건

- [x] 빌드 통과
- [x] 신규 테스트 통과
- [x] 폐기 엔티티 4종 DROP 마이그레이션 작성
- [x] ERD 최신화
- [x] Phase 2 산출물 커밋 준비 완료
- [ ] **Phase 3 (Discord Bot) 착수** — discord.js 설치 + DiscordBotModule 스캐폴드 + 슬래시 명령 7종 + Components V2 + OAuth2

---

## 6. 알려진 리스크

1. **베이스라인 placeholder** — 신규 환경 첫 부트 시 SYNC_SCHEMA 1회 필요. 운영 배포 전 통합 baseline 재생성 권장.
2. **RANK 정산 단순화** — 디스코드 봇 RANK 명령 활성화 전 정책 확정 필요.
3. **CRLF/LF 경고** — Windows 환경 한정 (git 자동 변환). 기능 영향 없음.
