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

```mermaid
stateDiagram-v2
    [*] --> PENDING: 경매 생성
    PENDING --> ONGOING: 시작 버튼 클릭
    
    state ONGOING {
        [*] --> WAITING_BID: 매물 등장
        WAITING_BID --> BIDDING: 입찰 진행 중
        BIDDING --> WAITING_BID: 상위 입찰 발생
        BIDDING --> SOLD: 낙찰 (Timer End)
        SOLD --> WAITING_BID: 다음 매물 로드
    }

    ONGOING --> COMPLETED: 모든 매물 소진
    ONGOING --> CANCELLED: 운영자 강제 종료
    COMPLETED --> [*]
```
