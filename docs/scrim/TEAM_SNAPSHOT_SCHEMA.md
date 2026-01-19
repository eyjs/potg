# teamSnapshot JSON 스키마 (Team Snapshot Schema)

`Scrim.teamSnapshot`은 내전 확정 시점의 팀 구성을 JSON 형태로 저장합니다.

## 목적

- 내전 시작 후 참가자 정보(레이팅, 포지션 등) 변경되어도 스냅샷 유지
- 과거 내전 기록 조회 시 당시 팀 구성 확인
- 통계 분석 시 당시 밸런스 계산 가능

---

## TypeScript 인터페이스

```typescript
interface TeamSnapshot {
  recruitmentType: RecruitmentType;
  sourceId?: string;
  teamA: TeamInfo;
  teamB: TeamInfo;
  bench: PlayerInfo[];
  snapshotAt: string;  // ISO 8601 timestamp
}

type RecruitmentType = "vote" | "auction" | "manual";

interface TeamInfo {
  captain?: string;  // userId (경매 기반 시에만)
  players: PlayerInfo[];
}

interface PlayerInfo {
  userId: string;
  battleTag: string;
  role: PlayerRole;
  rating: number;
}

type PlayerRole = "TANK" | "DPS" | "SUPPORT" | "FLEX";
```

---

## JSON 예시

### 투표 기반 내전 (VOTE)

```json
{
  "recruitmentType": "vote",
  "sourceId": "550e8400-e29b-41d4-a716-446655440000",
  "teamA": {
    "players": [
      {
        "userId": "user-1",
        "battleTag": "Player1#1234",
        "role": "TANK",
        "rating": 3500
      },
      {
        "userId": "user-2",
        "battleTag": "Player2#5678",
        "role": "DPS",
        "rating": 3450
      },
      {
        "userId": "user-3",
        "battleTag": "Player3#9012",
        "role": "DPS",
        "rating": 3400
      },
      {
        "userId": "user-4",
        "battleTag": "Player4#3456",
        "role": "SUPPORT",
        "rating": 3350
      },
      {
        "userId": "user-5",
        "battleTag": "Player5#7890",
        "role": "SUPPORT",
        "rating": 3300
      }
    ]
  },
  "teamB": {
    "players": [
      {
        "userId": "user-6",
        "battleTag": "Player6#1111",
        "role": "TANK",
        "rating": 3480
      },
      {
        "userId": "user-7",
        "battleTag": "Player7#2222",
        "role": "DPS",
        "rating": 3420
      },
      {
        "userId": "user-8",
        "battleTag": "Player8#3333",
        "role": "DPS",
        "rating": 3380
      },
      {
        "userId": "user-9",
        "battleTag": "Player9#4444",
        "role": "SUPPORT",
        "rating": 3340
      },
      {
        "userId": "user-10",
        "battleTag": "Player10#5555",
        "role": "SUPPORT",
        "rating": 3320
      }
    ]
  },
  "bench": [
    {
      "userId": "user-11",
      "battleTag": "Player11#6666",
      "role": "FLEX",
      "rating": 3250
    }
  ],
  "snapshotAt": "2024-12-15T15:00:00Z"
}
```

**평균 레이팅:**
- Team A: (3500 + 3450 + 3400 + 3350 + 3300) / 5 = **3400**
- Team B: (3480 + 3420 + 3380 + 3340 + 3320) / 5 = **3388**
- 차이: **12** (밸런스 양호)

---

### 경매 기반 내전 (AUCTION)

```json
{
  "recruitmentType": "auction",
  "sourceId": "auction-uuid",
  "teamA": {
    "captain": "user-captain-a",  // 경매 팀장 (참고용, 마스터가 수동 배정)
    "players": [
      {
        "userId": "user-captain-a",
        "battleTag": "CaptainA#1234",
        "role": "TANK",
        "rating": 3600
      },
      {
        "userId": "user-2",
        "battleTag": "Player2#5678",
        "role": "DPS",
        "rating": 3450
      },
      {
        "userId": "user-3",
        "battleTag": "Player3#9012",
        "role": "DPS",
        "rating": 3400
      },
      {
        "userId": "user-4",
        "battleTag": "Player4#3456",
        "role": "SUPPORT",
        "rating": 3350
      },
      {
        "userId": "user-5",
        "battleTag": "Player5#7890",
        "role": "SUPPORT",
        "rating": 3300
      }
    ]
  },
  "teamB": {
    "captain": "user-captain-b",
    "players": [
      {
        "userId": "user-captain-b",
        "battleTag": "CaptainB#9999",
        "role": "TANK",
        "rating": 3550
      },
      {
        "userId": "user-6",
        "battleTag": "Player6#1111",
        "role": "DPS",
        "rating": 3480
      },
      {
        "userId": "user-7",
        "battleTag": "Player7#2222",
        "role": "DPS",
        "rating": 3420
      },
      {
        "userId": "user-8",
        "battleTag": "Player8#3333",
        "role": "SUPPORT",
        "rating": 3380
      },
      {
        "userId": "user-9",
        "battleTag": "Player9#4444",
        "role": "SUPPORT",
        "rating": 3320
      }
    ]
  },
  "bench": [],
  "snapshotAt": "2024-12-15T18:00:00Z"
}
```

