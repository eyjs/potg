# POTG 리팩토링 요구사항: 디스코드 봇 + 관리자 웹 분리

> 작성일: 2026-05-22
> 작성자: Claude (Consultant Mode)
> 벤치마크: UnbelievaBoat (웹=관리, 디스코드=플레이 패턴)
> 상태: **컨설팅 완료 · `/go` 대기**

---

## 1. 배경 및 목적

### 1.1 현재 상태
- POTG는 Monorepo (Next.js 16 frontend + NestJS 11 backend) 기반 오버워치 클랜 커뮤니티 시스템
- 모든 기능이 웹 중심 (베팅, 상점, 경매, 파티게임, 라이어 게임, 그림 게임 등)
- 포인트는 클랜 스코프 (`ClanMember.totalPoints/lockedPoints`)

### 1.2 목표
**사용자 채널을 디스코드 봇으로 이관**, 웹은 100% 관리자 전용으로 축소하여 모임 운영 자동화. UnbelievaBoat 패턴을 차용하되 우리 모임 고유 요소(경매로 팀 구성, 실물 마켓)를 결합.

### 1.3 핵심 원칙
| 주체 | 인터페이스 | 역할 |
|------|-----------|------|
| 관리자 + 팀장 | **웹 대시보드** | 상품 등록, 내전 생성/정산, 경매(팀장), 경제 설정 |
| 일반 사용자 | **디스코드 봇만** | 잔액 조회, 베팅, 상품 구매, 리더보드, 출석 |

---

## 2. 운영 범위 (확정 사항)

### 2.1 단일 클랜 전용
- 우리 모임 디스코드 하나만 운영
- 코드에서 `clanId` 의존성 제거, ERD 단순화 (`Member` 전역)
- 기존 `ClanMember` 구조 → `Member`로 통합

### 2.2 경매는 웹 전용 (디스코드 제외)
- 팀장(captain)만 접근, 매주 일요일 정규 내전 시 웹에서 경매 진행
- 일반 사용자는 디스코드에서 베팅만 (경매 입찰 X)
- 기존 `AuctionsModule` **유지 + 권한 강화** (팀장 + 관리자만)

### 2.3 베팅 = 밀봉 패리뮤추얼
- 타인의 베팅액/선택 비공개 (sealed)
- 패리뮤추얼 풀 분배 (§4 경제 모델)
- `LOCKED` 상태 이후 변경 불가 (서버단 강제)

---

## 3. 포인트 경제 (확정 파라미터)

### 3.1 발행 (Faucet)
| 항목 | 값 |
|------|----|
| 가입 시드 | **1,000P** (일시 지급) |
| 월 적립 상한 | **5,000P** (1인 기준, "커피 한잔") |
| 적립 트리거 | 출석체크 / 내전 참여 / 기타 (**관리자 설정 가능**) |

### 3.2 재분배 (베팅, 제로섬)
- 패리뮤추얼 방식: `payout = stake × (총 풀 / 당첨측 스테이크 합)`
- 베팅 종류: `WIN` (승패) + `RANK` (1~4등 순위)

### 3.3 소각 (Sink)
| 항목 | 값 |
|------|----|
| Rake (베팅 수수료) | **5%** (풀에서 선공제 후 `#SINK` 이체) |
| 마켓 구매 | 구매액 100% `#SINK` 이체 |

### 3.4 회계 원칙
- **복식부기 원장**: `POINT_TX` append-only
- 소각 = `#SINK` 가상 계정으로 이체 (잔액에서 직접 차감 금지)
- `member.points_balance` = `POINT_TX` 합의 캐시
- 언제든 `총발행 / 총소각 / 유통량` 도출 가능

### 3.5 관리자 설정 (`SystemConfig`)
모든 경제 파라미터는 관리자 웹에서 조정 가능해야 함:
- 가입 시드, 월 상한, Rake %, 적립 트리거별 포인트, 마켓 게이트 임계값

---

## 4. 어뷰징 방지

### 4.1 계정 무결성
- `discord_id` UNIQUE 제약 (1인 1계정 강제)

### 4.2 마켓 게이트 (`market_gate`)
실물 상품 구매 가능 조건:
- **출석 7일 이상** AND **내전 2회 이상 참여**
- 두 조건 모두 충족해야 마켓 접근 허용
- 관리자 웹에서 임계값 조정 가능

