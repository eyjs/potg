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
        uuid clanId FK "Nullable"
        string battleTag UK
        string password "Nullable"
        enum systemRole "OWNER, ADMIN, MEMBER, GUEST"
        enum mainRole "TANK, DPS, SUPPORT, FLEX"
        int rating
        string avatarUrl
        int auctionPoints
        int penaltyCount
        boolean bettingFloatingEnabled "베팅 플로팅 버튼 사용 여부 (기본값: false)"
        timestamp created_at
        timestamp updated_at
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
    Clan ||--o{ User : "has_members"

    %% User Relationships
    User }o--|| Clan : "belongs_to"
    User ||--o{ Auction : "creates"
    User ||--o{ Scrim : "hosts"
    User ||--o{ AuctionParticipant : "participates_in"
    User ||--o{ AuctionBid : "makes_bid (as Captain)"
    User ||--o{ AuctionBid : "is_target_of (as Player)"
    User ||--o{ Vote : "creates"
    User ||--o{ VoteRecord : "casts_vote"
    User ||--o{ ScrimParticipant : "joins_scrim_as"
    User ||--o{ BettingQuestion : "creates_questions"
    User ||--o{ BettingTicket : "places_bets"

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

```