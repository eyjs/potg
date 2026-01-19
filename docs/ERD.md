# POTG Project ERD

## Real-time Entity Relationship Diagram

```mermaid
erDiagram
    %% Clan Domain
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
        enum clanRole "MANAGER, MEMBER"
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

    %% Auction Domain
    Auction {
        uuid id PK
        string title
        enum status "PENDING, ONGOING, COMPLETED, CANCELLED"
        string accessCode "Nullable"
        uuid creatorId FK
        int startingPoints
        int turnTimeLimit
        timestamp created_at
        timestamp updated_at
    }

    AuctionParticipant {
        uuid id PK
        uuid auctionId FK
        uuid userId FK
        enum role "CAPTAIN, PLAYER, SPECTATOR"
        int currentPoints
        timestamp created_at
    }

    AuctionBid {
        uuid id PK
        uuid auctionId FK
        uuid bidderId FK "Captain"
        uuid targetPlayerId FK "Player"
        int amount
        timestamp created_at
    }

    %% Scrim Domain
    Scrim {
        uuid id PK
        uuid voteId FK "Nullable"
        uuid auctionId FK "Nullable"
        string title
        enum status "DRAFT, SCHEDULED, IN_PROGRESS, FINISHED, CANCELLED"
        enum recruitmentType "VOTE, AUCTION, MANUAL"
        uuid hostId FK
        timestamp scheduledDate "Nullable"
        jsonb teamSnapshot "Nullable"
        int teamAScore
        int teamBScore
        timestamp created_at
        timestamp updated_at
    }

    ScrimParticipant {
        uuid id PK
        uuid scrimId FK
        uuid userId FK
        enum source "VOTE, AUCTION, MANUAL"
        enum status "PENDING, CONFIRMED, BENCH, DECLINED, REMOVED"
        enum assignedTeam "TEAM_A, TEAM_B, BENCH, UNASSIGNED"
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

    %% Vote Domain
    Vote {
        uuid id PK
        uuid clanId FK
        uuid creatorId FK
        string title
        timestamp deadline
        enum status "OPEN, CLOSED"
        enum scrimType "NORMAL, AUCTION"
        timestamp created_at
        timestamp updated_at
    }

    VoteOption {
        uuid id PK
        uuid voteId FK
        string label
        int count
    }

    VoteRecord {
        uuid id PK
        uuid voteId FK
        uuid userId FK
        uuid optionId FK
        timestamp created_at
    }

    %% Blind Date Domain
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

    %% Shop Domain
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

    %% Betting System
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

    %% Relationships

    %% Clan Relationships
    Clan ||--o{ ClanMember : "has_members"
    Clan ||--o{ Auction : "hosts"
    Clan ||--o{ Scrim : "organizes"
    Clan ||--o{ Vote : "conducts"
    Clan ||--o{ BlindDateListing : "contains"
    Clan ||--o{ ShopProduct : "sells"

    %% User Relationships
    User ||--o{ ClanMember : "belongs_to_clans"
    User ||--o{ Auction : "creates"
    User ||--o{ Scrim : "hosts"
    User ||--o{ AuctionParticipant : "participates_in"
    User ||--o{ AuctionBid : "makes_bid (as Captain)"
    User ||--o{ AuctionBid : "is_target_of (as Player)"
    User ||--o{ Vote : "creates"
    User ||--o{ VoteRecord : "casts_vote"
    User ||--o{ ScrimParticipant : "joins_scrim_as"
    User ||--o{ BlindDateListing : "registers"
    User ||--o{ BlindDateRequest : "makes_request"
    User ||--o{ ShopPurchase : "makes_purchase"
    User ||--o{ BettingQuestion : "creates_questions"
    User ||--o{ BettingTicket : "places_bets"
    User ||--o{ PointLog : "has_history"

    %% Auction Relationships
    Auction ||--|{ AuctionParticipant : "has"
    Auction ||--o{ AuctionBid : "records"

    %% Scrim Relationships
    Scrim ||--o{ ScrimMatch : "consists_of"
    Scrim ||--o{ ScrimParticipant : "has_participants"
    Scrim ||--o{ BettingQuestion : "has_questions"

    %% Vote Relationships
    Vote ||--|{ VoteOption : "has_options"
    Vote ||--o{ VoteRecord : "tracks_votes"
    Vote ||--o| Scrim : "may_result_in"

    %% Betting Relationships
    BettingQuestion ||--o{ BettingTicket : "has_bets"

    %% Blind Date Relationships
    BlindDateListing ||--o{ BlindDateRequest : "receives_requests"
    BlindDateListing ||--o| BlindDateMatch : "results_in"
    BlindDateRequest ||--o| BlindDateMatch : "results_in"

    %% Shop Relationships
    ShopProduct ||--o{ ShopPurchase : "has_purchases"

```