**특징:**
- `captain` 필드 존재 (경매 기반에서 참고용)
- **주의**: 경매 후에도 마스터가 수동으로 팀 배정함
- captain은 경매 팀장을 표시하지만, 실제 배정은 마스터가 결정
- 팀장도 players 배열에 포함됨
- 오버워치 기본: 5vs5 (각 팀 5명)

---

### 수동 생성 내전 (MANUAL)

```json
{
  "recruitmentType": "manual",
  "teamA": {
    "players": [
      {
        "userId": "user-1",
        "battleTag": "Player1#1234",
        "role": "TANK",
        "rating": 3500
      },
      {
        "userId": "user-2",
        "battleTag": "Player2#5678",
        "role": "DPS",
        "rating": 3400
      }
    ]
  },
  "teamB": {
    "players": [
      {
        "userId": "user-3",
        "battleTag": "Player3#9012",
        "role": "TANK",
        "rating": 3480
      },
      {
        "userId": "user-4",
        "battleTag": "Player4#3456",
        "role": "DPS",
        "rating": 3420
      }
    ]
  },
  "bench": [],
  "snapshotAt": "2024-12-15T19:00:00Z"
}
```

**특징:**
- `sourceId` 없음 (투표/경매 ID 없음)
- 소수 인원 가능 (2vs2, 3vs3 등)

---

## 필드 설명

### recruitmentType
- **타입:** `"vote" | "auction" | "manual"`
- **필수:** ✅
- **설명:** 내전 생성 방식
- **사용:**
  - 내전 기록 조회 시 어떻게 만들어진 내전인지 표시
  - 통계 분석 시 생성 방식별 필터링

### sourceId
- **타입:** `string` (uuid)
- **필수:** ❌ (manual일 때 없음)
- **설명:** 원본 Vote 또는 Auction의 ID
- **사용:**
  - 투표 결과로 돌아가기 (voteId)
  - 경매 결과로 돌아가기 (auctionId)

### teamA / teamB
- **타입:** `TeamInfo`
- **필수:** ✅
- **설명:** 각 팀의 참가자 정보
- **구성:**
  - `captain` (optional): 팀장 userId (경매 기반 시에만)
  - `players` (required): 팀 멤버 배열

### players
- **타입:** `PlayerInfo[]`
- **필수:** ✅
- **설명:** 팀 멤버 리스트
- **주의:** 팀장도 이 배열에 포함됨 (경매 기반)

