# POTG Project ERD

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
        enum role "USER, ADMIN"
        enum mainRole "TANK, DPS, SUPPORT, FLEX"
        int rating
        string avatarUrl
        boolean bettingFloatingEnabled "베팅 플로팅 버튼 사용 여부 (기본값: false)"
        timestamp created_at
        timestamp updated_at
    }

    ClanMember {
        uuid id PK
        uuid clanId FK
        uuid userId FK
        enum clanRole "MASTER, MANAGER, MEMBER"
        int totalPoints "실제 보유 포인트"
        int lockedPoints "베팅으로 잠긴 포인트"
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
    %% Scrim Domain (확장)
    %% ==========================================
    Scrim {
        uuid id PK
        uuid clanId FK "Nullable"
        uuid auctionId FK "Nullable"
        string title
        enum status "DRAFT, SCHEDULED, IN_PROGRESS, FINISHED, CANCELLED"
        enum recruitmentType "AUCTION, MANUAL, OPEN"
        uuid hostId FK
        timestamp scheduledDate "Nullable"
        timestamp signupDeadline "Nullable - 참가 신청 마감시간"
        timestamp checkInStart "Nullable - 체크인 시작 시간"
        int minPlayers "default: 6"
        int maxPlayers "default: 12"
        jsonb roleSlots "Nullable - 역할별 슬롯 {tank, dps, support}"
        text description "Nullable"
        jsonb teamSnapshot "Nullable"
        int teamAScore "default: 0"
        int teamBScore "default: 0"
        timestamp created_at
        timestamp updated_at
    }

    ScrimParticipant {
        uuid id PK
        uuid scrimId FK
        uuid userId FK
        enum source "AUCTION, MANUAL, SIGNUP"
        enum status "PENDING, CONFIRMED, BENCH, DECLINED, REMOVED"
        enum assignedTeam "TEAM_A, TEAM_B, BENCH, UNASSIGNED"
        jsonb preferredRoles "Nullable - 선호 역할"
        enum assignedRole "TANK, DPS, SUPPORT - Nullable"
        text note "Nullable - 참가 메모"
        boolean checkedIn "default: false"
        timestamp checkedInAt "Nullable"
        timestamp respondedAt "Nullable"
        timestamp created_at
        timestamp updated_at
    }

    ScrimMatch {
        uuid id PK
        uuid scrimId FK
        string mapName
        int teamAScore
        int teamBScore
        string screenshotUrl "Nullable"
        timestamp created_at
    }

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
        uuid scrimId FK
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
        enum status "PRIVATE, OPEN, MATCHED, CLOSED"
        string name
        int age
        enum gender "MALE, FEMALE"
        string location
        int height "Nullable"
        string job
        string education "Nullable"
        text description
        text idealType
        jsonb photos
        string contactInfo "Nullable"
        uuid matchedRequestId FK "Nullable"
        int pointsEarned
        timestamp created_at
        timestamp updated_at
    }

    BlindDateRequest {
        uuid id PK
        uuid listingId FK
        uuid requesterId FK
        uuid clanId FK
        enum status "PENDING, APPROVED, REJECTED, CANCELLED"
        text message "Nullable"
        jsonb requesterInfo
        timestamp created_at
        timestamp updated_at
    }

    BlindDateMatch {
        uuid id PK
        uuid listingId FK
        uuid requestId FK
        uuid clanId FK
        uuid registerId FK
        uuid requesterId FK
        int pointsAwarded
        timestamp created_at
    }

    BlindDatePreference {
        uuid id PK
        uuid listingId FK "Unique"
        int minAge "Nullable"
        int maxAge "Nullable"
        enum preferredGender "MALE, FEMALE - Nullable"
        jsonb preferredLocations "Nullable"
        jsonb preferredJobs "Nullable"
        enum minEducation "HIGH_SCHOOL, COLLEGE, BACHELOR, MASTER, DOCTORATE - Nullable"
        int minHeight "Nullable"
        int maxHeight "Nullable"
        timestamp created_at
        timestamp updated_at
    }

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
    Clan ||--o{ Scrim : "organizes"
    Clan ||--o{ BlindDateListing : "contains"
    Clan ||--o{ ShopProduct : "sells"
    Clan ||--o{ PointRule : "defines"
    Clan ||--o{ Achievement : "has"
    Clan ||--o{ BingoTemplate : "creates"

    %% User Core
    User ||--o{ ClanMember : "belongs_to_clans"
    User ||--o{ Auction : "creates"
    User ||--o{ Scrim : "hosts"
    User ||--o{ AuctionParticipant : "participates_in"
    User ||--o{ AuctionBid : "makes_bid"
    User ||--o{ AuctionBid : "is_target_of"
    User ||--o{ ScrimParticipant : "joins_scrim_as"
    User ||--o{ BlindDateListing : "registers"
    User ||--o{ BlindDateRequest : "makes_request"
    User ||--o{ ShopPurchase : "makes_purchase"
    User ||--o{ BettingQuestion : "creates_questions"
    User ||--o{ BettingTicket : "places_bets"
    User ||--o{ PointLog : "has_history"
    User ||--o| OverwatchProfile : "has_ow_profile"

    %% Auction
    Auction ||--|{ AuctionParticipant : "has"
    Auction ||--o{ AuctionBid : "records"

    %% Scrim
    Scrim ||--o{ ScrimMatch : "consists_of"
    Scrim ||--o{ ScrimParticipant : "has_participants"
    Scrim ||--o{ BettingQuestion : "has_questions"
    Scrim ||--o{ AttendanceRecord : "records"

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

    %% Blind Date
    BlindDateListing ||--o{ BlindDateRequest : "receives_requests"
    BlindDateListing ||--o| BlindDateMatch : "results_in"
    BlindDateListing ||--o| BlindDatePreference : "has_preference"
    BlindDateRequest ||--o| BlindDateMatch : "results_in"

    %% Shop
    ShopProduct ||--o{ ShopPurchase : "has_purchases"

    %% Overwatch
    OverwatchProfile ||--o{ OverwatchStatsSnapshot : "tracks_history"

```
