# POTG 경매 시스템 - 핸드오프 문서

마지막 업데이트: 2026-01-29

---

## 최근 완료 작업

### 2026-01-29 세션 (Phase 1 & 2)

#### [491c0a4] feat: 오버워치 Phase 1 & 2 구현 + 보안 수정

#### 코드 리뷰 1차 수정 사항 (CRITICAL/HIGH)

1. **`any` 타입 제거** - `unknown` + 타입가드로 변경
   - `overwatch-api.service.ts`: error handling
   - `overwatch.service.ts`: API 응답 타입 캐스팅

2. **Entity 관계 오류 수정**
   - `OverwatchStatsSnapshot.profile`: `@OneToMany` → `@ManyToOne`

3. **battleTag nullable 수정**
   - `User.battleTag`: `nullable: true` 추가 (마이그레이션 필요!)

4. **Rate Limiting 추가**
   - `POST /overwatch/profile/me/sync`: 1분에 3회 제한
   - `limit` 파라미터 DTO 검증 추가

5. **ConfigService 적용**
   - OverFast API URL, timeout 환경변수로 이동

#### 코드 리뷰 2차 수정 사항 (보안)

1. **CRITICAL: 클랜 접근 권한 검증 추가**
   - `replay.controller.ts`: `findByClan`, `getClanStats`에 ForbiddenException
   - `overwatch.controller.ts`: `getClanRankings`에 ForbiddenException

2. **HIGH: Rate Limiting 추가**
   - `POST /replays/:id/like`: 1분에 10회 제한 (@Throttle)

3. **MEDIUM: SQL Wildcard Injection 방지**
   - `replay.service.ts`: Like 쿼리에서 `%`, `_` 문자 이스케이프

4. **MEDIUM: Race Condition 수정**
   - `replay.service.ts`: toggleLike에 Transaction + Pessimistic Lock 적용

#### Phase 1: 클랜원 프로필 카드 + 리더보드

##### 백엔드 수정
- `/overwatch/profile/me` - 내 프로필 조회
- `/overwatch/rankings/:clanId` - 클랜 리더보드
- Rate Limiting, Query Parameter 검증

##### 프론트엔드 추가
```
frontend/src/modules/overwatch/
├── types.ts                           # 타입 정의
├── hooks/
│   └── use-overwatch-profile.ts       # API 훅
└── components/
    ├── profile-header.tsx             # 프로필 헤더
    ├── rank-card.tsx                  # 역할별 랭크
    ├── hero-stats-card.tsx            # 주력 영웅
    ├── career-stats-card.tsx          # 커리어 통계
    └── clan-leaderboard.tsx           # 클랜 리더보드

frontend/src/app/overwatch/
├── profile/page.tsx                   # 프로필 페이지
└── leaderboard/page.tsx               # 리더보드 페이지

frontend/src/common/components/ui/
└── skeleton.tsx                       # NEW - 스켈레톤 컴포넌트
```

#### Phase 2: 영웅/맵 DB + 리플레이 공유

##### 백엔드 추가
- **게임 데이터 API** (Public)
  - `GET /overwatch/heroes` - 영웅 목록
  - `GET /overwatch/heroes/:heroKey` - 영웅 상세
  - `GET /overwatch/maps` - 맵 목록
  - `GET /overwatch/gamemodes` - 게임모드 목록
  - `GET /overwatch/roles` - 역할 목록

- **Replay Entity** (NEW - 마이그레이션 필요!)
  ```typescript
  {
    id: string
    code: string (5-6자 영문숫자)
    userId: string
    clanId: string
    mapName: string
    gamemode?: string
    heroes: string[]
    result: 'WIN' | 'LOSS' | 'DRAW'
    videoUrl?: string
    notes?: string
    tags?: string[]
    likes: number
    views: number
  }
  ```

- **Replay API**
  - `POST /replays` - 리플레이 등록
  - `GET /replays/clan/:clanId` - 클랜 리플레이 목록
  - `GET /replays/mine` - 내 리플레이
  - `GET /replays/stats/:clanId` - 클랜 통계
  - `GET /replays/:id` - 상세 조회
  - `PATCH /replays/:id` - 수정
  - `DELETE /replays/:id` - 삭제
  - `POST /replays/:id/like` - 좋아요

##### 프론트엔드 추가
```
frontend/src/modules/overwatch/
├── hooks/
│   ├── use-game-data.ts               # 영웅/맵/게임모드 훅
│   └── use-replays.ts                 # 리플레이 훅
└── components/
    ├── hero-card.tsx                  # 영웅 카드
    ├── hero-detail-modal.tsx          # 영웅 상세 모달
    ├── map-card.tsx                   # 맵 카드
    ├── replay-card.tsx                # 리플레이 카드
    └── create-replay-modal.tsx        # 리플레이 등록 모달

frontend/src/app/overwatch/
├── database/page.tsx                  # 영웅/맵 DB 페이지
└── replays/page.tsx                   # 리플레이 페이지
```

##### Header 업데이트
- 오버워치 프로필, 영웅/맵 DB, 리플레이 코드 메뉴 추가

---