### PlayerInfo
| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | string | User ID (FK) |
| `battleTag` | string | 배틀태그 (예: Player1#1234) |
| `role` | PlayerRole | 주 포지션 (TANK/DPS/SUPPORT/FLEX) |
| `rating` | number | **스냅샷 시점의 레이팅** |

**중요:** `rating`은 내전 확정 당시의 값을 저장합니다. 이후 사용자의 레이팅이 변경되어도 스냅샷은 변하지 않습니다.

### bench
- **타입:** `PlayerInfo[]`
- **필수:** ✅ (빈 배열 가능)
- **설명:** 벤치 멤버 (교체 대기 선수)
- **사용:**
  - 늦참자
  - 교체 선수
  - 6~7명 로스터 시 추가 멤버

### snapshotAt
- **타입:** `string` (ISO 8601)
- **필수:** ✅
- **설명:** 스냅샷 생성 시각
- **예시:** `"2024-12-15T15:00:00Z"`
- **사용:**
  - 언제 팀이 확정되었는지 기록
  - 내전 시작 시간과 다를 수 있음 (DRAFT → SCHEDULED 전환 시점)

---

## 생성 로직 (TypeScript)

### 투표/수동 기반

```typescript
async function generateTeamSnapshot(scrimId: string): Promise<TeamSnapshot> {
  const scrim = await findScrim(scrimId);
  const participants = await findScrimParticipants(scrimId, {
    status: "CONFIRMED"
  });

  const teamA = participants.filter(p => p.assignedTeam === "TEAM_A");
  const teamB = participants.filter(p => p.assignedTeam === "TEAM_B");
  const bench = participants.filter(p => p.assignedTeam === "BENCH");

  const snapshot: TeamSnapshot = {
    recruitmentType: scrim.recruitmentType,
    sourceId: scrim.voteId || undefined,  // manual이면 undefined
    teamA: {
      players: await Promise.all(
        teamA.map(async p => {
          const user = await findUser(p.userId);
          return {
            userId: user.id,
            battleTag: user.battleTag,
            role: user.mainRole,
            rating: user.rating  // 현재 레이팅 저장
          };
        })
      )
    },
    teamB: {
      players: await Promise.all(
        teamB.map(async p => {
          const user = await findUser(p.userId);
          return {
            userId: user.id,
            battleTag: user.battleTag,
            role: user.mainRole,
            rating: user.rating
          };
        })
      )
    },
    bench: await Promise.all(
      bench.map(async p => {
        const user = await findUser(p.userId);
        return {
          userId: user.id,
          battleTag: user.battleTag,
          role: user.mainRole,
          rating: user.rating
        };
      })
    ),
    snapshotAt: new Date().toISOString()
  };

  return snapshot;
}
```

### 경매 기반

```typescript
async function generateTeamSnapshotFromAuction(
  scrimId: string,
  auctionId: string
): Promise<TeamSnapshot> {
  const participants = await findAuctionParticipants(auctionId);
  const captains = participants.filter(p => p.role === "CAPTAIN");

  const teamA = participants.filter(
    p => p.teamId === captains[0].id || p.id === captains[0].id
  );
  const teamB = participants.filter(
    p => p.teamId === captains[1].id || p.id === captains[1].id
  );

  const snapshot: TeamSnapshot = {
    recruitmentType: "auction",
    sourceId: auctionId,
    teamA: {
      captain: captains[0].userId,  // 팀장 추가
      players: await Promise.all(
        teamA.map(async p => {
          const user = await findUser(p.userId);
          return {
            userId: user.id,
            battleTag: user.battleTag,
            role: user.mainRole,
            rating: user.rating
          };
        })
      )
    },
    teamB: {
      captain: captains[1].userId,
      players: await Promise.all(
        teamB.map(async p => {
          const user = await findUser(p.userId);
          return {
            userId: user.id,
            battleTag: user.battleTag,
            role: user.mainRole,
            rating: user.rating
          };
        })
      )
    },
    bench: [],  // 경매는 보통 벤치 없음
    snapshotAt: new Date().toISOString()
  };

  return snapshot;
}
```

---

## 활용 예시

### 밸런스 계산

```typescript
function calculateBalance(snapshot: TeamSnapshot) {
  const avgRatingA =
    snapshot.teamA.players.reduce((sum, p) => sum + p.rating, 0) /
    snapshot.teamA.players.length;

  const avgRatingB =
    snapshot.teamB.players.reduce((sum, p) => sum + p.rating, 0) /
    snapshot.teamB.players.length;

  const diff = Math.abs(avgRatingA - avgRatingB);

  return {
    avgRatingA,
    avgRatingB,
    diff,
    isBalanced: diff < 50  // 50점 차이 이하면 밸런스 양호
  };
}
```

### 포지션별 통계

```typescript
function getRoleDistribution(snapshot: TeamSnapshot) {
  const teamA = snapshot.teamA.players;
  const teamB = snapshot.teamB.players;

  return {
    teamA: {
      TANK: teamA.filter(p => p.role === "TANK").length,
      DPS: teamA.filter(p => p.role === "DPS").length,
      SUPPORT: teamA.filter(p => p.role === "SUPPORT").length,
      FLEX: teamA.filter(p => p.role === "FLEX").length
    },
    teamB: {
      TANK: teamB.filter(p => p.role === "TANK").length,
      DPS: teamB.filter(p => p.role === "DPS").length,
      SUPPORT: teamB.filter(p => p.role === "SUPPORT").length,
      FLEX: teamB.filter(p => p.role === "FLEX").length
    }
  };
}
```

### 과거 내전 조회

```typescript
async function getScrimHistory(userId: string) {
  const scrims = await findScrims({
    status: "FINISHED",
    "teamSnapshot.teamA.players.userId": userId  // JSONb 쿼리
  });

  return scrims.map(scrim => ({
    title: scrim.title,
    date: scrim.scheduledDate,
    myTeam: scrim.teamSnapshot.teamA.players.some(p => p.userId === userId)
      ? "TEAM_A"
      : "TEAM_B",
    myRatingThen: scrim.teamSnapshot.teamA.players.find(p => p.userId === userId)?.rating ||
                   scrim.teamSnapshot.teamB.players.find(p => p.userId === userId)?.rating,
    result: scrim.teamAScore > scrim.teamBScore ? "WIN" : "LOSE"
  }));
}
```

---

## 주의 사항

### ⚠️ 스냅샷은 불변

- teamSnapshot 생성 후 수정 불가
- User.rating이 변경되어도 스냅샷의 rating은 유지
- 내전 시작 후 팀 변경 필요 시 ScrimMatchEntry 사용

### ⚠️ JSON 구조 검증

- Backend에서 저장 전 스키마 검증 필요
- 잘못된 구조 저장 시 조회 시 에러 발생 가능

### ⚠️ 쿼리 성능

- JSONb 필드는 인덱싱 가능하지만 복잡한 쿼리는 느림
- 자주 조회하는 필드는 별도 컬럼 추가 고려 (예: avgRatingA, avgRatingB)

---

## 관련 문서

- **Scrim 프로세스:** [docs/scrim/PROCESS.md](./PROCESS.md)
- **ERD:** [docs/common/ERD.mmd](../common/ERD.mmd)
