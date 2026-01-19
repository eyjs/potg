# 투표 기반 내전 생성 시뮬레이션 (Vote-based Scrim Creation Simulation)

이 문서는 투표 기반 내전 생성 시 발생할 수 있는 엣지 케이스와 결함을 시뮬레이션합니다.

---

## ✅ 정상 케이스

### 시나리오: 16명 참가, 균형 잡힌 투표

```
투표 현황:
- 참석: 12명
- 불참: 5명
- 늦참: 3명

명단 정리:
- 참석 12명 → ScrimParticipant (status: CONFIRMED, assignedTeam: UNASSIGNED)
- 늦참 3명 → ScrimParticipant (status: CONFIRMED, assignedTeam: BENCH)
- 불참 5명 → 제외

팀 배정:
- TEAM_A: 6명
- TEAM_B: 6명
- BENCH: 3명

결과:
✅ 내전 생성 성공 (Scrim.status = SCHEDULED)
✅ teamSnapshot 생성 완료
```

---

## ❌ 엣지 케이스 및 결함

### 1. 참가자 0명일 때

```
투표 현황:
- 참석: 0명
- 불참: 15명
- 늦참: 0명

내전 생성 시도:
→ ScrimParticipant 0개 생성
→ 팀 배정 불가

결과:
❌ 내전 생성 차단
⚠️ 관리자에게 경고: "참가자가 없습니다. 수동으로 참가자를 추가하거나 투표를 다시 진행하세요."
```

**해결책:**
```typescript
async function createScrimFromVote(voteId: string) {
  const participants = await generateParticipantsFromVote(voteId);

  if (participants.length === 0) {
    throw new Error("참가자가 없어 내전을 생성할 수 없습니다.");
  }

  // 내전 생성 진행...
}
```

---

### 2. 참가자 부족 (10명 미만)

```
투표 현황:
- 참석: 5명
- 불참: 10명
- 늦참: 0명

명단 정리:
→ ScrimParticipant 5명 생성

팀 배정 시도:
→ 5vs5 내전에 최소 10명 필요 (각 팀 5명)

결과:
⚠️ 경고: "5vs5 내전에 최소 10명 필요 (현재 5명)"
⚠️ 옵션 제시:
  1. 수동으로 참가자 추가
  2. 2vs2 또는 3vs3으로 변경
  3. 내전 취소
```

**해결책:**
```typescript
function validateMinimumParticipants(
  participants: ScrimParticipant[],
  requiredPlayers: number = 10
) {
  const confirmed = participants.filter(
    p => p.status === "CONFIRMED" && p.assignedTeam !== "BENCH"
  );

  if (confirmed.length < requiredPlayers) {
    return {
      valid: false,
      message: `5vs5 내전에 최소 ${requiredPlayers}명 필요 (현재 ${confirmed.length}명)`,
      suggestions: [
        "수동으로 참가자 추가",
        `${Math.floor(confirmed.length / 2)}vs${Math.floor(confirmed.length / 2)}로 변경`,
        "내전 취소"
      ]
    };
  }

  return { valid: true };
}
```

---

### 3. 늦참자만 있을 때

```
투표 현황:
- 참석: 0명
- 불참: 10명
- 늦참: 5명

명단 정리:
→ ScrimParticipant 5명 생성 (모두 assignedTeam: BENCH)

팀 배정:
→ TEAM_A: 0명, TEAM_B: 0명, BENCH: 5명

결과:
⚠️ 경고: "모든 참가자가 벤치에 있습니다."
⚠️ 옵션:
  1. 늦참자를 TEAM_A/B로 수동 배정
  2. 내전 취소
```

**해결책:**
```typescript
function handleLateParticipants(participants: ScrimParticipant[]) {
  const bench = participants.filter(p => p.assignedTeam === "BENCH");
  const active = participants.filter(
    p => p.assignedTeam === "TEAM_A" || p.assignedTeam === "TEAM_B"
  );

  if (active.length === 0 && bench.length > 0) {
    // 관리자에게 알림
    return {
      warning: "모든 참가자가 벤치에 있습니다.",
      action: "REQUIRES_MANUAL_ASSIGNMENT",
      message: "늦참자를 TEAM_A 또는 TEAM_B로 수동 배정해주세요."
    };
  }
}
```

---

### 4. 홀수 인원일 때

