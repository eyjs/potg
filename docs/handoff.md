# POTG 경매 시스템 - 핸드오프 문서

마지막 업데이트: 2026-01-22

## 1. 완료된 작업

### Backend (WebSocket 기반 실시간 경매)

#### 새로운 파일
- `backend/src/modules/auctions/auction.gateway.ts` - WebSocket Gateway

#### 수정된 파일
- `backend/src/modules/auctions/auctions.service.ts` - 경매 비즈니스 로직 확장
- `backend/src/modules/auctions/auctions.module.ts` - Gateway 및 Scrim 의존성 추가
- `backend/src/modules/auctions/entities/auction.entity.ts` - 새 필드 추가
- `backend/src/modules/auctions/entities/auction-participant.entity.ts` - 팀 배정 필드 추가
- `backend/src/modules/auctions/entities/auction-bid.entity.ts` - isActive 필드 추가

#### 구현된 기능

**경매 상태 관리**
- `AuctionStatus`: PENDING → ONGOING → PAUSED → ASSIGNING → COMPLETED
- `BiddingPhase`: WAITING → BIDDING → SOLD

**마스터 컨트롤**
- `startAuction` - 경매 시작
- `pauseAuction` / `resumeAuction` - 경매 일시정지/재개
- `pauseTimer` / `resumeTimer` - 타이머 일시정지/재개
- `confirmBid` - 낙찰 확정
- `passPlayer` - 유찰 처리
- `nextPlayer` - 다음 선수로 진행
- `undoSoldPlayer` - 낙찰 취소 (Undo)
- `enterAssignmentPhase` - 수동 배정 단계 진입
- `manualAssignPlayer` - 유찰 선수 수동 배정
- `createScrimFromAuction` - 스크림 자동 생성

**WebSocket 이벤트**
- 입장/퇴장: `joinRoom`, `leaveRoom`
- 입찰: `placeBid`, `bidPlaced`
- 경매 흐름: `auctionStarted`, `auctionPaused`, `auctionResumed`, `auctionCompleted`
- 입찰 결과: `bidConfirmed`, `playerPassed`, `playerUndone`
- 타이머: `timerUpdate`, `timerPaused`, `timerResumed`
- 배정: `assignmentPhaseStarted`, `playerManuallyAssigned`
- 스크림: `scrimCreated`
- 채팅: `chatMessage`

### Frontend

#### 새로운 파일
- `frontend/src/modules/auction/hooks/use-auction-socket.ts` - WebSocket 훅
- `frontend/src/modules/auction/components/master-control-panel.tsx` - 마스터 컨트롤 UI
- `frontend/src/modules/auction/components/auction-team-panel.tsx` - 팀 현황 패널
- `frontend/src/modules/auction/components/auction-results-poster.tsx` - 결과 포스터

#### 수정된 파일
- `frontend/src/app/auction/[id]/page.tsx` - 새 컴포넌트 통합

#### 삭제된 파일 (불필요 old 컴포넌트)
- `admin-controls.tsx`
- `auction-stage.tsx`
- `player-pool.tsx`
- `chat-panel.tsx`
- `scrim/components/team-panel.tsx`

---

## 2. 다음 단계 (TODO)

### 즉시 해야할 것

1. **Backend 배포 후 테스트**
   - WebSocket 연결 테스트
   - 경매 전체 플로우 E2E 테스트
   - 타이머 동기화 확인

2. **모바일 UI 재설계**
   - 현재: 기본적인 반응형만 적용됨
   - 필요: 스티키 타이머 + 플로팅 입찰 버튼 개선

3. **경매 생성 화면 업데이트**
   - 매물 등록 UI
   - 팀 생성 UI
   - 팀장 배정 UI

### 선택적 개선사항

- 드래그 앤 드롭으로 유찰 선수 배정 (현재는 클릭 방식)
- 경매 결과 포스터 이미지로 저장/공유 기능
- 경매 히스토리/리플레이 기능

---

## 3. 주의사항

### Entity 변경됨 (마이그레이션 필요!)

다음 필드들이 Entity에 추가되었습니다. 배포 전 DB 마이그레이션이 필요합니다:

**Auction Entity**
```typescript
@Column({ type: 'enum', enum: BiddingPhase, default: BiddingPhase.WAITING })
biddingPhase: BiddingPhase;

@Column({ default: false })
timerPaused: boolean;

@Column({ nullable: true })
pausedTimeRemaining: number | null;

@Column({ nullable: true })
linkedScrimId: string;
```

**AuctionParticipant Entity**
```typescript
@Column({ nullable: true })
assignedTeamCaptainId: string | null;

@Column({ default: 0 })
soldPrice: number;

@Column({ default: false })
wasUnsold: boolean;

@Column({ default: 0 })
biddingOrder: number;
```

**AuctionBid Entity**
```typescript
@Column({ default: true })
isActive: boolean;
```

### 환경변수

Frontend에서 WebSocket 연결 시 `NEXT_PUBLIC_API_URL` 환경변수 사용:
```typescript
const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100"
```

### 타입 주의

nullable 필드들은 TypeScript에서 `| null` 타입 사용:
- `currentBiddingPlayerId: string | null`
- `currentBiddingEndTime: Date | null`
- `pausedTimeRemaining: number | null`
- `assignedTeamCaptainId: string | null`

---

## 4. 파일 위치 요약

```
backend/src/modules/auctions/
├── auction.gateway.ts          # WebSocket Gateway (NEW)
├── auctions.service.ts         # 비즈니스 로직 (UPDATED)
├── auctions.module.ts          # 모듈 설정 (UPDATED)
└── entities/
    ├── auction.entity.ts       # 경매 엔티티 (UPDATED)
    ├── auction-participant.entity.ts  # 참가자 엔티티 (UPDATED)
    └── auction-bid.entity.ts   # 입찰 엔티티 (UPDATED)

frontend/src/modules/auction/
├── hooks/
│   └── use-auction-socket.ts   # WebSocket 훅 (NEW)
└── components/
    ├── master-control-panel.tsx     # 마스터 컨트롤 (NEW)
    ├── auction-team-panel.tsx       # 팀 패널 (NEW)
    ├── auction-results-poster.tsx   # 결과 포스터 (NEW)
    ├── auction-banner.tsx           # 기존
    ├── auction-room-card.tsx        # 기존
    └── create-auction-modal.tsx     # 기존

frontend/src/app/auction/[id]/
└── page.tsx                    # 메인 경매 페이지 (UPDATED)
```

---

## 5. 경매 플로우 다이어그램

```
[PENDING] 대기
    ↓ startAuction
[ONGOING] 진행중
    ├── selectPlayer → [BIDDING] 입찰 진행
    │   ├── placeBid → 입찰
    │   ├── confirmBid → [SOLD] 낙찰
    │   │   └── nextPlayer → [WAITING] 다음 선수 대기
    │   └── passPlayer → [WAITING] 유찰 → unsoldPlayers에 추가
    │
    ├── pauseAuction → [PAUSED] 일시정지
    │   └── resumeAuction → [ONGOING] 재개
    │
    ├── undoSoldPlayer → 낙찰 취소 → 선수 원복
    │
    └── enterAssignmentPhase → [ASSIGNING] 수동배정
        ├── manualAssignPlayer → 유찰 선수 배정
        └── completeAuction → [COMPLETED] 완료
            └── createScrim → 스크림 생성
```
