# 문서-Backend 구현 싱크 분석 보고서

**작성일:** 2026-01-20
**분석 범위:** docs/ 폴더의 PROCESS.md 문서들과 backend/src 구현 비교

---

## 요약 (Executive Summary)

### 전체 완성도: **70%**

- ✅ **완성된 모듈:** Wallet, Votes, Clans 기본 기능
- ⚠️ **부분 구현:** Betting (정산 로직 오류), Scrims (teamSnapshot 누락), Auctions (WebSocket 미구현)
- ❌ **미구현 핵심 기능:** Shop 쿠폰 시스템, Blind Date 매칭 알고리즘, Scrim 참가자 관리

---

## 모듈별 상세 분석

### 1. Betting System (베팅)

**문서 참조:** `docs/betting/PROCESS.md`

#### ✅ 구현된 기능
- [x] 베팅 문항 생성 (`createQuestion`)
- [x] 베팅 참여 시 lockedPoints 잠금 로직 (Line 63-64)
- [x] 정산 시 승자/패자 분류 및 포인트 업데이트
- [x] PointLog 자동 기록

#### ❌ 문제점

**1. 보상 계산 로직 오류 (Critical)**
```typescript
// 현재 구현 (betting.service.ts:106)
const reward = Math.floor(ticket.betAmount * question.rewardMultiplier);

// 문서 요구사항 (betting/PROCESS.md:156, 207)
const reward = Math.ceil(ticket.betAmount * question.rewardMultiplier);
```
- **영향:** 소수점 발생 시 사용자가 손해 (예: 333 × 1.5 = 499.5 → 499가 아닌 500을 받아야 함)
- **위치:** `backend/src/modules/betting/betting.service.ts:106`

**2. BettingTicket에 clanId 누락 (High)**
- 문서(ERD.md:257)에는 `BettingTicket.clanId` 필드 명시
- 엔티티 확인 필요: `backend/src/modules/betting/entities/betting-ticket.entity.ts`
- 영향: 다중 클랜 환경에서 포인트 추적 불가

**3. 베팅 수정 기능 미구현 (Medium)**
- 문서(betting/PROCESS.md:40-46): 마감 전 베팅 수정 가능
- 현재: 중복 베팅 시 에러만 발생 (placeBet에 upsert 로직 필요)

---

### 2. Scrim System (내전)

**문서 참조:** `docs/scrim/PROCESS.md`

#### ✅ 구현된 기능
- [x] 내전 생성 및 조회
- [x] 승리 팀 결정 로직 (teamAScore vs teamBScore)
- [x] 승리 보상 지급 (1000P)

#### ❌ 문제점

**1. teamSnapshot 저장 로직 누락 (Critical)**
```typescript
// 현재: finishScrim에서 단순 업데이트만
Object.assign(scrim, updateDto);

// 필요: 팀 확정 시 스냅샷 저장
scrim.teamSnapshot = {
  recruitmentType: scrim.recruitmentType,
  sourceId: scrim.voteId || scrim.auctionId,
  teamA: { players: [...] },
  teamB: { players: [...] },
  bench: [...],
  snapshotAt: new Date().toISOString()
};
```
- **문서 참조:** scrim/PROCESS.md:316-339, scrim/TEAM_SNAPSHOT_SCHEMA.md
- **영향:** 과거 내전 기록 조회 시 당시 팀 구성 확인 불가

**2. ScrimParticipant 관리 API 없음 (High)**
- 문서(scrim/PROCESS.md:209-259): 참가자 추가/제거/팀 배정 API 필요
- 현재: CRUD만 있고 참가자 관리 메서드 없음
- 필요 API:
  - `POST /scrims/:id/participants` (참가자 추가)
  - `PATCH /scrims/:id/participants/:userId/team` (팀 배정)
  - `DELETE /scrims/:id/participants/:userId` (참가자 제거)

**3. recruitmentType별 생성 로직 미분화 (Medium)**
- 문서: VOTE, AUCTION, MANUAL 각각 다른 프로세스
- 현재: 단일 create 메서드만 존재
- 영향: Vote/Auction 결과 기반 자동 생성 불가

---

### 3. Shop System (상점)

**문서 참조:** `docs/shop/PROCESS.md`

#### ✅ 구현된 기능
- [x] 상품 등록 (`createProduct`)
- [x] 구매 시 포인트 차감 및 재고 차감