### 4.3 내전 참석자 엑셀 업로드
- 매주 일요일 정규 내전 종료 후 관리자가 참석자 명단을 엑셀로 일괄 업로드
- 업로드된 명단 기반으로 `attendance_count` 증분
- 마켓 게이트 검증의 데이터 소스

---

## 5. 베팅 설계

### 5.1 MATCH 상태머신
```
DRAFT (경매·팀구성)
  ↓
BETTING_OPEN (베팅 접수)
  ↓
LOCKED (경기 시작·마감)
  ↓
SETTLED (결과·정산)
```

### 5.2 공정성 강제 (서버단)
- `LOCKED` 이후 베팅 신규/수정/취소 불가
- `LOCKED` 이후 결과/배당 조작 불가 (관리자도 못 함)
- 패리뮤추얼이므로 관리자가 배당률 임의 변경 불가능 (구조적)

### 5.3 베팅 윈도우
- 경매(DRAFT) 종료 → `BETTING_OPEN`으로 자동/수동 전환
- 경기 시작 직전 관리자가 `LOCKED` 전환
- 경기 종료 후 관리자가 결과 입력 → `SETTLED` (정산 자동)

---

## 6. 마켓 설계

### 6.1 관리자 (웹)
- 상품 등록: 이름, 이미지, 가격(P), 재고, 후원자, 카테고리
- 주문 관리: 구매완료 알림 수신 → 실물 전달 → `DELIVERED` 처리
- 취소 처리: 환불 (포인트 복원) + 재고 복구

### 6.2 사용자 (디스코드)
- `/상점` — Components V2 카드로 상품 열람
- `/구매 [상품]` — 즉시 차감(에스크로), 재고 원자적 차감
- 구매 처리 흐름:
  1. 마켓 게이트 검증 (출석 7일 + 내전 2회)
  2. 포인트 잔액 검증
  3. `UPDATE stock = stock - 1 WHERE stock > 0` 원자적 차감
  4. `POINT_TX`: 구매자 → `#SINK` 이체 (즉시 차감)
  5. `MarketOrder` 생성 (`구매완료` 상태)
  6. 관리자 알림

### 6.3 주문 상태
| 상태 | 의미 |
|------|------|
| `구매완료` | 포인트 차감 완료, 실물 전달 대기 |
| `전달완료` | 관리자가 실물 전달 후 마킹 |
| `취소` | 환불 + 재고 복구 |

---

## 7. 디스코드 봇

### 7.1 배포 방식
- **NestJS 모놀리식 내부 모듈** (`DiscordBotModule`)
- 별도 워커 분리 안 함 (홈서버 단일 프로세스)
- discord.js 기반

### 7.2 슬래시 명령 (사용자)
| 명령 | 기능 |
|------|------|
| `/잔액` | 포인트 잔액 조회 |
| `/베팅 [내전][팀][금액]` | WIN 베팅 |
| `/순위예측 [내전][1~4등]` | RANK 베팅 |
| `/상점` | 상품 카드 열람 (Components V2) |
| `/구매 [상품]` | 상품 구매 |
| `/리더보드` | 포인트 랭킹 |
| `/출석` | 일일 출석체크 |

### 7.3 출력 시스템
- Components V2 사용 (Embed 미사용)
- `IS_COMPONENTS_V2` 플래그 (`1 << 15`)
- 상품 카드: `Container` + `Text Display` + `Media Gallery` + `Button`

---

## 8. 데이터 모델 (변경 사항)

### 8.1 신규 엔티티
| 엔티티 | 비고 |
|--------|------|
| `Member` | 통합 사용자 (clan 의존 제거, `discord_id` UNIQUE) |
| `PointTx` | 복식부기 원장 (append-only) |
| `Match` | 내전 (상태머신) |
| `Team` | 내전 팀 (경매 결과) |
| `TeamMember` | 팀 로스터 |
| `BettingMarket` | WIN/RANK 베팅 마켓 (matchId FK) |
| `MarketOrder` | 마켓 주문 |
| `SystemConfig` | 경제 파라미터 (관리자 조정) |
| `AttendanceLog` | 일일 출석 + 내전 참석 |
| `MarketGateStatus` | 게이트 통과 여부 캐시 |

