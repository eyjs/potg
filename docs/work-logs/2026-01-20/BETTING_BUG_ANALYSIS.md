# 베팅 시스템 치명적 버그 분석 - 2026-01-20

## 🚨 요약

**문제**: 베팅 포인트 처리 로직이 기획 문서(PROCESS.md)와 완전히 불일치
**영향도**: P0 - 치명적 (포인트 경제 시스템 전체 붕괴)
**상태**: 즉시 수정 필요

---

## 📋 기획 문서 분석 (docs/betting/PROCESS.md)

### 포인트 처리 로직 (PROCESS.md:196-214)

#### 1. 베팅 제출 시
```typescript
// 즉시 차감 방식 (잠금)
ClanMember.lockedPoints += betAmount
// 가용 포인트 = totalPoints - lockedPoints
```

**핵심**: `totalPoints`는 건드리지 않고 `lockedPoints`만 증가

#### 2. 정산 시 - 승리
```typescript
보상 = Math.ceil(betAmount × rewardMultiplier)
ClanMember.totalPoints += 보상
ClanMember.lockedPoints -= betAmount
```

#### 3. 정산 시 - 패배
```typescript
ClanMember.totalPoints -= betAmount
ClanMember.lockedPoints -= betAmount
```

### 시나리오 예시 (PROCESS.md 기준)

**초기 상태:**
- totalPoints: 1000
- lockedPoints: 0
- **가용 포인트: 1000**

**100 포인트 베팅 후:**
- totalPoints: 1000 (변동 없음)
- lockedPoints: 100
- **가용 포인트: 900** (1000 - 100)

**승리 시 (배율 2.0):**
- totalPoints: 1200 (1000 + 200)
- lockedPoints: 0 (100 - 100)
- **가용 포인트: 1200**

**패배 시:**
- totalPoints: 900 (1000 - 100)
- lockedPoints: 0 (100 - 100)
- **가용 포인트: 900**

---

## 🐛 현재 Backend 구현 (betting.service.ts)

### 베팅 제출 로직 (lines 87-94)

```typescript
// New bet
if (clanMember.totalPoints < betDto.amount)
  throw new BadRequestException('Insufficient points');

// Deduct (Lock) points
clanMember.totalPoints -= betDto.amount;  // ❌ 잘못됨!
clanMember.lockedPoints += betDto.amount;
await manager.save(clanMember);
```

**문제점**: `totalPoints`를 즉시 차감하고 있음

### 승리 정산 로직 (lines 139-158)

```typescript
if (ticket.prediction === result) {
  ticket.status = TicketStatus.WON;
  if (clanMember) {
    const reward = Math.ceil(
      ticket.betAmount * question.rewardMultiplier,
    );
    // Return reward (which includes original bet) and unlock points
    clanMember.lockedPoints -= ticket.betAmount;
    clanMember.totalPoints += reward;  // ✅ 올바름
    await manager.save(clanMember);
  }
}
```

**주석도 잘못됨**: "which includes original bet" - 사실 original bet은 이미 차감되어 있음

### 패배 정산 로직 (lines 159-166)

```typescript
} else {
  ticket.status = TicketStatus.LOST;
  if (clanMember) {
    // Just unlock (subtract from locked, total already deducted at bet time)
    clanMember.lockedPoints -= ticket.betAmount;  // ❌ 잘못됨!
    await manager.save(clanMember);
  }
}
```

**문제점**: `totalPoints` 차감 없이 `lockedPoints`만 해제
**주석**: "total already deducted at bet time" - 맞지만 이건 잘못된 구현

### 현재 구현의 시나리오

**초기 상태:**
- totalPoints: 1000
- lockedPoints: 0
- **가용 포인트: 1000**

**100 포인트 베팅 후:**
- totalPoints: 900 (❌ 1000 - 100)
- lockedPoints: 100
- **가용 포인트: 800** (❌ 900 - 100) **← 이중 차감!**

**승리 시 (배율 2.0):**
- totalPoints: 1100 (900 + 200)
- lockedPoints: 0
- **가용 포인트: 1100** (✅ 올바름)