#### ❌ 문제점

**1. 구매 승인 프로세스 누락 (Critical)**
```typescript
// 현재 (shop.service.ts:71)
status: PurchaseStatus.APPROVED, // Auto-approve

// 문서 요구사항 (shop/PROCESS.md:26-50)
// 1. 구매 요청 생성 (PENDING)
// 2. 클랜마스터 승인 대기
// 3. 승인 시 쿠폰 할당 및 포인트 차감
```
- **영향:** 클랜마스터의 재고 관리 권한 상실, 악의적 구매 방지 불가

**2. ShopCoupon 자동 발급 기능 전체 미구현 (Critical)**
```typescript
// 필요 로직 (shop/PROCESS.md:152-175)
const coupons = await trx.shopCoupon.findMany({
  where: { productId, isUsed: false },
  take: quantity
});
for (const coupon of coupons) {
  await trx.shopCoupon.update({
    where: { id: coupon.id },
    data: { isUsed: true, assignedTo: userId }
  });
}
```
- **문서 참조:** shop/PROCESS.md:86-110
- **영향:** 기프티콘 판매 시스템의 핵심 기능 불가

**3. purchaseLimit (인당 구매 제한) 미구현 (High)**
- 문서(shop/PROCESS.md:66, ERD.md:217): `ShopProduct.purchaseLimit` 필드 존재
- 현재: 체크 로직 없음
- 필요 로직:
```typescript
if (product.purchaseLimit > 0) {
  const myPurchases = await countApprovedPurchases(userId, productId);
  if (myPurchases + quantity > product.purchaseLimit) {
    throw new Error('구매 제한 초과');
  }
}
```

**4. 마이페이지 쿠폰 조회 API 없음 (Medium)**
- 문서(shop/PROCESS.md:193-202): 유저가 받은 쿠폰 목록 조회 필요
- 현재: 구현 없음

---

### 4. Blind Date System (소개팅)

**문서 참조:** `docs/blind-date/PROCESS.md`

#### ✅ 구현된 기능
- [x] 매물 등록 (`createListing`)
- [x] 요청 전송 (`requestDate`)
- [x] 기본 승인 로직 (`approveRequest`)

#### ❌ 문제점

**1. BlindDateMatch 생성 누락 (Critical)**
```typescript
// 현재 (blind-date.service.ts:67-68)
request.status = RequestStatus.APPROVED;
request.listing.status = ListingStatus.MATCHED;

// 필요 (blind-date/PROCESS.md:374-384)
await trx.blindDateMatch.create({
  listingId, requestId, clanId,
  registerId, requesterId,
  pointsAwarded
});
```
- **영향:** 매칭 이력 추적 불가, 통계 기능 불가

**2. 포인트 지급 로직 전체 누락 (Critical)**
- 문서(blind-date/PROCESS.md:444-478): 매칭 성공 시 등록자에게 500~1,250P 지급
- 현재: 포인트 관련 로직 전혀 없음
- 필요:
  - `calculateBlindDatePoints` 함수
  - ClanMember.totalPoints 증가
  - PointLog 생성

**3. BlindDatePreference 및 추천 시스템 미구현 (High)**
- 문서(blind-date/PROCESS.md:553-660): 희망 조건 기반 필터링
- 엔티티: `BlindDatePreference` (ERD.md:195-208)
- 현재: 전혀 구현 안 됨
- 필요 API:
  - `POST /listings/:id/preference` (희망 조건 설정)
  - `GET /listings?tab=recommended` (추천 매물)

**4. 트랜잭션 처리 없음 (High)**
- 문서(blind-date/PROCESS.md:326-407): 승인 시 복잡한 트랜잭션 필요
  - 요청 상태 변경
  - 매물 상태 변경
  - 나머지 요청 거절
  - 포인트 지급
  - PointLog 기록
  - Match 생성
- 현재: 단순 2개 업데이트만

**5. 권한 검증 로직 미완성 (Medium)**
```typescript
// 현재 (blind-date.service.ts:59-60)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async approveRequest(requestId: string, userId: string) {
  // In real app, check if userId is the owner (registerId) of the listing
```
- 주석으로만 표시, 실제 검증 없음

---

### 5. Auction System (경매)

**문서 참조:** `docs/auction/PROCESS.md`

#### ✅ 구현된 기능
- [x] 경매 생성 (`create`)
- [x] 참가자 입장 (`join`)
- [x] 입찰 (`placeBid`)