### 8.2 개조 엔티티
| 엔티티 | 변경 |
|--------|------|
| `User` | `discord_id`, `points_balance` (캐시), `market_gate` 추가 |
| `BettingQuestion` → `BettingMarket` | matchId FK, type (WIN/RANK), 패리뮤추얼 |
| `ShopProduct` | 기존 유지, 카테고리/후원자 정리 |
| `ShopPurchase` → `MarketOrder` | 상태값 재정의 (구매완료/전달완료/취소) |

### 8.3 폐기 엔티티
| 엔티티 | 사유 |
|--------|------|
| `ClanMember.totalPoints/lockedPoints` | 단일 클랜 → 전역 `Member` 통합 |
| `PointLog` | `PointTx`로 대체 (read-only 아카이브로 보존) |
| `GameRoom`, `GameRoomPlayer` | 파티게임 폐기 |

### 8.4 PointTx 마이그레이션 전략
**완전 클린 시작** (사용자 승인: DB 전체 초기화 OK):
1. 기존 DB 전체 드롭 후 신규 스키마로 재생성
2. 기존 잔액/이력 이관 없음 (`INITIAL_MIGRATION` tx 불필요)
3. 신규 가입자는 시드 1,000P 발행으로 시작
4. `PointLog` 테이블 자체 폐기 (legacy 아카이브 불필요)

---

## 9. 폐기 범위 (확정)

### 9.1 백엔드 모듈 폐기
- `GamesModule` 전체 (파티게임/라이어/그림/끝말잇기)
- `quiz.gateway.ts`, `game.gateway.ts` (소켓)
- 최근 5커밋 작업분 (`135093d`, `bfbee50`, `e8236e9`, `30b281b`) — git 히스토리에만 남김 (별도 아카이브 브랜치 없음, 사용자 승인)

### 9.2 프론트엔드 페이지 폐기
- `/utility/quiz` (퀴즈 배틀)
- `/gallery/*` (이미지 갤러리)
- `/profile/shop` (프로필 꾸미기 상점)
- 사용자용 `/betting/*`, `/shop` (디스코드 이관)
- 사용자용 `/wallet`, `/ranking` (디스코드 이관)

### 9.3 보존
- `AuctionsModule` (웹 전용, 팀장 권한 강화)
- `OverwatchModule` (OW 프로필 연동)
- `ProfilesModule`, `PostsModule`, `AttendanceModule`
- `auction.gateway.ts` (경매 실시간 입찰, 팀장만)

---

## 10. 프론트엔드 (관리자 웹)

### 10.1 전체 재구성
- 기존 사용자 페이지 일괄 삭제
- `/admin/*` 트리로 새로 구성
- Next.js 16 + Shadcn UI 유지 (자산 재활용)
- 오버워치 테마 유지

### 10.2 주요 화면
| 경로 | 화면 |
|------|------|
| `/admin` | 경제 대시보드 (총발행/소각/유통량 그래프) |
| `/admin/matches` | 내전 생성/관리 (상태머신 컨트롤) |
| `/admin/matches/[id]/auction` | 경매 (팀장 접근, 기존 로직 재활용) |
| `/admin/matches/[id]/settle` | 결과 입력/정산 |
| `/admin/products` | 상품 등록/재고 관리 |
| `/admin/orders` | 주문 관리 (구매완료 → 전달완료) |
| `/admin/members` | 회원 관리 (잔액 조정, 마켓 게이트 상태) |
| `/admin/attendance` | 출석/내전 참석자 엑셀 업로드 |
| `/admin/config` | 경제 파라미터 설정 (시드, 상한, Rake 등) |
| `/admin/ledger` | `PointTx` 원장 조회 (분쟁 추적) |

---

## 10.5 인증 (Discord OAuth2)

### 10.5.1 자동 계정 생성
- **봇 우선**: 사용자가 디스코드에서 슬래시 명령 첫 사용 시 봇이 `Member` 자동 생성 (`discord_id`, `username`, `avatar`) + 시드 1,000P 발행
- **웹 우선**: 웹의 "Discord로 로그인" 버튼 → OAuth2 콜백에서 동일 처리
- `discord_id` UNIQUE 제약으로 중복 방지 (양방향 어느 쪽이든 동일 계정)

### 10.5.2 권한 모델
| 역할 | 디스코드 | 웹 접근 |
|------|---------|---------|
| `user` | 모든 슬래시 명령 | 본인 정보 read-only만 |
| `captain` | + 팀장 명령 (있다면) | `/admin/matches/[id]/auction` 경매 페이지 |
| `admin` | + 관리자 명령 | 모든 `/admin/*` 페이지 |