```
투표 현황:
- 참석: 11명
- 불참: 8명
- 늦참: 1명

명단 정리:
→ ScrimParticipant 12명 (참석 11명 + 늦참 1명 벤치)

팀 배정 옵션:
1. 6vs5 (불균형)
2. 5vs5 + 벤치 2명
3. 5vs5 (1명 제외)

결과:
⚠️ 관리자 판단 필요
```

**해결책:**
```typescript
function suggestTeamDistribution(count: number) {
  if (count % 2 !== 0) {
    const half = Math.floor(count / 2);
    return {
      warning: `홀수 인원 (${count}명)`,
      options: [
        {
          label: `${half + 1}vs${half} (불균형)`,
          teamA: half + 1,
          teamB: half,
          bench: 0
        },
        {
          label: `${half}vs${half} + 벤치 1명`,
          teamA: half,
          teamB: half,
          bench: 1
        }
      ]
    };
  }

  // 짝수 인원
  const half = count / 2;
  return {
    options: [
      {
        label: `${half}vs${half}`,
        teamA: half,
        teamB: half,
        bench: 0
      }
    ]
  };
}
```

---

### 5. 투표 후 모두 제외할 때

```
투표 현황:
- 참석: 10명

명단 정리:
→ ScrimParticipant 10명 생성 (status: CONFIRMED)

관리자 작업:
→ 모든 참가자를 REMOVED로 변경

팀 배정 시도:
→ ScrimParticipant.status = CONFIRMED인 사람 0명

결과:
❌ 팀 확정 불가 (SCHEDULED 전환 차단)
⚠️ "확정된 참가자가 없어 내전을 확정할 수 없습니다."
```

**해결책:**
```typescript
async function finalizeScrim(scrimId: string) {
  const participants = await findScrimParticipants(scrimId, {
    status: "CONFIRMED"
  });

  if (participants.length === 0) {
    throw new Error("확정된 참가자가 없어 내전을 확정할 수 없습니다.");
  }

  const teamA = participants.filter(p => p.assignedTeam === "TEAM_A");
  const teamB = participants.filter(p => p.assignedTeam === "TEAM_B");

  if (teamA.length === 0 || teamB.length === 0) {
    throw new Error("양쪽 팀 모두 참가자가 있어야 합니다.");
  }

  // 확정 진행...
}
```

---

### 6. 팀 배정 중복 (Race Condition)

```
시간 T1: 관리자A가 Player1을 TEAM_A로 배정
시간 T2: 관리자B가 Player1을 TEAM_B로 배정 (동시)
시간 T3: 두 요청이 거의 동시에 DB 도착

결과:
❌ 나중 요청이 덮어씀 (Player1 → TEAM_B)
⚠️ 관리자A의 배정 손실
```

**해결책:**
```typescript
async function assignTeam(participantId: string, team: AssignedTeam) {
  await db.transaction(async (trx) => {
    const participant = await trx("scrim_participants")
      .where({ id: participantId })
      .forUpdate()  // Row Lock
      .first();

    if (!participant) {
      throw new Error("참가자를 찾을 수 없습니다.");
    }

    // 버전 체크 (낙관적 잠금)
    const updated = await trx("scrim_participants")
      .where({ id: participantId, updated_at: participant.updated_at })
      .update({
        assignedTeam: team,
        updated_at: new Date()
      });

    if (updated === 0) {
      throw new Error("다른 관리자가 이미 수정했습니다. 새로고침 후 다시 시도하세요.");
    }
  });
}
```

---

### 7. 투표 마감 후 수정 시도

```
시간 T1: 투표 마감 (Vote.status = CLOSED)
시간 T2: 회원A가 마감 직전에 투표 요청 전송 (네트워크 지연)
시간 T3: 서버가 T2 요청 수신

결과:
❌ Vote.status = CLOSED인데 투표가 들어올 수 있음
```

**해결책:**
```typescript
async function castVote(voteId: string, userId: string, optionId: string) {
  const vote = await findVote(voteId);

  // 상태 체크
  if (vote.status !== "OPEN") {
    throw new Error("투표가 마감되었습니다.");
  }

  // 시간 체크 (이중 검증)
  if (vote.deadline && new Date() > vote.deadline) {
    throw new Error("투표 마감 시간이 지났습니다.");
  }

  // 투표 기록...
}
```

---

### 8. 내전 확정 후 참가자 변경 시도

```
시간 T1: Scrim.status = SCHEDULED (팀 확정)
시간 T2: 관리자가 참가자 추가 시도
시간 T3: ScrimParticipant 생성

결과:
⚠️ teamSnapshot은 이미 생성되어 새 참가자가 반영 안 됨
❌ 데이터 불일치
```