#### ❌ 문제점

**1. WebSocket Gateway 미구현 (Critical - P0)**
- 문서(auction/PROCESS.md:23-46): 실시간 입찰 경쟁
- FRONTEND_WORKFLOW.md:67-73: WebSocket 우선순위 P0
- 현재: REST API만 존재
- **영향:** 실시간 경매 불가능 (핵심 기능)

**2. 경매 상태 관리 로직 없음 (High)**
- 문서(auction/PROCESS.md:60-80): PENDING → ONGOING → COMPLETED
- 현재: 상태 전환 API 없음
- 필요: `startAuction`, `completeAuction` 메서드

**3. 낙찰 처리 로직 없음 (High)**
- 문서(auction/PROCESS.md:35-43): 시간 초과 시 최고 입찰자 확정
- 현재: 입찰만 기록, 낙찰 처리 없음
- 필요: 턴 타이머 및 낙찰 로직

**4. Scrim 생성 연동 없음 (Medium)**
- 문서(auction/PROCESS.md:54-56): 경매 완료 → 내전 생성
- scrim/PROCESS.md:112-170: 경매 기반 내전 생성 프로세스
- 현재: 연동 없음

---

### 6. Wallet System (지갑) ✅

**문서 참조:** docs 내 포인트 관련 섹션

#### ✅ 완벽하게 구현됨
- [x] 포인트 전송 (`sendPoints`)
- [x] 본인 전송 방지
- [x] 잔액 부족 체크
- [x] 트랜잭션 처리
- [x] 송신자/수신자 PointLog 기록
- [x] 포인트 이력 조회 (`getHistory`)

**특이사항 없음** - 문서와 100% 일치

---

### 7. Vote System (투표)

**문서 참조:** `docs/vote/PROCESS.md`

#### ✅ 구현된 기능
- [x] 투표 생성 with options
- [x] 투표 참여 (`castVote`)
- [x] multipleChoice 로직
- [x] VoteRecord 생성 및 count 증가

#### ⚠️ 개선 필요

**1. 투표 수정 로직 누락 (Medium)**
- 문서(vote/PROCESS.md:26-30): 투표 변경 가능 (VoteRecord UPDATE)
- 현재: 중복 투표 시 에러만 발생
- 개선: multipleChoice=false일 때 기존 레코드 업데이트 필요

**2. 내전 생성 연동 없음 (Medium)**
- 문서(vote/PROCESS.md:314-366): 투표 마감 → 내전 생성 버튼 활성화
- 현재: Vote와 Scrim 독립적
- 필요: `createScrimFromVote` API

**3. scrimType 활용 없음 (Low)**
- 엔티티에 `scrimType: NORMAL | AUCTION` 존재 (vote/PROCESS.md:129)
- 현재: 생성만 하고 활용 안 함

---

### 8. Clans System (클랜)

#### ✅ 구현된 기능
- [x] 클랜 생성 시 마스터 자동 배정
- [x] 초기 포인트 지급 (마스터 10000P, 멤버 5000P)
- [x] 멤버 추가
- [x] 중복 가입 방지

#### ⚠️ 개선 필요

**1. ClanRole이 2단계만 있음 (Medium)**
- 현재: MASTER, MEMBER
- 문서(ERD.md:35): `clanRole: MANAGER, MEMBER`
- CONVENTIONS.md 등에서 MANAGER 언급
- **혼선 발생** - MASTER vs MANAGER 정리 필요

**2. 멤버 관리 기능 부족 (Medium)**
- 필요: 멤버 제명, 권한 변경, 가입 승인 대기열
- 현재: 추가만 가능

---

## 공통 문제점

### 1. 엔티티와 문서 불일치

#### BettingTicket.clanId
- **ERD.md:** 명시 안 됨 (실수로 보임)
- **betting/PROCESS.md:270-276:** ClanMember와 연결 위해 필요
- **확인 필요:** 엔티티 파일 직접 검토

#### ClanMember.clanRole
- **ERD.md:35:** `enum clanRole "MANAGER, MEMBER"`
- **Clans 엔티티:** `MASTER, MEMBER`
- **통일 필요**

### 2. DTO 검증 부족
- 대부분의 서비스에서 `class-validator` 활용 안 됨
- CONVENTIONS.md:62에 명시되어 있지만 미적용