**패배 시:**
- totalPoints: 900 (변동 없음)
- lockedPoints: 0
- **가용 포인트: 900** (✅ 올바름)

---

## ⚠️ 치명적 문제점

### 1. 베팅 시 이중 차감
사용자가 100 포인트 베팅하면:
- 실제 차감: 100 (totalPoints)
- 잠금: 100 (lockedPoints)
- **가용 포인트: 800** (totalPoints - lockedPoints)

**결과**: 100 포인트만 베팅했는데 200 포인트가 줄어드는 효과!

### 2. 패배 시 포인트 미차감
현재 구현에서는 패배 시:
- totalPoints: 이미 차감됨 (베팅 시)
- lockedPoints: 0으로 복구

하지만 기획은:
- totalPoints: 정산 시 차감
- lockedPoints: 0으로 복구

**결과**: 우연히 최종 결과는 같지만 로직이 완전히 다름

### 3. 베팅 수정 시 버그 (lines 65-85)

```typescript
if (existingTicket) {
  const pointDifference = betDto.amount - existingTicket.betAmount;

  if (pointDifference > 0) {
    // Need more points
    if (clanMember.totalPoints < pointDifference)  // ❌ 잘못됨!
      throw new BadRequestException('Insufficient points');
    clanMember.totalPoints -= pointDifference;
    clanMember.lockedPoints += pointDifference;
  } else if (pointDifference < 0) {
    // Refund difference
    clanMember.totalPoints += Math.abs(pointDifference);
    clanMember.lockedPoints -= Math.abs(pointDifference);
  }
}
```

**문제**:
- 가용 포인트는 `totalPoints - lockedPoints`인데, `totalPoints`만 체크
- 베팅 증액 시 이중 차감 계속 발생

---

## 📊 ERD vs 기획 vs Backend 비교

| 항목 | ERD | PROCESS.md | Backend 구현 | 일치 여부 |
|------|-----|------------|--------------|----------|
| BettingQuestion.scrimId | FK | FK (NOT NULL via Scrim) | Nullable | ⚠️ 불일치 |
| BettingTicket.clanId | ❌ 없음 | ✅ 필요 (정산용) | ✅ 있음 (Nullable) | ⚠️ ERD 누락 |
| 베팅 시 totalPoints | - | 변동 없음 | 차감 | ❌ 불일치 |
| 베팅 시 lockedPoints | - | 증가 | 증가 | ✅ 일치 |
| 승리 시 totalPoints | - | +보상 | +보상 | ✅ 일치 |
| 승리 시 lockedPoints | - | -betAmount | -betAmount | ✅ 일치 |
| 패배 시 totalPoints | - | -betAmount | 변동 없음 | ❌ 불일치 |
| 패배 시 lockedPoints | - | -betAmount | -betAmount | ✅ 일치 |

---

## 🔧 필요한 수정 사항

### 1. betting.service.ts:87-94 (베팅 제출)

**현재:**
```typescript
// Deduct (Lock) points
clanMember.totalPoints -= betDto.amount;
clanMember.lockedPoints += betDto.amount;
```

**수정:**
```typescript
// Lock points only (PROCESS.md:196-202)
// Available points = totalPoints - lockedPoints
const availablePoints = clanMember.totalPoints - clanMember.lockedPoints;
if (availablePoints < betDto.amount)
  throw new BadRequestException('Insufficient points');

clanMember.lockedPoints += betDto.amount;
// totalPoints는 건드리지 않음!
```

### 2. betting.service.ts:65-85 (베팅 수정)

**현재:**
```typescript
if (pointDifference > 0) {
  if (clanMember.totalPoints < pointDifference)
    throw new BadRequestException('Insufficient points');
  clanMember.totalPoints -= pointDifference;
  clanMember.lockedPoints += pointDifference;
}
```