**해결책:**
```typescript
async function addScrimParticipant(scrimId: string, userId: string) {
  const scrim = await findScrim(scrimId);

  // DRAFT 상태에서만 참가자 추가 가능
  if (scrim.status !== "DRAFT") {
    throw new Error("내전이 확정된 후에는 참가자를 추가할 수 없습니다.");
  }

  // 참가자 추가...
}
```

---

### 9. 밸런스 극심한 불균형

```
팀 배정:
- TEAM_A: 평균 레이팅 3800 (최상위 팀)
- TEAM_B: 평균 레이팅 2800 (하위 팀)
- 차이: 1000점

결과:
⚠️ 밸런스 경고: "팀 간 레이팅 차이가 1000점입니다."
⚠️ 옵션:
  1. 그대로 진행 (관리자 판단)
  2. 재배정
```

**해결책:**
```typescript
function checkBalance(snapshot: TeamSnapshot) {
  const avgA =
    snapshot.teamA.players.reduce((sum, p) => sum + p.rating, 0) /
    snapshot.teamA.players.length;

  const avgB =
    snapshot.teamB.players.reduce((sum, p) => sum + p.rating, 0) /
    snapshot.teamB.players.length;

  const diff = Math.abs(avgA - avgB);

  if (diff > 200) {
    return {
      warning: `팀 간 레이팅 차이가 ${Math.round(diff)}점입니다.`,
      severity: diff > 500 ? "HIGH" : "MEDIUM",
      suggestion: "재배정을 권장합니다."
    };
  }

  return { ok: true };
}
```

---

### 10. Vote 삭제 시 Scrim 처리

```
시간 T1: Vote 마감, Scrim 생성 (voteId 참조)
시간 T2: 관리자가 Vote 삭제 시도
시간 T3: Scrim.voteId가 유효하지 않게 됨

결과:
❌ FK 제약 위반 또는 참조 무결성 깨짐
```

**해결책:**
```typescript
// Vote 삭제 전 체크
async function deleteVote(voteId: string) {
  const scrim = await findScrim({ voteId });

  if (scrim) {
    throw new Error(
      "이 투표로 생성된 내전이 있어 삭제할 수 없습니다. 먼저 내전을 삭제하세요."
    );
  }

  // 또는 CASCADE DELETE 설정
  // FK: Scrim.voteId → Vote.id ON DELETE SET NULL
}
```

---

## 📋 결함 요약

| # | 결함 | 심각도 | 해결 상태 |
|---|------|--------|-----------|
| 1 | 참가자 0명일 때 | **높음** | ✅ 필수 |
| 2 | 참가자 부족 (10명 미만) | 중간 | ✅ 경고 표시 |
| 3 | 늦참자만 있을 때 | 중간 | ✅ 경고 표시 |
| 4 | 홀수 인원일 때 | 낮음 | ✅ 옵션 제시 |
| 5 | 투표 후 모두 제외 | **높음** | ✅ 필수 |
| 6 | 팀 배정 중복 (Race Condition) | 중간 | ⚠️ 권장 |
| 7 | 투표 마감 후 수정 시도 | 중간 | ✅ 필수 |
| 8 | 내전 확정 후 참가자 변경 | **높음** | ✅ 필수 |
| 9 | 밸런스 극심한 불균형 | 낮음 | ✅ 경고 표시 |
| 10 | Vote 삭제 시 Scrim 처리 | 중간 | ⚠️ 권장 |

---

## 🎯 시스템 개선 효과

### 해결된 주요 문제
✅ 투표와 내전 생성 분리 → 비선형 타임라인 지원
✅ ScrimParticipant로 참가자 관리 → 유연한 명단 정리
✅ DRAFT 상태 도입 → 준비 단계 명확화
✅ 상태 기반 수정 제어 → 확정 후 무단 수정 방지

### 주의할 점
⚠️ 참가자 부족 시 경고 표시 필요
⚠️ Race Condition 방지 (트랜잭션, Row Lock)
⚠️ 밸런스 경고 시스템
⚠️ Vote 삭제 시 참조 무결성 유지

---

## 관련 문서

- **투표 프로세스:** [docs/vote/PROCESS.md](./PROCESS.md)
- **Scrim 프로세스:** [docs/scrim/PROCESS.md](../scrim/PROCESS.md)
- **ERD:** [docs/common/ERD.mmd](../common/ERD.mmd)