#### [c888dc1] OverFastAPI 연동 - 오버워치 프로필 모듈 구현

##### 백엔드 추가
- **OverwatchProfile 엔티티** - 오버워치 플레이어 프로필 저장
- **OverwatchStatsSnapshot 엔티티** - 통계 히스토리 스냅샷
- **OverFastAPI 클라이언트 서비스** - 외부 API 연동
  - 플레이어 요약 조회
  - 통계 조회
  - 영웅 목록 조회
- **프로필 API**
  - `GET /overwatch/profile/:battleTag` - 프로필 조회
  - `POST /overwatch/profile/:battleTag/sync` - 동기화
  - `GET /overwatch/profile/:battleTag/heroes` - 영웅 통계
  - `GET /overwatch/profile/:battleTag/competitive` - 경쟁전 정보
  - `GET /clans/:clanId/ranking` - 클랜 내 랭킹

##### 수정된 파일
```
backend/src/modules/overwatch/           # NEW - 전체 모듈
├── overwatch.module.ts
├── overwatch.controller.ts
├── overwatch.service.ts
├── overfast-api.service.ts              # 외부 API 클라이언트
└── entities/
    ├── overwatch-profile.entity.ts
    └── overwatch-stats-snapshot.entity.ts
docs/erd.md                              # 업데이트
```

#### [a8b4f56] 내전 목록 페이지에 생성 버튼 추가

- 스크림 목록 페이지에 생성 버튼 추가
- CreateScrimModal 연동
- 생성 후 상세 페이지로 자동 이동
- toast 알림 추가

##### 수정된 파일
```
frontend/src/app/scrims/page.tsx
```

#### [f62d0f9] CI/CD 브랜치 수정

- GitHub Actions 워크플로우의 브랜치를 `main`에서 `master`로 변경

---

### 2026-01-28 세션

#### [WBS-020] Phase 2: 출석 & 포인트 규칙 시스템

##### 백엔드 추가
- **PointRule 엔티티** - 포인트 규칙 정의
  - 기본 규칙 시드: 출석, 연속보너스(3/5/10일), 승리
- **AttendanceRecord 엔티티** - 출석 기록
  - 내전 종료 시 자동 출석 생성
  - 연속 출석 보너스 계산 (최고 티어만 적용)

##### 프론트엔드 추가
- 클랜 관리 페이지에 포인트 규칙/출석 관리 탭 추가

##### 수정된 파일
```
backend/src/modules/point-rules/         # NEW
├── point-rules.module.ts
├── point-rules.controller.ts
├── point-rules.service.ts
└── entities/point-rule.entity.ts
backend/src/modules/attendance/          # NEW
├── attendance.module.ts
├── attendance.service.ts
└── entities/attendance-record.entity.ts
frontend/src/app/clans/[id]/manage/page.tsx
docs/erd.md                              # PointRule.code 컬럼 반영
```

#### [WBS-020] Phase 1: 스크림 스케줄러 고도화 + Vote 디커플링

##### 백엔드 변경
- **Scrim Entity 확장**
  - `checkInStart`, `minPlayers`, `maxPlayers`, `roleSlots`, `description`
- **ScrimParticipant 확장**
  - `preferredRoles`, `assignedRole`, `note`, `checkedIn`, `checkedInAt`, `respondedAt`
- **Vote-Scrim 디커플링**
  - VotesService에서 ScrimsService 의존성 제거
  - RecruitmentType/ParticipantSource에서 VOTE 제거, OPEN 추가
- **체크인 기능**
  - 시간 윈도우 기반 체크인 API

##### 프론트엔드 변경
- 참가 신청 다이얼로그: 선호 역할 + 메모 입력
- 체크인 기능 UI
- 내전 생성 폼: 모집방식, 체크인시간, 인원제한, 설명 필드 추가

##### 코드 품질 개선
- `any` 타입 전면 제거: `Record<string, unknown>` + 명시적 캐스팅
- 유저 데이터 sanitization 헬퍼 추출

##### 수정된 파일
```
backend/src/modules/scrims/
├── scrims.service.ts
├── scrims.controller.ts
└── entities/
    ├── scrim.entity.ts
    └── scrim-participant.entity.ts
backend/src/modules/votes/votes.service.ts
frontend/src/app/scrims/[id]/page.tsx
frontend/src/modules/scrim/components/
docs/erd.md                              # Attendance, Achievement, Mentoring, Bingo 도메인 추가
```

---

### 2026-01-27 세션

#### [WBS-012] 경매 포인트 차감 버그 수정 및 자동 낙찰 로직

1. **confirmCurrentBid 포인트 차감 누락 수정** (치명적 버그)
   - 낙찰 확정 시 `captain.currentPoints -= amount` 추가

2. **autoConfirmOnTimeout 포인트 차감 누락 수정** (치명적 버그)
   - 타임아웃 자동 낙찰 시에도 포인트 차감 로직 추가

3. **checkAutoConfirm() 자동 낙찰 로직 추가**
   - 입찰 후 모든 경쟁 팀장의 잔여 포인트가 최소 다음 입찰가 미만이면 자동 낙찰