### 3. 에러 처리 단순화
- 모든 에러가 `BadRequestException`
- UnauthorizedException, ForbiddenException 등 세분화 필요

---

## Backend 개발 우선순위

### P0 (Critical - 즉시 수정)
1. **Betting 정산 로직 수정** - Math.floor → Math.ceil
2. **Shop 구매 승인 프로세스 구현** - PENDING → APPROVED 흐름
3. **Shop 쿠폰 자동 발급 기능 구현**
4. **Auction WebSocket Gateway 구현** (FRONTEND_WORKFLOW.md 참조)
5. **Blind Date 포인트 지급 로직 구현**
6. **Scrim teamSnapshot 저장 로직 구현**

### P1 (High - 다음 스프린트)
1. Shop purchaseLimit 구매 제한 체크
2. Blind Date 트랜잭션 처리 강화
3. Scrim 참가자 관리 API 구현
4. Auction 상태 관리 및 낙찰 로직
5. BettingTicket.clanId 필드 추가 (엔티티 확인 후)

### P2 (Medium - 백로그)
1. Blind Date 추천 시스템 (BlindDatePreference)
2. Betting 수정 기능
3. Vote 수정 기능
4. Vote → Scrim 연동
5. Auction → Scrim 연동
6. Clans 멤버 관리 기능 확장

---

## CONVENTIONS.md 보완 사항

### 추가 필요 섹션

#### 7. Backend Conventions (세부 규칙)

```markdown
### 7.1 Error Handling
- 적절한 HttpException 사용
  - `BadRequestException`: 유효하지 않은 요청 (400)
  - `UnauthorizedException`: 인증 실패 (401)
  - `ForbiddenException`: 권한 없음 (403)
  - `NotFoundException`: 리소스 없음 (404)

### 7.2 Transaction Usage
- 포인트 변경을 포함하는 모든 작업은 트랜잭션 필수
- 예시: 베팅 정산, 상점 구매, 소개팅 매칭

### 7.3 Numeric Precision
- 포인트 계산 시 `Math.ceil` 사용 (사용자 유리)
- 예외: 명시적으로 버림이 필요한 경우만 `Math.floor`

### 7.4 Point Operations
- 모든 포인트 변동은 `PointLog` 생성 필수
- reason 포맷:
  - `BET_WIN:{questionId}`
  - `BET_LOSS:{questionId}`
  - `SCRIM_WIN:{scrimId}`
  - `SEND_TO:{recipientId} - {message}`
  - `RECEIVE_FROM:{senderId} - {message}`
  - `SHOP_PURCHASE:{productId}`
  - `BLIND_DATE_MATCH:{listingId}`
```

#### 8. WebSocket Guidelines

```markdown
### 8.1 실시간 통신 (Socket.io)
- **사용 모듈:** Auction (경매), Scrim (내전 관전)
- **인증:** JWT 기반 Socket Handshake Guard
- **Room 명명:** `auction:{id}`, `scrim:{id}`
- **이벤트 명명:** camelCase (예: `placeBid`, `timerUpdate`)

### 8.2 이벤트 구조
\`\`\`typescript
interface SocketEvent<T> {
  event: string;
  data: T;
  timestamp: string;
}
\`\`\`
```

---

## FRONTEND_WORKFLOW.md 보완 사항

### 업데이트된 체크리스트

```markdown
## 5. Implementation Checklist (Updated)

| 단계 | 작업 항목 | 우선순위 | 상태 | Backend 준비 |
|:---:|:---|:---:|:---:|:---:|
| **1** | `axios` 설정 및 `api.ts` 생성 | P0 | ⬜ | ✅ Ready |
| **1** | `AuthContext` 및 로그인 연동 | P0 | ⬜ | ✅ Ready |
| **2** | 로비(Dashboard) API 연동 | P1 | ⬜ | ✅ Ready |
| **3** | **백엔드 Auction Gateway 구현** | **P0** | ⬜ | ❌ **Not Started** |
| **3** | 프론트엔드 Socket 연결 및 경매방 연동 | P0 | ⬜ | ❌ Blocked |
| **2** | 상점(Shop) 페이지 구현 - 기본 UI | P2 | ⬜ | ⚠️ Partial (승인 프로세스 누락) |
| **2** | 상점(Shop) 쿠폰 시스템 연동 | P1 | ⬜ | ❌ **Backend 미구현** |
| **4** | 타입 정의 파일(`api.d.ts`) 생성 및 적용 | P1 | ⬜ | ✅ Ready |
| **NEW** | 베팅 시스템 UI 구현 | P1 | ⬜ | ⚠️ Partial (Math.ceil 수정 필요) |
| **NEW** | 내전 팀 배정 드래그앤드롭 UI | P2 | ⬜ | ⚠️ Partial (API 누락) |
| **NEW** | 소개팅 추천 시스템 UI | P3 | ⬜ | ❌ **Backend 미구현** |
```

