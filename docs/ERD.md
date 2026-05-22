# POTG Project ERD

> **Phase 2 (핵심 비즈니스 로직) 변경 요약** — 2026-05-22
>
> - 신규 엔티티: `BettingStake` — 패리뮤추얼 사용자 베팅 단위 (market_id, user_id, side, stake, payout, status PLACED/WON/LOST/REFUNDED)
> - 폐기 (DROP TABLE):
>   - `point_logs` → `point_tx` (Ledger)
>   - `betting_questions`, `betting_tickets` → `betting_markets` + `betting_stakes`
>   - `shop_purchases` → `market_orders`
> - 서비스 재작성:
>   - `LedgerService` — transfer/mint/burn 원자적 잔액 갱신 + SELECT FOR UPDATE (작은 id부터 잠금)
>   - `BettingService` — 패리뮤추얼 정산 `payout = floor(stake * (pool - rake) / winningPool)`, 5% Rake, LOCKED 후 차단
>   - `ShopService` — 즉시차감 (UPDATE … WHERE stock >= q 원자적 차감 + LedgerService.burn + MarketOrder COMPLETED)
>   - `MatchService` — DRAFT→BETTING_OPEN→LOCKED→SETTLED 상태머신 + BettingMarket 자동 연동
>   - `WalletService` — ClanMember 의존 제거, LedgerService 위임 (user.points_balance 기반)
> - 신규 가드: `MarketGateGuard` — 출석 7일 + 내전 2회 (SystemConfig 키 조정 가능)
>
> **Phase 1 (Discord refactor) 변경 요약** — 2026-05-22
>
> - `User` 확장: `discord_id` (UNIQUE, nullable), `points_balance` (bigint, PointTx 합 캐시), `market_gate_passed` (bool), `UserRole` enum에 `CAPTAIN` 추가
> - 신규 엔티티 (8종):
>   - `PointTx` — 복식부기 원장 (append-only). `from_account`/`to_account`/`amount`/`reason`/`ref_type`/`ref_id`. SINK 계정 ID = `00000000-0000-0000-0000-000000000000`
>   - `Match`, `Team`, `TeamMember` — 내전 도메인 (상태머신: DRAFT → BETTING_OPEN → LOCKED → SETTLED, CANCELLED)
>   - `BettingMarket` — 패리뮤추얼 마켓 (WIN | RANK). 개별 stake 엔티티는 Phase 2 추가 예정
>   - `MarketOrder` — 즉시 차감 마켓 주문 (COMPLETED/DELIVERED/CANCELLED)
>   - `SystemConfig` — 경제 파라미터 KV (SEED_AMOUNT, MONTHLY_CAP, RAKE_BPS, MARKET_GATE_* 5건 시드)
> - 폐기 예정 (Phase 2에서 서비스 재작성과 함께 제거):
>   - `PointLog` (→ `PointTx`), `BettingQuestion`/`BettingTicket` (→ `BettingMarket` + 신규 stake), `ShopPurchase` (→ `MarketOrder`), `ClanMember.totalPoints/lockedPoints` (→ `User.pointsBalance` + Ledger)
> - 폐기 예정 (Phase 5): `GameRoom`, `GameRoomPlayer`, `GameScore`, 파티게임 관련 엔티티
> - 인프라:
>   - TypeORM 마이그레이션 도입 (`backend/src/database/migrations/`, `data-source.ts`)
>   - `synchronize: false` 기본값 (환경변수 `SYNC_SCHEMA=true` 로컬 한정 임시 허용)
>   - `npm run migration:run / migration:generate / migration:revert / migration:show` 스크립트 추가

## Real-time Entity Relationship Diagram