4. **window.location.reload() → socket requestRoomState 대체**

5. **선수 풀 상태 배지 UI 추가**
   - 현재 경매 중인 선수: "경매중" 배지 (파란색)
   - 나머지 선수: "대기" 배지

##### 수정된 파일
```
backend/src/modules/auctions/auction.gateway.ts
backend/src/modules/auctions/auctions.service.ts
frontend/src/app/auction/[id]/page.tsx
frontend/src/modules/auction/hooks/use-auction-socket.ts
```

---

### 2026-01-26 세션

#### 프론트엔드 버그 수정 (6건)

1. **명예의전당 CRUD 500 에러** - `title` 필드 누락 수정
2. **WebSocket URL** - fallback URL을 운영 서버로 변경
3. **베팅 카운트다운** - 실시간 카운트다운 + 관리자 마감/수정 기능
4. **상점 카테고리 제거** - 탭/Badge 제거, toast 전환
5. **소개팅 필터링 개선** - 성별/나이/MBTI/지역/흡연 필터
6. **React #418 Hydration 에러** - mounted 상태 추가

---

## 다음 단계 (TODO)

### 즉시 해야할 것

1. **DB 마이그레이션 (CRITICAL)**
   - `User.battleTag` nullable 변경
   - `Replay` 엔티티 생성

2. **배포 후 수동 테스트**
   - OverFastAPI 연동: 프로필 조회/동기화 정상 동작
   - 영웅/맵 DB 페이지 확인
   - 리플레이 등록/조회/삭제 테스트
   - 클랜 리더보드 확인

3. **환경변수 추가** (선택)
   ```env
   OVERFAST_API_URL=https://overfast-api.tekrop.fr
   OVERFAST_API_TIMEOUT=15000
   OVERFAST_USER_AGENT=POTG-Backend/1.0
   ```

4. **환경변수 설정** (이메일 발송용)
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="POTG" <noreply@potg.gg>
   FRONTEND_URL=http://localhost:3001
   ```

3. **DB 마이그레이션 필요**
   - OverwatchProfile, OverwatchStatsSnapshot
   - PointRule, AttendanceRecord
   - Scrim/ScrimParticipant 필드 확장
   - PasswordReset, Announcement, HallOfFame

4. **ESLint 설정 수정**
   - ESLint 9.x circular reference 에러 해결 필요

### 선택적 개선사항

- React Query 적용 확대
- Framer Motion 애니메이션 확장
- 스켈레톤 로딩 적용
- 404/에러 페이지

---

## 권한 체계

### 시스템 역할 (UserRole)
| 역할 | 설명 |
|------|------|
| **ADMIN** | POTG 시스템 관리자 (모든 클랜 전체 권한) |
| **USER** | 일반 사용자 |

### 클랜 역할 (ClanRole)
| 역할 | 권한 |
|------|------|
| **MASTER** | 클랜 내 모든 권한 |
| **MANAGER** | 투표/스크림/경매/상품/베팅/공지/명예의전당 CRUD |
| **MEMBER** | 참여만 가능 |

---

## 신규 엔티티 스키마 (마이그레이션 필요)

### OverwatchProfile
```typescript
{
  id: string (UUID)
  clanMemberId: string
  battleTag: string (unique)
  platform: string
  isPublic: boolean
  level: number
  endorsementLevel: number
  avatar: string (nullable)
  namecard: string (nullable)
  title: string (nullable)
  lastSyncedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

### OverwatchStatsSnapshot
```typescript
{
  id: string (UUID)
  profileId: string
  gameMode: 'competitive' | 'quickplay'
  role: 'tank' | 'damage' | 'support' | 'all'
  rank: string (nullable)
  rankIcon: string (nullable)
  tier: number (nullable)
  division: number (nullable)
  gamesPlayed: number
  gamesWon: number
  winRate: number
  kdRatio: number
  snapshotDate: date
  rawData: jsonb
  createdAt: timestamp
}
```

### PointRule
```typescript
{
  id: string (UUID)
  clanId: string
  code: string (unique per clan)
  name: string
  description: string
  points: number
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### AttendanceRecord
```typescript
{
  id: string (UUID)
  clanMemberId: string
  scrimId: string
  attendedAt: timestamp
  pointsAwarded: number
  consecutiveDays: number
  createdAt: timestamp
}
```

---

## 테스트 계정

- **tcaptain1** / test1234 (TCaptain1#1111, 탱커, 마스터)
- **tcaptain2** / test1234 (TCaptain2#2222, DPS, 마스터)
- 테스트 경매 ID: `54079df7-f010-4923-a8e0-addbf8058622`

---

## 주의사항

### DB 마이그레이션 필수
TypeORM sync 또는 마이그레이션 실행 필요:
- OverwatchProfile, OverwatchStatsSnapshot (2026-01-29)
- PointRule, AttendanceRecord (2026-01-28)
- Scrim/ScrimParticipant 필드 확장 (2026-01-28)
- PasswordReset, Announcement, HallOfFame (이전)

### Entity 변경 시 규칙
1. `docs/erd.md` 업데이트
2. 마이그레이션 작성
3. handoff 문서 기록
