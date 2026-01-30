# POTG 경매 시스템 - 핸드오프 문서

마지막 업데이트: 2026-01-30

---

## 최근 완료 작업

### 2026-01-30 세션

#### [5fc935a] feat: 내 정보 페이지 OverFastAPI 기반 재구성

##### 백엔드 변경
- **User.rating**: `default: 1000` → `nullable: true` (OverFastAPI 연동 후 실제 랭크 사용)
- **User.mainRole**: `default: FLEX` → `nullable: true` (선택적 입력)
- **회원가입 서비스**: `mainRole` 필수 검사 제거

##### 프론트엔드 - 내 정보 페이지 재구성
```
frontend/src/modules/overwatch/components/
└── profile-banner.tsx              # NEW - Namecard 배경 + 아바타 + 동기화 버튼

frontend/src/modules/my-info/
├── index.ts                        # NEW
└── components/
    ├── account-settings-card.tsx   # NEW - 계정 설정 카드
    └── security-settings-card.tsx  # NEW - 보안 설정 카드

frontend/src/app/my-info/page.tsx   # 전면 재구성
```

**새 레이아웃:**
- 상단: ProfileBanner (Namecard 배경 + 아바타 + 동기화)
- 2열 그리드:
  - 왼쪽: 경쟁전 랭크 / 주력 영웅 / 커리어 통계
  - 오른쪽: 계정 설정 / 보안 설정 / 포인트 관리 / 소속 클랜

##### 프론트엔드 - 회원가입 페이지 수정
- **티어 선택 UI 제거** (RANK_OPTIONS 삭제)
- **mainRole 선택적으로 변경** ("나중에 설정할게요" 옵션 추가)
- OverFastAPI 자동 동기화 안내 문구 추가

##### 수정된 파일
```
backend/src/modules/auth/auth.service.ts
backend/src/modules/users/entities/user.entity.ts
frontend/src/app/my-info/page.tsx
frontend/src/app/signup/page.tsx
frontend/src/modules/overwatch/index.ts
frontend/src/modules/overwatch/components/profile-banner.tsx  # NEW
frontend/src/modules/my-info/                                 # NEW
```

#### 헤더에 아케이드(미니게임) 메뉴 추가
- `/games` 경로 접근 가능하도록 navItems에 "아케이드" 추가

##### 수정된 파일
```
frontend/src/common/layouts/header.tsx
```

---

### 2026-01-29 세션 (Phase 1 & 2)

#### [4f7f9f2] fix: 오버워치 페이지 모바일 반응형 수정

- **replay-card.tsx**: 모바일에서 스택 레이아웃으로 변경, 텍스트 truncate 적용
- **replays/page.tsx**: 필터 셀렉트박스 모바일 flex-1 레이아웃 개선
- **profile-header.tsx**: 동기화 버튼 모바일 전체 너비 적용

#### [90a92b3] feat: 오버워치 Phase 1 & 2 구현 + 보안 수정

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

---

## 다음 단계 (TODO)

### 즉시 해야할 것

1. **DB 마이그레이션 (CRITICAL)**
   - `User.rating`, `User.mainRole` nullable 변경 (2026-01-30)
   - `User.battleTag` nullable 변경
   - `Replay` 엔티티 생성

2. **배포 후 수동 테스트**
   - 내 정보 페이지: ProfileBanner + 레이아웃 확인
   - 회원가입: rating 없이 가입 정상 동작
   - OverFastAPI 연동: 프로필 조회/동기화 정상 동작
   - 아케이드 메뉴 접근 확인

3. **환경변수 추가** (선택)
   ```env
   OVERFAST_API_URL=https://overfast-api.tekrop.fr
   OVERFAST_API_TIMEOUT=15000
   OVERFAST_USER_AGENT=POTG-Backend/1.0
   ```

### 선택적 개선사항

- React Query 적용 확대
- Framer Motion 애니메이션 확장
- 스켈레톤 로딩 적용
- 404/에러 페이지

---

## 현재 페이지 라우트 구조

```
/                           # 로비 (대시보드)
/login                      # 로그인
/signup                     # 회원가입
/forgot-password            # 비밀번호 찾기
/reset-password             # 비밀번호 재설정

/my-info                    # 내 정보 (재구성됨)
/wallet                     # 포인트 지갑

/auction                    # 경매 목록
/auction/[id]               # 경매 상세

/betting                    # 베팅 목록
/betting/my-bets            # 내 베팅

/shop                       # 상점
/vote                       # 투표 목록
/vote/[id]                  # 투표 상세

/scrim                      # 내전 목록
/scrim/[id]                 # 내전 상세

/games                      # 아케이드 (메인)
/games/quiz                 # 퀴즈 배틀
/games/leaderboard          # 리더보드

/utility                    # 유틸리티
/gallery                    # 소개팅
/gallery/[id]               # 소개팅 상세
/gallery/register           # 소개팅 등록

/overwatch/profile          # 오버워치 프로필
/overwatch/database         # 영웅/맵 DB
/overwatch/replays          # 리플레이 코드
/overwatch/leaderboard      # 리더보드

/clan/create                # 클랜 생성
/clan/join                  # 클랜 가입
/clan/manage                # 클랜 관리

/profile/[memberId]         # 멤버 프로필
/profile/shop               # 프로필 상점
```

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

## 테스트 계정

- **tcaptain1** / test1234 (TCaptain1#1111, 탱커, 마스터)
- **tcaptain2** / test1234 (TCaptain2#2222, DPS, 마스터)
- 테스트 경매 ID: `54079df7-f010-4923-a8e0-addbf8058622`

---

## 주의사항

### DB 마이그레이션 필수
TypeORM sync 또는 마이그레이션 실행 필요:
- User.rating, User.mainRole nullable 변경 (2026-01-30)
- OverwatchProfile, OverwatchStatsSnapshot (2026-01-29)
- Replay 엔티티 (2026-01-29)
- PointRule, AttendanceRecord (2026-01-28)
- Scrim/ScrimParticipant 필드 확장 (2026-01-28)
- PasswordReset, Announcement, HallOfFame (이전)

### Entity 변경 시 규칙
1. `docs/erd.md` 업데이트
2. 마이그레이션 작성
3. handoff 문서 기록
