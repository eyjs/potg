# 경매 시스템 프로세스 (Auction Process Flow)

이 문서는 경매 생성부터 종료까지 **운영자(Host)**와 **팀장(Captain)**의 상호작용 흐름을 정의합니다.

## 1. 전체 흐름도 (Sequence Flow)

```mermaid
sequenceDiagram
    participant Host as 운영자 (Host)
    participant System as POTG 시스템
    participant Captain as 팀장 (Captain)

    %% 1. 경매 생성 단계
    rect rgb(230, 240, 255)
    Note over Host, Captain: [Phase 1] 경매 생성 및 준비
    Host->>System: 경매 방 생성 (Title, Points, TimeLimit)
    System-->>Host: 대기방 생성 완료 (Status: PENDING)
    Captain->>System: 경매방 입장 (Access Code)
    System-->>Captain: 대기실 UI 표시
    Host->>System: 참가자 확인 후 "경매 시작" 클릭
    System->>System: Status: ONGOING 변경, 첫 턴/매물 설정
    end

    %% 2. 실시간 경매 진행
    rect rgb(255, 245, 230)
    Note over Host, Captain: [Phase 2] 실시간 입찰 경쟁 (Loop)
    
    loop 모든 선수가 낙찰될 때까지
        System->>All: [New Round] 경매 대상(Target) 표시 & 턴 시작
        
        opt 내 턴일 경우
            Captain->>System: 입찰 (Bid Amount)
            System->>System: 유효성 검사 (잔여 포인트 확인)
            System-->>All: [Update] 최고 입찰가 갱신 (Broadcast)
        end

        alt 시간 초과 or 패스(Pass)
            System->>System: 낙찰 처리 (Highest Bidder 확정)
            System->>System: 포인트 차감 & 팀 배정 (AuctionParticipant 업데이트)
            System-->>All: [Result] 낙찰 결과 알림 (XX팀 -> OO선수 영입)
        else 유찰 (No Bid)
            System->>System: 유찰 처리 (다음 라운드로 보류)
        end
        
        System->>System: 다음 매물 및 턴 계산 (Next State)
    end
    end

    %% 3. 경매 종료
    rect rgb(230, 255, 230)
    Note over Host, Captain: [Phase 3] 최종 결과 및 내전 준비
    System->>System: Status: COMPLETED 변경
    System-->>All: 최종 팀 로스터 & 잔여 포인트 리포트 표시
    Host->>System: "내전 생성(Create Scrim)" 클릭
    System->>System: Scrim 데이터 생성 (Team Snapshot 복사)
    System-->>All: 내전 매치 페이지로 이동
    end
```

## 2. 상태 전이 다이어그램 (State Transition)

경매 방(`Auction`)의 상태 변화는 다음과 같습니다.

### 2.1 경매 상태 (AuctionStatus)

```mermaid
stateDiagram-v2
    [*] --> PENDING: 경매 생성
    PENDING --> ONGOING: 시작 버튼 클릭

    ONGOING --> PAUSED: 일시정지
    PAUSED --> ONGOING: 재개

    ONGOING --> ASSIGNING: 모든 선수 경매 완료 (유찰 선수 있음)
    ONGOING --> COMPLETED: 모든 선수 경매 완료 (유찰 없음)

    ASSIGNING --> COMPLETED: 수동 배정 완료

    ONGOING --> CANCELLED: 운영자 강제 종료
    PAUSED --> CANCELLED: 운영자 강제 종료

    COMPLETED --> [*]
    CANCELLED --> [*]
```

### 2.2 입찰 단계 (BiddingPhase)

ONGOING 상태 내에서의 입찰 단계 전이:

```mermaid
stateDiagram-v2
    [*] --> WAITING: 경매 시작 / 다음 선수

    WAITING --> BIDDING: 운영자가 선수 선택 (selectPlayer)

    BIDDING --> SOLD: 낙찰 확정 (confirmBid) or 타이머 종료
    BIDDING --> WAITING: 유찰 처리 (passPlayer) or 입찰없이 타이머 종료

    SOLD --> WAITING: 다음 선수 진행 (nextPlayer)

    note right of BIDDING
        - 타이머 정지/재개 가능 (timerPaused)
        - 경매 일시정지 가능 (PAUSED 상태로)
    end note
```

## 3. WebSocket 이벤트 흐름

### 3.1 클라이언트 → 서버 (Emit)

| 이벤트 | 설명 | 권한 |
|--------|------|------|
| `joinRoom` | 경매방 입장 | 모든 참가자 |
| `startAuction` | 경매 시작 | Admin |
| `selectPlayer` | 선수 선택 (경매 대상) | Admin |
| `placeBid` | 입찰 | Captain |
| `confirmBid` | 낙찰 확정 | Admin |
| `passPlayer` | 유찰 처리 | Admin |
| `nextPlayer` | 다음 선수로 진행 | Admin |
| `pauseAuction` | 경매 일시정지 | Admin |
| `resumeAuction` | 경매 재개 | Admin |
| `pauseTimer` | 타이머 정지 | Admin |
| `resumeTimer` | 타이머 재개 | Admin |
| `undoSoldPlayer` | 낙찰 취소 | Admin |
| `enterAssignmentPhase` | 수동 배정 단계 진입 | Admin |
| `manualAssignPlayer` | 유찰 선수 수동 배정 | Admin |
| `completeAuction` | 경매 종료 | Admin |
| `createScrim` | 스크림 생성 | Admin |

### 3.2 서버 → 클라이언트 (Broadcast)

| 이벤트 | 설명 |
|--------|------|
| `roomState` | 전체 방 상태 동기화 |
| `timerUpdate` | 타이머 업데이트 (매초) |
| `bidPlaced` | 새 입찰 발생 |
| `bidConfirmed` | 낙찰 확정 |
| `playerPassed` | 유찰 처리됨 |
| `playerUndone` | 낙찰 취소됨 |
| `assignmentPhaseStarted` | 수동 배정 단계 시작 |
| `playerManuallyAssigned` | 선수 수동 배정됨 |
| `auctionCompleted` | 경매 종료 |
| `scrimCreated` | 스크림 생성됨 |
| `error` | 에러 발생 |
