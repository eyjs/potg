# 베팅 시스템 치명적 버그 수정 가이드

**작성일**: 2026-01-20
**심각도**: CRITICAL
**영향**: 포인트 경제 시스템 전체 무효화
**목적**: AI Agent가 이 문서만으로 완전한 수정 가능하도록 작성

---

## 📋 목차

1. [문제 요약](#1-문제-요약)
2. [기획 명세 (Ground Truth)](#2-기획-명세-ground-truth)
3. [현재 구현 분석](#3-현재-구현-분석)
4. [수정 방법 (Step-by-Step)](#4-수정-방법-step-by-step)
5. [검증 시나리오](#5-검증-시나리오)
6. [마이그레이션 가이드](#6-마이그레이션-가이드)

---

## 1. 문제 요약

### 1.1 핵심 버그 3가지

| 버그 ID | 위치 | 문제 | 영향 |
|---------|------|------|------|
| **BUG-001** | `betting.service.ts:87-94` | 베팅 시 totalPoints 이중 차감 | 100P 베팅 시 실제 200P 감소 |
| **BUG-002** | `betting.service.ts:65-79` | 베팅 수정 시 가용 포인트 미체크 | 잘못된 잔액 확인 |
| **BUG-003** | `betting.service.ts:159-166` | 패배 시 totalPoints 미차감 | 우연히 동작하나 로직 오류 |

### 1.2 파급 효과

```
베팅 100 포인트 제출
├─ [현재 구현] totalPoints: 1000 → 900 (차감)
│                lockedPoints: 0 → 100 (잠금)
│                가용: 900 - 100 = 800 ❌ (이중 차감!)
│
└─ [올바른 구현] totalPoints: 1000 (유지)
                 lockedPoints: 0 → 100 (잠금)
                 가용: 1000 - 100 = 900 ✅
```

---

## 2. 기획 명세 (Ground Truth)

### 2.1 출처

**문서**: `docs/betting/PROCESS.md`
**섹션**: 4. 정산 로직 (lines 150-214)

### 2.2 포인트 처리 원칙

#### 가용 포인트 계산 공식
```typescript
availablePoints = totalPoints - lockedPoints
```

#### 베팅 제출 시 (PROCESS.md:196-202)
```typescript
// 즉시 차감 방식 (잠금)
ClanMember.lockedPoints += betAmount
// totalPoints는 건드리지 않음!
// 가용 포인트 = totalPoints - lockedPoints
```

**핵심**: `totalPoints`는 변동 없이 `lockedPoints`만 증가

#### 정산 시 - 승리 (PROCESS.md:206-209)
```typescript
보상 = Math.ceil(betAmount × rewardMultiplier)
ClanMember.totalPoints += 보상
ClanMember.lockedPoints -= betAmount
```

#### 정산 시 - 패배 (PROCESS.md:211-213)
```typescript
ClanMember.totalPoints -= betAmount
ClanMember.lockedPoints -= betAmount
```

### 2.3 완전한 시나리오

**초기 상태:**
```typescript
{
  totalPoints: 1000,
  lockedPoints: 0,
  availablePoints: 1000  // 1000 - 0
}
```

**100 포인트 베팅 후:**
```typescript
{
  totalPoints: 1000,     // ✅ 변동 없음
  lockedPoints: 100,     // ✅ +100
  availablePoints: 900   // 1000 - 100
}
```

**승리 시 (배율 2.0):**
```typescript
보상 = Math.ceil(100 × 2.0) = 200

{
  totalPoints: 1200,     // 1000 + 200
  lockedPoints: 0,       // 100 - 100
  availablePoints: 1200  // 최종: +200 순수익
}
```

**패배 시:**
```typescript
{
  totalPoints: 900,      // 1000 - 100
  lockedPoints: 0,       // 100 - 100
  availablePoints: 900   // 최종: -100 손실
}
```

---

## 3. 현재 구현 분석

### 3.1 파일 정보

**경로**: `backend/src/modules/betting/betting.service.ts`
**관련 엔티티**:
- `backend/src/modules/clans/entities/clan-member.entity.ts` (totalPoints, lockedPoints)
- `backend/src/modules/clans/entities/point-log.entity.ts` (포인트 이력)
- `backend/src/modules/betting/entities/betting-ticket.entity.ts`

### 3.2 BUG-001: 베팅 제출 시 이중 차감

**위치**: `betting.service.ts:87-94`

**현재 코드**:
```typescript
// New bet
if (clanMember.totalPoints < betDto.amount)
  throw new BadRequestException('Insufficient points');

// Deduct (Lock) points
clanMember.totalPoints -= betDto.amount;  // ❌ 이중 차감 원인!
clanMember.lockedPoints += betDto.amount;
await manager.save(clanMember);

const ticket = manager.create(BettingTicket, {
  questionId,
  userId,
  clanId: betDto.clanId,
  prediction: betDto.prediction,
  betAmount: betDto.amount,
});

return manager.save(ticket);
```

**문제**:
1. Line 92: `totalPoints`를 즉시 차감
2. Line 93: `lockedPoints`도 증가
3. 결과: 가용 포인트 = (totalPoints - betAmount) - lockedPoints = 이중 차감

**올바른 로직**:
```typescript
// PROCESS.md:196-202 기준
ClanMember.lockedPoints += betAmount  // 잠금만 수행
// totalPoints는 건드리지 않음!
가용포인트 = totalPoints - lockedPoints
```

### 3.3 BUG-002: 베팅 수정 시 가용 포인트 미체크

**위치**: `betting.service.ts:65-79`

**현재 코드**:
```typescript
if (existingTicket) {
  // Update existing bet (modification)
  const pointDifference = betDto.amount - existingTicket.betAmount;

  if (pointDifference > 0) {
    // Need more points
    if (clanMember.totalPoints < pointDifference)  // ❌ 잘못된 체크!
      throw new BadRequestException('Insufficient points');
    clanMember.totalPoints -= pointDifference;     // ❌ 이중 차감!
    clanMember.lockedPoints += pointDifference;
  } else if (pointDifference < 0) {
    // Refund difference
    clanMember.totalPoints += Math.abs(pointDifference);  // ❌ 잘못된 환불!
    clanMember.lockedPoints -= Math.abs(pointDifference);
  }

  await manager.save(clanMember);

  existingTicket.prediction = betDto.prediction;
  existingTicket.betAmount = betDto.amount;
  return manager.save(existingTicket);
}
```

**문제**:
1. Line 70: `totalPoints`만 체크 → 가용 포인트(totalPoints - lockedPoints)를 체크해야 함
2. Line 72-73: totalPoints 차감 + lockedPoints 증가 = 이중 차감
3. Line 76-77: totalPoints 증가 + lockedPoints 감소 = 잘못된 환불

**올바른 로직**:
```typescript
// 가용 포인트 체크
availablePoints = totalPoints - lockedPoints
if (availablePoints < pointDifference) throw error

// lockedPoints만 조정
if (pointDifference > 0) {
  lockedPoints += pointDifference
} else {
  lockedPoints -= abs(pointDifference)
}
// totalPoints는 건드리지 않음!
```

### 3.4 BUG-003: 패배 시 totalPoints 미차감

**위치**: `betting.service.ts:159-166`

**현재 코드**:
```typescript
} else {
  ticket.status = TicketStatus.LOST;
  if (clanMember) {
    // Just unlock (subtract from locked, total already deducted at bet time)
    clanMember.lockedPoints -= ticket.betAmount;  // ❌ 불완전!
    await manager.save(clanMember);
  }
}
await manager.save(ticket);
updatedCount++;
```

**문제**:
1. Line 163: `lockedPoints`만 해제
2. `totalPoints` 차감 없음
3. 주석: "total already deducted at bet time" ← 이것 자체가 잘못된 구현의 산물

**올바른 로직** (PROCESS.md:211-213):
```typescript
// 패배 시
ClanMember.totalPoints -= betAmount  // 정산 시 차감!
ClanMember.lockedPoints -= betAmount // 잠금 해제
```

**현재 우연히 동작하는 이유**:
- 베팅 시 이미 `totalPoints`를 차감했기 때문
- 하지만 로직이 완전히 잘못됨

### 3.5 추가 문제: PointLog 누락

**위치**: `betting.service.ts:159-166` (패배 정산)

**현재 코드**:
```typescript
} else {
  ticket.status = TicketStatus.LOST;
  if (clanMember) {
    clanMember.lockedPoints -= ticket.betAmount;
    await manager.save(clanMember);
  }
}
// ❌ PointLog 기록 없음!
```

**승리 시 코드** (lines 151-157):
```typescript
const log = manager.create(PointLog, {
  userId: ticket.userId,
  clanId: ticket.clanId,
  amount: reward,
  reason: `BET_WIN:${question.id}`,
});
await manager.save(log);
```

**문제**: 패배 시 PointLog가 기록되지 않아 이력 추적 불가

---

## 4. 수정 방법 (Step-by-Step)

### 4.1 수정 전 체크리스트

- [ ] `backend/src/modules/betting/betting.service.ts` 파일 읽기
- [ ] 현재 코드 백업 (git commit 권장)
- [ ] `docs/betting/PROCESS.md` 기획 문서 숙지
- [ ] ClanMember 엔티티 구조 확인 (totalPoints, lockedPoints 필드)

### 4.2 수정 #1: 베팅 제출 로직 (BUG-001)

**파일**: `backend/src/modules/betting/betting.service.ts`
**함수**: `placeBet`
**라인**: 86-104

**기존 코드 (lines 86-104)**:
```typescript
} else {
  // New bet
  if (clanMember.totalPoints < betDto.amount)
    throw new BadRequestException('Insufficient points');

  // Deduct (Lock) points
  clanMember.totalPoints -= betDto.amount;
  clanMember.lockedPoints += betDto.amount;
  await manager.save(clanMember);

  const ticket = manager.create(BettingTicket, {
    questionId,
    userId,
    clanId: betDto.clanId,
    prediction: betDto.prediction,
    betAmount: betDto.amount,
  });

  return manager.save(ticket);
}
```

**수정 후 코드**:
```typescript
} else {
  // New bet
  // PROCESS.md:196-202 - Check available points (totalPoints - lockedPoints)
  const availablePoints = clanMember.totalPoints - clanMember.lockedPoints;
  if (availablePoints < betDto.amount)
    throw new BadRequestException('Insufficient points');

  // Lock points only (DO NOT touch totalPoints)
  clanMember.lockedPoints += betDto.amount;
  await manager.save(clanMember);

  const ticket = manager.create(BettingTicket, {
    questionId,
    userId,
    clanId: betDto.clanId,
    prediction: betDto.prediction,
    betAmount: betDto.amount,
  });

  return manager.save(ticket);
}
```

**변경 사항**:
1. Line 88-89: `totalPoints` 체크 → `availablePoints` 계산 및 체크로 변경
2. Line 92: `totalPoints -= betDto.amount` 삭제
3. Line 93: `lockedPoints += betDto.amount` 유지

### 4.3 수정 #2: 베팅 수정 로직 (BUG-002)

**파일**: `backend/src/modules/betting/betting.service.ts`
**함수**: `placeBet`
**라인**: 65-85

**기존 코드 (lines 65-85)**:
```typescript
if (existingTicket) {
  // Update existing bet (modification)
  const pointDifference = betDto.amount - existingTicket.betAmount;

  if (pointDifference > 0) {
    // Need more points
    if (clanMember.totalPoints < pointDifference)
      throw new BadRequestException('Insufficient points');
    clanMember.totalPoints -= pointDifference;
    clanMember.lockedPoints += pointDifference;
  } else if (pointDifference < 0) {
    // Refund difference
    clanMember.totalPoints += Math.abs(pointDifference);
    clanMember.lockedPoints -= Math.abs(pointDifference);
  }

  await manager.save(clanMember);

  existingTicket.prediction = betDto.prediction;
  existingTicket.betAmount = betDto.amount;
  return manager.save(existingTicket);
}
```

**수정 후 코드**:
```typescript
if (existingTicket) {
  // Update existing bet (modification) - docs/betting/PROCESS.md:43-46
  const pointDifference = betDto.amount - existingTicket.betAmount;

  if (pointDifference > 0) {
    // Need more points - check available points
    const availablePoints = clanMember.totalPoints - clanMember.lockedPoints;
    if (availablePoints < pointDifference)
      throw new BadRequestException('Insufficient points');

    // Lock additional points only
    clanMember.lockedPoints += pointDifference;
  } else if (pointDifference < 0) {
    // Unlock difference (refund to available pool)
    clanMember.lockedPoints -= Math.abs(pointDifference);
  }

  await manager.save(clanMember);

  existingTicket.prediction = betDto.prediction;
  existingTicket.betAmount = betDto.amount;
  return manager.save(existingTicket);
}
```

**변경 사항**:
1. Line 70-71: `totalPoints` 체크 → `availablePoints` 체크로 변경
2. Line 73: `totalPoints -= pointDifference` 삭제
3. Line 74: `lockedPoints += pointDifference` 유지
4. Line 76: `totalPoints += abs(pointDifference)` 삭제
5. Line 77: `lockedPoints -= abs(pointDifference)` 유지

### 4.4 수정 #3: 패배 정산 로직 (BUG-003)

**파일**: `backend/src/modules/betting/betting.service.ts`
**함수**: `settleQuestion`
**라인**: 159-168

**기존 코드 (lines 159-168)**:
```typescript
} else {
  ticket.status = TicketStatus.LOST;
  if (clanMember) {
    // Just unlock (subtract from locked, total already deducted at bet time)
    clanMember.lockedPoints -= ticket.betAmount;
    await manager.save(clanMember);
  }
}
await manager.save(ticket);
updatedCount++;
```

**수정 후 코드**:
```typescript
} else {
  ticket.status = TicketStatus.LOST;
  if (clanMember) {
    // PROCESS.md:211-213 - Deduct from totalPoints and unlock
    clanMember.totalPoints -= ticket.betAmount;
    clanMember.lockedPoints -= ticket.betAmount;
    await manager.save(clanMember);

    // Create PointLog for loss
    const log = manager.create(PointLog, {
      userId: ticket.userId,
      clanId: ticket.clanId,
      amount: -ticket.betAmount,
      reason: `BET_LOSE:${question.id}`,
    });
    await manager.save(log);
  }
}
await manager.save(ticket);
updatedCount++;
```

**변경 사항**:
1. Line 163: `totalPoints -= ticket.betAmount` 추가
2. Line 164: `lockedPoints -= ticket.betAmount` 유지
3. Line 167-173: PointLog 기록 추가

### 4.5 수정 #4: scrimId NOT NULL 제약 (선택적)

**파일**: `backend/src/modules/betting/entities/betting-question.entity.ts`
**라인**: 8-9

**기존 코드**:
```typescript
@Column({ nullable: true })
scrimId: string;
```

**수정 후 코드**:
```typescript
@Column()
scrimId: string;
```

**주의**: 기존 데이터에 scrimId가 null인 경우 마이그레이션 필요

---

## 5. 검증 시나리오

### 5.1 테스트 준비

**필요한 데이터**:
```typescript
// User
const user = {
  id: 'user-001',
  battleTag: 'TestUser#1234'
};

// Clan
const clan = {
  id: 'clan-001',
  name: 'Test Clan'
};

// ClanMember (초기 상태)
const clanMember = {
  userId: 'user-001',
  clanId: 'clan-001',
  totalPoints: 1000,
  lockedPoints: 0
};

// Scrim
const scrim = {
  id: 'scrim-001',
  clanId: 'clan-001',
  status: 'SCHEDULED'
};

// BettingQuestion
const question = {
  id: 'question-001',
  scrimId: 'scrim-001',
  question: '테스트 문항',
  status: 'OPEN',
  minBetAmount: 100,
  rewardMultiplier: 2.0
};
```

### 5.2 시나리오 1: 신규 베팅 제출

**테스트 케이스**: 100 포인트 베팅

**API 호출**:
```bash
POST /betting/questions/question-001/bet
Authorization: Bearer <token>
Content-Type: application/json

{
  "prediction": "O",
  "amount": 100,
  "clanId": "clan-001"
}
```

**예상 결과**:
```typescript
// ClanMember 변경 전
{
  totalPoints: 1000,
  lockedPoints: 0
}

// ClanMember 변경 후
{
  totalPoints: 1000,  // ✅ 변동 없음
  lockedPoints: 100   // ✅ +100
}

// 가용 포인트
availablePoints = 1000 - 100 = 900  // ✅ 정상
```

**검증 SQL**:
```sql
SELECT totalPoints, lockedPoints, (totalPoints - lockedPoints) as availablePoints
FROM clan_members
WHERE userId = 'user-001' AND clanId = 'clan-001';
```

**예상 값**:
| totalPoints | lockedPoints | availablePoints |
|-------------|--------------|-----------------|
| 1000 | 100 | 900 |

### 5.3 시나리오 2: 베팅 수정 (증액)

**초기 상태**: 100 포인트 베팅 완료 (위 시나리오 1 결과)

**API 호출**: 200 포인트로 증액
```bash
POST /betting/questions/question-001/bet
Authorization: Bearer <token>
Content-Type: application/json

{
  "prediction": "X",
  "amount": 200,
  "clanId": "clan-001"
}
```

**예상 결과**:
```typescript
// ClanMember 변경 전
{
  totalPoints: 1000,
  lockedPoints: 100
}

// pointDifference = 200 - 100 = 100
// availablePoints = 1000 - 100 = 900 (충분!)

// ClanMember 변경 후
{
  totalPoints: 1000,  // ✅ 변동 없음
  lockedPoints: 200   // ✅ +100 (기존 100 + 추가 100)
}

// 가용 포인트
availablePoints = 1000 - 200 = 800  // ✅ 정상
```

### 5.4 시나리오 3: 베팅 수정 (감액)

**초기 상태**: 200 포인트 베팅 완료

**API 호출**: 50 포인트로 감액
```bash
POST /betting/questions/question-001/bet
Authorization: Bearer <token>
Content-Type: application/json

{
  "prediction": "O",
  "amount": 50,
  "clanId": "clan-001"
}
```

**예상 결과**:
```typescript
// ClanMember 변경 전
{
  totalPoints: 1000,
  lockedPoints: 200
}

// pointDifference = 50 - 200 = -150

// ClanMember 변경 후
{
  totalPoints: 1000,  // ✅ 변동 없음
  lockedPoints: 50    // ✅ -150 (200 - 150)
}

// 가용 포인트
availablePoints = 1000 - 50 = 950  // ✅ 정상 (환불됨)
```

### 5.5 시나리오 4: 정산 - 승리

**초기 상태**: 100 포인트 베팅 (O 예측)

**API 호출**: 정답 O로 정산
```bash
POST /betting/questions/question-001/settle
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "result": "O"
}
```

**예상 결과**:
```typescript
// ClanMember 변경 전
{
  totalPoints: 1000,
  lockedPoints: 100
}

// 보상 계산
reward = Math.ceil(100 × 2.0) = 200

// ClanMember 변경 후
{
  totalPoints: 1200,  // ✅ +200 (보상)
  lockedPoints: 0     // ✅ -100 (잠금 해제)
}

// PointLog 생성
{
  userId: 'user-001',
  clanId: 'clan-001',
  amount: 200,
  reason: 'BET_WIN:question-001'
}

// BettingTicket 상태
{
  status: 'WON'
}
```

### 5.6 시나리오 5: 정산 - 패배

**초기 상태**: 100 포인트 베팅 (O 예측)

**API 호출**: 정답 X로 정산
```bash
POST /betting/questions/question-001/settle
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "result": "X"
}
```

**예상 결과**:
```typescript
// ClanMember 변경 전
{
  totalPoints: 1000,
  lockedPoints: 100
}

// ClanMember 변경 후
{
  totalPoints: 900,   // ✅ -100 (차감)
  lockedPoints: 0     // ✅ -100 (잠금 해제)
}

// PointLog 생성
{
  userId: 'user-001',
  clanId: 'clan-001',
  amount: -100,
  reason: 'BET_LOSE:question-001'
}

// BettingTicket 상태
{
  status: 'LOST'
}
```

### 5.7 엣지 케이스 테스트

#### 5.7.1 가용 포인트 부족

**초기 상태**:
```typescript
{
  totalPoints: 1000,
  lockedPoints: 900,
  availablePoints: 100
}
```

**시도**: 200 포인트 베팅

**예상 결과**:
```json
{
  "statusCode": 400,
  "message": "Insufficient points"
}
```

#### 5.7.2 베팅 수정 시 가용 포인트 부족

**초기 상태**:
```typescript
{
  totalPoints: 1000,
  lockedPoints: 500,  // 기존 500 베팅
  availablePoints: 500
}
```

**시도**: 1200 포인트로 증액 (추가 700 필요)

**예상 결과**:
```json
{
  "statusCode": 400,
  "message": "Insufficient points"
}
```

#### 5.7.3 Math.ceil 검증

**베팅 금액**: 333 포인트
**배율**: 1.5

**계산**:
```typescript
reward = Math.ceil(333 × 1.5)
       = Math.ceil(499.5)
       = 500  // ✅ 올림
```

---

## 6. 마이그레이션 가이드

### 6.1 scrimId NOT NULL 마이그레이션

**현재 상태 확인**:
```sql
SELECT COUNT(*) as null_count
FROM betting_questions
WHERE scrimId IS NULL;
```

**null_count > 0인 경우**:

**옵션 1: 기본 scrim 생성**
```sql
-- 1. 더미 scrim 생성
INSERT INTO scrims (id, title, clanId, status, hostId)
VALUES ('legacy-scrim-001', 'Legacy Betting Questions', '<default-clan-id>', 'FINISHED', '<admin-id>');

-- 2. null scrimId 업데이트
UPDATE betting_questions
SET scrimId = 'legacy-scrim-001'
WHERE scrimId IS NULL;

-- 3. NOT NULL 제약 추가
ALTER TABLE betting_questions
ALTER COLUMN scrimId SET NOT NULL;
```

**옵션 2: 해당 레코드 삭제 (데이터 손실)**
```sql
-- 주의: 관련 티켓도 CASCADE 삭제됨
DELETE FROM betting_questions
WHERE scrimId IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE betting_questions
ALTER COLUMN scrimId SET NOT NULL;
```

### 6.2 기존 데이터 포인트 보정

**현재 구현으로 인한 데이터 불일치 가능성**:

#### 6.2.1 문제 진단 쿼리

```sql
-- PENDING 티켓이 있는 회원의 포인트 상태 확인
SELECT
  cm.userId,
  cm.clanId,
  cm.totalPoints,
  cm.lockedPoints,
  (cm.totalPoints - cm.lockedPoints) as availablePoints,
  SUM(bt.betAmount) as total_pending_bets
FROM clan_members cm
JOIN betting_tickets bt ON cm.userId = bt.userId AND cm.clanId = bt.clanId
WHERE bt.status = 'PENDING'
GROUP BY cm.userId, cm.clanId, cm.totalPoints, cm.lockedPoints
HAVING SUM(bt.betAmount) != cm.lockedPoints;
```

**불일치 발견 시**: 수동 보정 필요

#### 6.2.2 데이터 복구 스크립트

```sql
-- 백업 테이블 생성
CREATE TABLE clan_members_backup AS
SELECT * FROM clan_members;

-- lockedPoints 재계산
UPDATE clan_members cm
SET lockedPoints = (
  SELECT COALESCE(SUM(betAmount), 0)
  FROM betting_tickets bt
  WHERE bt.userId = cm.userId
    AND bt.clanId = cm.clanId
    AND bt.status = 'PENDING'
);

-- 검증
SELECT
  userId,
  clanId,
  totalPoints,
  lockedPoints,
  (totalPoints - lockedPoints) as availablePoints
FROM clan_members
WHERE lockedPoints > 0;
```

---

## 7. 배포 체크리스트

### 7.1 배포 전

- [ ] 코드 수정 완료 (4.2~4.5 섹션)
- [ ] ESLint 검증 통과
- [ ] TypeScript 컴파일 성공
- [ ] 유닛 테스트 작성 및 통과 (5장 시나리오 기반)
- [ ] 현재 데이터베이스 백업
- [ ] 마이그레이션 스크립트 준비 (6장)

### 7.2 배포 시

**순서**:
1. 서비스 중단 (베팅 기능 임시 비활성화)
2. 데이터베이스 백업
3. 마이그레이션 실행 (6.2절)
4. 백엔드 코드 배포
5. 시나리오 테스트 (5장)
6. 서비스 재개

### 7.3 배포 후

- [ ] 시나리오 1~6 모두 통과 확인
- [ ] PointLog 정상 기록 확인
- [ ] 기존 PENDING 티켓 정산 테스트
- [ ] 모니터링 24시간

---

## 8. 참고 자료

### 8.1 관련 문서

- `docs/betting/PROCESS.md` - 베팅 시스템 전체 프로세스
- `docs/ERD.md` - 데이터베이스 스키마
- `backend/src/modules/clans/entities/clan-member.entity.ts` - ClanMember 엔티티
- `backend/src/modules/clans/entities/point-log.entity.ts` - PointLog 엔티티

### 8.2 관련 코드

**Backend**:
- `backend/src/modules/betting/betting.service.ts` - 베팅 서비스 로직
- `backend/src/modules/betting/betting.controller.ts` - 베팅 API 엔드포인트
- `backend/src/modules/betting/entities/` - 베팅 엔티티들
- `backend/src/modules/betting/dto/betting.dto.ts` - DTO 정의

**Enums**:
```typescript
// betting.enum.ts
export enum BettingStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  SETTLED = 'SETTLED'
}

export enum BettingAnswer {
  O = 'O',
  X = 'X'
}

export enum TicketStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED'
}
```

---

## 9. FAQ

### Q1: 왜 totalPoints를 건드리지 않나요?

**A**: 가용 포인트 = totalPoints - lockedPoints 공식 때문입니다.

```
베팅 시:
  totalPoints: 1000 (유지)
  lockedPoints: +100
  가용: 1000 - 100 = 900 ✅

만약 totalPoints도 차감하면:
  totalPoints: 900
  lockedPoints: +100
  가용: 900 - 100 = 800 ❌ (이중 차감!)
```

### Q2: 패배 시 왜 totalPoints를 차감하나요?

**A**: 정산 시점에 비로소 포인트 손실이 확정되기 때문입니다.

```
베팅 시: "잠금"만 (아직 손실 아님)
  totalPoints: 1000 (유지)
  lockedPoints: 100 (잠금)

패배 정산: "손실 확정"
  totalPoints: 900 (100 손실)
  lockedPoints: 0 (잠금 해제)
```

### Q3: 기존 PENDING 티켓은 어떻게 하나요?

**A**: 마이그레이션 후 정상 정산됩니다.

수정 후 정산 로직은 기존 티켓도 올바르게 처리합니다.
다만 6.2.2절의 lockedPoints 재계산은 필수입니다.

### Q4: 프론트엔드 수정이 필요한가요?

**A**: 아니요, 백엔드 API 스펙은 동일합니다.

포인트 처리 로직만 내부적으로 변경되며, API 요청/응답 형식은 그대로입니다.

---

## 10. 완료 체크

수정 완료 후 아래 항목을 모두 체크하세요:

**코드 수정**:
- [ ] betting.service.ts:87-94 (베팅 제출)
- [ ] betting.service.ts:65-85 (베팅 수정)
- [ ] betting.service.ts:159-168 (패배 정산)
- [ ] betting-question.entity.ts:8-9 (scrimId NOT NULL, 선택)

**검증**:
- [ ] 시나리오 1: 신규 베팅 (5.2)
- [ ] 시나리오 2: 베팅 증액 (5.3)
- [ ] 시나리오 3: 베팅 감액 (5.4)
- [ ] 시나리오 4: 승리 정산 (5.5)
- [ ] 시나리오 5: 패배 정산 (5.6)
- [ ] 엣지 케이스 (5.7)

**데이터**:
- [ ] 마이그레이션 실행 (6.1)
- [ ] 데이터 보정 (6.2)
- [ ] PointLog 검증

**배포**:
- [ ] ESLint 통과
- [ ] 백업 완료
- [ ] 배포 성공
- [ ] 모니터링 24시간

---

**작성 완료일**: 2026-01-20
**최종 검토자**: AI Agent
**버전**: 1.0
**상태**: 수정 대기 중