- 역할 부여: 관리자가 `/admin/members`에서 수동 설정
- JWT 토큰은 Discord OAuth 콜백 후 발급 (기존 passport-jwt 재활용)

### 10.5.3 기존 회원 마이그레이션
- 자체 회원가입 흐름 폐기 (아이디/비번 가입 제거)
- 기존 회원 → 관리자가 엑셀로 `userId ↔ discord_id` 매핑 일괄 업로드
- 미매핑 회원은 다음 로그인 시 Discord 연동 강제

---

## 11. 기술 스택 (변경 없음)

| 영역 | 스택 |
|------|------|
| Backend | NestJS 11 + TypeORM + PostgreSQL 16 |
| Frontend | Next.js 16 (App Router) + Shadcn UI + Tailwind |
| Discord Bot | discord.js (NestJS 모듈로 통합) |
| 호스팅 | Mac Studio (M1 Max 64GB) 홈서버 |

---

## 12. 마이그레이션 단계 (Phase)

### Phase 1: 기반 (Entity + 마이그레이션)
- `Member`, `PointTx`, `Match`, `Team`, `TeamMember`, `BettingMarket`, `MarketOrder`, `SystemConfig`, `AttendanceLog` 신규
- `User.discord_id` 추가
- `INITIAL_MIGRATION` tx로 기존 잔액 이관

### Phase 2: 핵심 로직
- `LedgerModule` (PointTx 서비스, `#SINK` 이체)
- `BettingModule` 패리뮤추얼 재작성
- `MarketModule` (구매 핸들러, 마켓 게이트)
- `Match` 상태머신 + LOCKED 강제

### Phase 3: 디스코드 봇 + OAuth
- `DiscordBotModule` (discord.js 통합)
- 슬래시 명령 7종 구현
- Components V2 상품 카드
- Discord OAuth2 자동 가입 (봇 우선 / 웹 우선 양방향)
- 기존 회원 매핑 엑셀 업로드 도구

### Phase 4: 관리자 웹 신규
- `/admin/*` 페이지 재구성
- 경제 대시보드, 정산 UI, 엑셀 업로드

### Phase 5: 정리 (폐기)
- `GamesModule` 삭제
- 사용자용 프론트 페이지 삭제
- 사용자 인증 → 관리자/팀장 권한 가드만 남김

---

## 13. 완료 기준 (DoD)

- [ ] 디스코드에서 `/잔액`, `/베팅`, `/구매` 등 7개 명령 동작
- [ ] 관리자 웹에서 내전 생성 → 경매 → 베팅 오픈 → 정산 전체 흐름 동작
- [ ] `PointTx` 합 = `Member.points_balance` 일치 (회계 무결성)
- [ ] `LOCKED` 후 베팅 변경 불가 (보안 테스트 통과)
- [ ] 마켓 구매 시 재고 원자성 보장 (동시 구매 부하 테스트)
- [ ] 엑셀 업로드로 내전 참석자 일괄 처리
- [ ] 경제 파라미터 관리자 웹에서 조정 가능
- [ ] 기존 `GamesModule` / 사용자 프론트 페이지 제거 완료
- [ ] ERD 문서(`docs/erd.md`) 최신화

---

## 14. 미결정/추후 검토 (Non-blocking)

- LLM 연동 (경기 리캡 생성, 자연어 베팅 "3팀에 500 걸어줘") — Phase 6+
- 디스코드 역할 보상 (포인트로 VIP 역할 구매) — 필요시 추후
- 리더보드 시즌제 (월간 리셋 등) — 운영 데이터 본 후 결정
- 알림 시스템 (베팅 마감 임박, 상품 입고 등) — Phase 3.5 검토

---

## 부록: 참고 문서

- 컨셉 핸드오프: 본 세션 사용자 제공 (UnbelievaBoat 벤치마킹)
- 기존 코드베이스 격차 분석: 본 세션 Explore Agent 산출물
- ERD (기존): `docs/erd.md`
- 글로벌 규칙: `~/.claude/CLAUDE.md`
- POTG 백엔드 규칙: `.claude/rules/potg-backend.md`
- POTG UI 규칙: `.claude/rules/overwatch-ui.md`