### 추가 섹션 제안

```markdown
## 6. Backend Blocker Issues (백엔드 대기 이슈)

다음 기능들은 백엔드 구현 완료 후 진행 가능합니다:

### 🔴 Critical Blockers
1. **경매 실시간 입찰** - WebSocket Gateway 미구현
2. **상점 쿠폰 발급** - ShopCoupon 할당 로직 없음
3. **소개팅 매칭 보상** - 포인트 지급 로직 없음

### 🟡 High Priority
1. **상점 구매 승인 플로우** - 현재 자동 승인만 됨
2. **내전 팀 스냅샷** - teamSnapshot 저장 안 됨
3. **베팅 정산 정확도** - Math.ceil 미적용

### 🟢 Medium Priority
1. **소개팅 추천 알고리즘** - BlindDatePreference 미구현
2. **투표 → 내전 연동** - API 없음
3. **베팅 수정 기능** - upsert 로직 없음

---

## 7. Temporary Workarounds (임시 해결책)

백엔드 수정 전까지 프론트엔드에서 가능한 대응:

### 상점 시스템
- Mock 승인 플로우: 클라이언트에서 "승인 대기" 상태 UI만 표시
- 쿠폰 번호: 더미 데이터로 "승인 후 표시됨" 메시지

### 경매 시스템
- Polling 방식으로 임시 구현 (GET /auctions/:id를 5초마다 호출)
- WebSocket 구현 후 교체 예정

### 베팅 시스템
- 프론트엔드에서 Math.ceil로 예상 보상 표시
- 실제 정산은 백엔드 수정 대기
```

---

## 권장 조치 사항

### 즉시 조치 (이번 주)
1. **베팅 정산 로직 수정** (1시간)
   - `betting.service.ts:106` Math.floor → Math.ceil
   - 테스트 케이스 추가

2. **Shop 구매 프로세스 수정** (4시간)
   - PENDING 상태 구매 생성 API
   - 마스터 승인 API 추가
   - 쿠폰 할당 로직 구현

3. **CONVENTIONS.md 보완** (1시간)
   - Backend 상세 규칙 추가
   - WebSocket 가이드라인 추가

### 다음 스프린트
1. **Auction WebSocket Gateway 구현** (2일)
2. **Scrim 팀 관리 API 구현** (1일)
3. **Blind Date 트랜잭션 강화** (1일)

### 장기 과제
1. BlindDatePreference 추천 시스템
2. Vote/Auction → Scrim 자동 연동
3. 전체 엔티티 DTO 검증 추가

---

## 결론

### 🎯 핵심 메시지

1. **기본 CRUD는 잘 구현됨** - 데이터 흐름의 70% 완성
2. **비즈니스 로직이 부족** - 문서의 복잡한 프로세스가 단순화됨
3. **WebSocket이 최우선** - 경매 시스템의 핵심 기능
4. **포인트 정산 정확도** - 사용자 신뢰와 직결

### 📊 완성도 지표

| 모듈 | 완성도 | 우선순위 | 상태 |
|------|--------|---------|------|
| Wallet | 100% | P2 | ✅ Production Ready |
| Votes | 85% | P2 | ⚠️ 수정 기능 추가 필요 |
| Clans | 80% | P1 | ⚠️ 멤버 관리 확장 필요 |
| Betting | 75% | P0 | 🔴 Math.ceil 즉시 수정 |
| Scrims | 60% | P1 | 🟡 teamSnapshot 필수 |
| Auctions | 40% | P0 | 🔴 WebSocket 미구현 |
| Shop | 35% | P0 | 🔴 쿠폰 시스템 미구현 |
| Blind Date | 30% | P1 | 🟡 포인트/매칭 로직 없음 |

**전체 평균: 70%**

---

**다음 단계:** P0 이슈 수정 PR 생성 후 코드 리뷰 요청