```mermaid
erDiagram
    %% ==========================================
    %% Clan Domain
    %% ==========================================
    Clan {
        uuid id PK
        string name UK
        string tag UK
        string description "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    %% User Domain
    User {
        uuid id PK
        string battleTag UK
        string password "Nullable"
        string discord_id UK "Phase 1: Discord OAuth 식별자 (UNIQUE, Nullable)"
        bigint points_balance "Phase 1: PointTx 합 캐시 (default 0)"
        boolean market_gate_passed "Phase 1: 마켓 게이트 통과 여부 (default false)"
        enum role "USER, CAPTAIN, ADMIN (Phase 1: CAPTAIN 추가)"
        enum mainRole "TANK, DPS, SUPPORT, FLEX"
        int rating
        string avatarUrl
        boolean bettingFloatingEnabled "베팅 플로팅 버튼 사용 여부 (기본값: false)"
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% Phase 1 (Discord refactor) 신규 엔티티
    %% ==========================================
    PointTx {
        uuid id PK
        uuid from_account "Nullable; SINK=00000000-... 시스템 계정"
        uuid to_account "Nullable; null=burn"
        bigint amount "정수 포인트"
        string reason "SEED|BET_STAKE|BET_PAYOUT|BET_RAKE|MARKET_BUY|MARKET_REFUND|ADMIN_ADJUST 등"
        string ref_type "Nullable; BettingMarket|MarketOrder|Match"
        uuid ref_id "Nullable"
        text memo "Nullable"
        timestamp created_at
    }

    Match {
        uuid id PK
        string title
        timestamp scheduled_at "Nullable"
        enum status "DRAFT, BETTING_OPEN, LOCKED, SETTLED, CANCELLED"
        uuid winner_team_id "Nullable"
        timestamp settled_at "Nullable"
        text description "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    Team {
        uuid id PK
        uuid match_id FK
        string name
        uuid captain_id "Nullable - User.id"
        int placement "Nullable - 1~4 등수"
        timestamp created_at
        timestamp updated_at
    }

    TeamMember {
        uuid id PK
        uuid team_id FK
        uuid user_id "User.id"
        bigint bid_price "Nullable - 경매 낙찰가"
        timestamp created_at
        timestamp updated_at
    }

    BettingMarket {
        uuid id PK
        uuid match_id FK
        enum type "WIN, RANK"
        enum status "OPEN, LOCKED, SETTLED, CANCELLED"
        bigint total_pool "default 0"
        int rake_bps "default 500 (5%)"
        string winning_option "Nullable; teamId 또는 placement"
        timestamp locked_at "Nullable"
        timestamp settled_at "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    MarketOrder {
        uuid id PK
        uuid product_id FK
        uuid buyer_id FK "User.id"
        int quantity
        bigint unit_price
        bigint total_price
        enum status "COMPLETED, DELIVERED, CANCELLED"
        timestamp delivered_at "Nullable"
        timestamp cancelled_at "Nullable"
        text admin_note "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    SystemConfig {
        string key PK
        text value
        text description "Nullable"
        timestamp updated_at
    }

    ClanMember {
        uuid id PK
        uuid clanId FK
        uuid userId FK
        enum clanRole "MASTER, MANAGER, MEMBER"
        int totalPoints "실제 보유 포인트 (활동+내전)"
        int lockedPoints "베팅으로 잠긴 포인트"
        int scrimPoints "내전 포인트 (별도 랭킹용)"
        int penaltyCount "해당 클랜 내 페널티"
        timestamp created_at
        timestamp updated_at
    }

    PointLog {
        uuid id PK
        uuid userId FK
        uuid clanId FK "어떤 클랜의 포인트인가"
        int amount "변동액 (+/-)"
        string reason "지급/차감 사유"
        timestamp created_at
    }

    %% ==========================================
    %% Auction Domain
    %% ==========================================
    Auction {
        uuid id PK
        string title
        enum status "PENDING, ONGOING, PAUSED, ASSIGNING, COMPLETED, CANCELLED"
        enum biddingPhase "WAITING, BIDDING, SOLD"
        string accessCode "Nullable"
        uuid creatorId FK
        int startingPoints
        int turnTimeLimit "seconds (default: 60)"
        int maxParticipants "default: 20"
        int teamCount "default: 2"
        uuid currentBiddingPlayerId FK "Nullable - 현재 경매중인 선수"
        timestamp currentBiddingEndTime "Nullable"
        boolean timerPaused "default: false"
        int pausedTimeRemaining "Nullable - 정지시 남은 시간"
        uuid linkedScrimId FK "Nullable - 연결된 스크림"
        timestamp created_at
        timestamp updated_at
    }

    AuctionParticipant {
        uuid id PK
        uuid auctionId FK
        uuid userId FK
        enum role "CAPTAIN, PLAYER, SPECTATOR"
        int currentPoints "default: 0"
        uuid assignedTeamCaptainId FK "Nullable - 배정된 팀(캡틴ID)"
        int soldPrice "default: 0 - 낙찰가"
        boolean wasUnsold "default: false - 유찰 후 수동배정 여부"
        int biddingOrder "default: 0 - 경매 순서"
        timestamp created_at
    }

    AuctionBid {
        uuid id PK
        uuid auctionId FK
        uuid bidderId FK "Captain"
        uuid targetPlayerId FK "Player"
        int amount
        boolean isActive "default: true"
        timestamp created_at
    }

    %% ==========================================
    %% Post Domain (커뮤니티 게시판)
    %% ==========================================
    Post {
        uuid id PK
        uuid authorId FK "ClanMember"
        uuid clanId FK
        string title "Nullable (varchar 200) - 커뮤니티 게시판용"
        enum type "TEXT, IMAGE, CLIP, SCRIM_RESULT, ACHIEVEMENT, GAME_RESULT, BALANCE_GAME"
        text content "Nullable"
        jsonb media "이미지 URL 배열 (최대 4개)"
        jsonb metadata "type별 추가 데이터"
        int likeCount
        int commentCount
        int shareCount
        boolean isPinned
        enum visibility "PUBLIC, FOLLOWERS, PRIVATE"
        timestamp created_at
        timestamp updated_at
    }

    PostComment {
        uuid id PK
        uuid postId FK
        uuid authorId FK "ClanMember"
        text content
        uuid parentId FK "Nullable - 대댓글"
        int likeCount
        timestamp created_at
        timestamp updated_at
    }

    PostLike {
        uuid id PK
        uuid postId FK
        uuid memberId FK "ClanMember"
        timestamp created_at
    }

    %% ==========================================
    %% Scrim Result Domain (내전 결과)
    %% ==========================================
    ScrimResult {
        uuid id PK
        uuid auctionId FK "unique - 경매 1:1"
        enum status "DRAFT, CONFIRMED"
        timestamp confirmedAt "Nullable"
        uuid confirmedById "Nullable - 확정한 관리자"
        timestamp created_at
        timestamp updated_at
    }

    ScrimResultEntry {
        uuid id PK
        uuid scrimResultId FK
        uuid userId FK
        uuid teamCaptainId "어떤 팀의 캡틴 userId"
        int rank "1~4 팀 순위"
        int basePoints "관리자 입력 기본 포인트"
        int earnedActivityPoints "실제 활동 포인트 (캡틴 x2)"
        int earnedScrimPoints "실제 내전 포인트 (캡틴 x2)"
        boolean isCaptain
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% Scrim Domain (레거시 - 삭제됨 2026-04-10)
    %% Scrim, ScrimParticipant, ScrimMatch 테이블은 코드에서 제거됨
    %% DB 테이블은 남아있으나 더 이상 사용하지 않음
    %% ==========================================

    %% ==========================================
    %% Attendance & Point Rules
    %% ==========================================
    PointRule {
        uuid id PK
        uuid clanId FK
        string code "시스템 매칭용 (ATTENDANCE_BASE, STREAK_3 등)"
        string name "스크림 참가, VOD 리뷰 작성 등"
        string description "Nullable"
        enum category "ATTENDANCE, ACTIVITY, ACHIEVEMENT, PENALTY"
        int points "획득/차감 포인트"
        boolean isActive "default: true"
        timestamp created_at
        timestamp updated_at
    }

    AttendanceRecord {
        uuid id PK
        uuid memberId FK "ClanMember"
        uuid scrimId "Nullable - 레거시, 더 이상 FK 아님"
        enum status "PRESENT, LATE, ABSENT, EXCUSED"
        int pointsEarned
        int bonusPoints "연속 출석 보너스 등"
        string bonusReason "Nullable"
        timestamp checkedInAt "Nullable"
        timestamp created_at
    }

    %% ==========================================
    %% Achievement & Badge System
    %% ==========================================
    Achievement {
        uuid id PK
        uuid clanId FK "Nullable - null이면 글로벌"
        string code UK "FOUNDING_MEMBER, WIN_STREAK_10 등"
        string name "창립 멤버"
        string description "클랜 창립 시 가입한 멤버"
        string icon "이모지 or 아이콘 URL"
        enum category "ATTENDANCE, SCRIM, SOCIAL, SPECIAL"
        int points "업적 달성 시 보상 포인트"
        boolean isActive "default: true"
        timestamp created_at
    }

    MemberAchievement {
        uuid id PK
        uuid memberId FK "ClanMember"
        uuid achievementId FK
        timestamp earnedAt
        string note "Nullable - 5연승 달성!"
    }

    AchievementProgress {
        uuid id PK
        uuid memberId FK "ClanMember"
        uuid achievementId FK
        int currentValue "현재 진행률"
        int targetValue "목표값"
        timestamp lastUpdatedAt
    }

    %% ==========================================
    %% Mentoring System
    %% ==========================================
    Mentor {
        uuid id PK
        uuid memberId FK "ClanMember - 1인 1멘토"
        jsonb specialties "전문 영웅/역할"
        string introduction "멘토 소개글"
        int maxMentees "default: 3"
        enum availability "AVAILABLE, BUSY, UNAVAILABLE"
        string scheduleNote "Nullable - 주 3회 가능 등"
        float rating "평균 평점 (0~5)"
        int reviewCount "default: 0"
        boolean isActive "default: true"
        timestamp created_at
        timestamp updated_at
    }

    Mentorship {
        uuid id PK
        uuid mentorId FK
        uuid menteeId FK "ClanMember"
        enum status "REQUESTED, ACTIVE, COMPLETED, CANCELLED"
        string goal "아나 숙련도 향상"
        int totalSessions "default: 0"
        int completedSessions "default: 0"
        timestamp startedAt "Nullable"
        timestamp completedAt "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    MentorSession {
        uuid id PK
        uuid mentorshipId FK
        timestamp scheduledAt
        int durationMinutes
        enum status "SCHEDULED, COMPLETED, CANCELLED, NO_SHOW"
        string topic "VOD 리뷰, 듀오 코칭 등"
        text mentorNote "Nullable - 멘토 피드백"
        text menteeNote "Nullable - 멘티 메모"
        timestamp completedAt "Nullable"
        timestamp created_at
    }

    MentorReview {
        uuid id PK
        uuid mentorshipId FK
        uuid reviewerId FK "ClanMember (멘티)"
        int rating "1~5"
        text comment "Nullable"
        timestamp created_at
    }

    %% ==========================================
    %% Bingo Challenge System
    %% ==========================================
    BingoTemplate {
        uuid id PK
        uuid clanId FK
        string name "1월 4주차 빙고"
        jsonb cells "5x5 빙고 셀 배열"
        int bingoReward "1빙고당 보너스 포인트"
        boolean isActive "default: true"
        timestamp created_at
    }

    BingoInstance {
        uuid id PK
        uuid templateId FK
        timestamp startDate "주간 시작일"
        timestamp endDate "주간 종료일"
        enum status "ACTIVE, COMPLETED"
        timestamp created_at
    }

    MemberBingo {
        uuid id PK
        uuid instanceId FK
        uuid memberId FK "ClanMember"
        jsonb completedCells "완료한 셀 인덱스 배열"
        int bingoCount "달성한 빙고 줄 수"
        int totalPoints "획득 포인트"
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% Overwatch Profile Domain (OverFastAPI 연동)
    %% ==========================================
    OverwatchProfile {
        uuid id PK
        uuid userId FK "unique - User"
        string battleTag
        string platform "default: pc"
        string avatar "Nullable"
        string namecard "Nullable"
        string title "Nullable"
        int endorsementLevel "default: 0"
        string privacy "default: public"
        jsonb competitiveRank "Nullable - 경쟁전 랭크"
        jsonb statsSummary "Nullable - 플레이 통계 요약"
        jsonb topHeroes "Nullable - 가장 많이 플레이한 영웅"
        boolean autoSync "default: true"
        timestamp lastSyncedAt "Nullable"
        string lastSyncStatus "default: success"
        string lastSyncError "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    OverwatchStatsSnapshot {
        uuid id PK
        uuid profileId FK "OverwatchProfile"
        jsonb snapshot "전체 통계 스냅샷"
        timestamp snapshotDate
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% Blind Date Domain
    %% ==========================================
    BlindDateListing {
        uuid id PK
        uuid clanId FK
        uuid registerId FK
        enum status "OPEN, CLOSED"
        string name
        int age
        enum gender "MALE, FEMALE"
        string location
        string desiredLocation "Nullable - 원하는 상대 거주지역"
        int height "Nullable"
        string job
        string education "Nullable"
        text description
        text idealType "Nullable"
        string mbti "Nullable"
        boolean smoking "default: false"
        jsonb photos "Nullable"
        string contactInfo "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    %% BlindDateRequest, BlindDateMatch, BlindDatePreference 테이블은
    %% 코드에서 제거됨 (2026-04-10). DB 테이블은 남아있으나 사용하지 않음

    %% ==========================================
    %% Shop Domain
    %% ==========================================
    ShopProduct {
        uuid id PK
        uuid clanId FK
        string name
        string description "Nullable"
        int price
        int stock
        string imageUrl "Nullable"
        enum status "ACTIVE, INACTIVE, OUT_OF_STOCK"
        int totalSold
        timestamp created_at
        timestamp updated_at
    }

    ShopPurchase {
        uuid id PK
        uuid productId FK
        uuid userId FK
        uuid clanId FK
        int quantity
        int totalPrice
        enum status "PENDING, APPROVED, REJECTED, CANCELLED"
        text adminNote "Nullable"
        timestamp approvedAt "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% Betting System
    %% ==========================================
    BettingQuestion {
        uuid id PK
        uuid scrimId FK
        uuid creatorId FK
        string question
        enum status "OPEN, CLOSED, SETTLED"
        enum correctAnswer "O, X" "Nullable"
        timestamp bettingDeadline "Nullable"
        int minBetAmount
        float rewardMultiplier
        timestamp created_at
        timestamp updated_at
    }

    BettingTicket {
        uuid id PK
        uuid questionId FK
        uuid userId FK
        enum prediction "O, X"
        int betAmount
        enum status "PENDING, WON, LOST, CANCELLED"
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% Relationships
    %% ==========================================

    %% Clan Core
    Clan ||--o{ ClanMember : "has_members"
    Clan ||--o{ Auction : "hosts"
    Clan ||--o{ BlindDateListing : "contains"
    Clan ||--o{ ShopProduct : "sells"
    Clan ||--o{ PointRule : "defines"
    Clan ||--o{ Achievement : "has"
    Clan ||--o{ BingoTemplate : "creates"

    %% User Core
    User ||--o{ ClanMember : "belongs_to_clans"
    User ||--o{ Auction : "creates"
    User ||--o{ AuctionParticipant : "participates_in"
    User ||--o{ AuctionBid : "makes_bid"
    User ||--o{ AuctionBid : "is_target_of"
    User ||--o{ BlindDateListing : "registers"
    User ||--o{ ShopPurchase : "makes_purchase"
    User ||--o{ BettingQuestion : "creates_questions"
    User ||--o{ BettingTicket : "places_bets"
    User ||--o{ PointLog : "has_history"
    User ||--o| OverwatchProfile : "has_ow_profile"

    %% Auction
    Auction ||--|{ AuctionParticipant : "has"
    Auction ||--o{ AuctionBid : "records"
    Auction ||--o| ScrimResult : "has_result"

    %% Scrim Result
    ScrimResult ||--o{ ScrimResultEntry : "contains"
    User ||--o{ ScrimResultEntry : "participated_in"

    %% Posts
    ClanMember ||--o{ Post : "writes"
    Post ||--o{ PostComment : "has_comments"
    Post ||--o{ PostLike : "has_likes"
    ClanMember ||--o{ PostComment : "writes_comments"
    ClanMember ||--o{ PostLike : "likes"

    %% Attendance & Points
    ClanMember ||--o{ AttendanceRecord : "has"

    %% Achievement
    ClanMember ||--o{ MemberAchievement : "earns"
    Achievement ||--o{ MemberAchievement : "awarded_to"
    ClanMember ||--o{ AchievementProgress : "tracks"
    Achievement ||--o{ AchievementProgress : "tracked_by"

    %% Mentoring
    ClanMember ||--o| Mentor : "can_be"
    Mentor ||--o{ Mentorship : "mentors"
    ClanMember ||--o{ Mentorship : "mentee_in"
    Mentorship ||--o{ MentorSession : "has"
    Mentorship ||--o| MentorReview : "reviewed_by"

    %% Bingo
    BingoTemplate ||--o{ BingoInstance : "instantiated_as"
    BingoInstance ||--o{ MemberBingo : "participated_by"
    ClanMember ||--o{ MemberBingo : "plays"

    %% Betting
    BettingQuestion ||--o{ BettingTicket : "has_bets"

    %% Blind Date (simplified - no more Request/Match/Preference)
    %% BlindDateListing is now standalone CRUD

    %% Shop
    ShopProduct ||--o{ ShopPurchase : "has_purchases"

    %% Overwatch
    OverwatchProfile ||--o{ OverwatchStatsSnapshot : "tracks_history"

```