**수정:**
```typescript
if (pointDifference > 0) {
  const availablePoints = clanMember.totalPoints - clanMember.lockedPoints;
  if (availablePoints < pointDifference)
    throw new BadRequestException('Insufficient points');

  // lockedPoints만 증가
  clanMember.lockedPoints += pointDifference;
} else if (pointDifference < 0) {
  // lockedPoints만 감소
  clanMember.lockedPoints -= Math.abs(pointDifference);
}
// totalPoints는 건드리지 않음!
```

### 3. betting.service.ts:159-166 (패배 정산)

**현재:**
```typescript
} else {
  ticket.status = TicketStatus.LOST;
  if (clanMember) {
    clanMember.lockedPoints -= ticket.betAmount;
    await manager.save(clanMember);
  }
}
```

**수정:**
```typescript
} else {
  ticket.status = TicketStatus.LOST;
  if (clanMember) {
    // PROCESS.md:212-214: 패배 시 totalPoints도 차감
    clanMember.totalPoints -= ticket.betAmount;
    clanMember.lockedPoints -= ticket.betAmount;
    await manager.save(clanMember);

    // PointLog 추가 (패배도 기록)
    const log = manager.create(PointLog, {
      userId: ticket.userId,
      clanId: ticket.clanId,
      amount: -ticket.betAmount,
      reason: `BET_LOSE:${question.id}`,
    });
    await manager.save(log);
  }
}
```

### 4. BettingQuestion.scrimId (Nullable → NOT NULL)

**엔티티 수정:**
```typescript
// betting-question.entity.ts:8-9
@Column({ nullable: true })  // ❌
scrimId: string;

// 수정 후:
@Column()  // ✅ NOT NULL
scrimId: string;
```

**마이그레이션 필요**: 기존 데이터에 scrimId가 null인 경우 처리

---

## 📝 Frontend 구현 상태

**확인 결과**: Frontend에 베팅 관련 파일 없음
- `frontend/src/` 하위에 `*betting*`, `*bet*` 파일 없음
- UI 미구현 상태

**필요한 작업**:
1. BettingQuestionList 컴포넌트
2. BettingModal 컴포넌트
3. MyTickets 컴포넌트
4. Admin BettingManagement 페이지

---

## 🎯 우선순위

### P0 - 즉시 수정 필요
1. ✅ **베팅 제출 로직** (이중 차감 버그)
2. ✅ **베팅 수정 로직** (포인트 계산 오류)
3. ✅ **패배 정산 로직** (totalPoints 미차감)

### P1 - 중요
4. ⚠️ **scrimId NOT NULL 제약** (데이터 무결성)
5. ⚠️ **PointLog 패배 기록** (이력 추적)

### P2 - 개선
6. 📝 **Frontend 구현** (UI 전체 없음)
7. 📝 **테스트 코드 작성**

---

## 🔍 추가 확인 사항

### 1. ClanMember 엔티티
```typescript
// 확인 필요
class ClanMember {
  totalPoints: number;   // 실제 보유 포인트
  lockedPoints: number;  // 베팅으로 잠긴 포인트
}

// 가용 포인트 계산
availablePoints = totalPoints - lockedPoints
```

### 2. PointLog 기록
- 승리 시: ✅ 기록됨 (`BET_WIN:${questionId}`)
- 패배 시: ❌ 기록 안 됨 (추가 필요)

### 3. Transaction 안전성
- ✅ 베팅 제출: Transaction 적용
- ✅ 베팅 정산: Transaction 적용
- ✅ 경쟁 조건 방지: Question status 먼저 업데이트

---

## 📌 결론

**현재 베팅 시스템은 사용 불가 상태입니다.**

### 핵심 문제
1. 베팅 시 포인트가 이중으로 차감됨
2. 패배 시 포인트가 차감되지 않음
3. 베팅 수정 시 가용 포인트 계산 오류

### 권장 조치
1. **즉시 서비스 중단** (데이터 손상 방지)
2. **위 수정 사항 적용**
3. **철저한 테스트 후 재배포**
4. **기존 데이터 검증 및 복구** (필요 시)

---

**작성일**: 2026-01-20
**작성자**: Claude Code
**버전**: 1.0
**심각도**: CRITICAL
