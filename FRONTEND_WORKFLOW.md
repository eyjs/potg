# POTG Frontend Implementation Workflow

이 문서는 현재 백엔드 구현 상태(REST API 95% 완성, WebSocket 미구현)에 맞춰 프론트엔드 작업을 체계적으로 진행하기 위한 가이드입니다. 모든 프론트엔드 작업은 이 프로세스를 따릅니다.

---

## 1. Phase 1: Foundation & Authentication (기반 구축)

가장 먼저 API 통신과 인증 기반을 마련하여 Mock 데이터를 제거할 준비를 합니다.

### 1.1 API Client Setup
-   **File**: `frontend/lib/api.ts`
-   **Tech**: `axios`
-   **Tasks**:
    -   `axios` 인스턴스 생성 (Base URL: 환경변수 처리)
    -   **Interceptors**: 요청 시 `localStorage`의 JWT 토큰 자동 주입.
    -   **Response Handler**: 401 Unauthorized 발생 시 로그아웃 처리 로직.

### 1.2 Authentication System
-   **File**: `frontend/context/auth-context.tsx` (신규 생성 필요)
-   **Tasks**:
    -   `AuthProvider` 구현: 로그인(`login`), 로그아웃(`logout`), 유저정보(`user`) 상태 관리.
    -   **JWT Decoding**: 토큰에서 `role` (ADMIN, USER) 및 `id` 추출.
    -   **Protection**: `useAuth` 훅을 통해 페이지별 접근 권한 제어 (기존 `isAdmin` 하드코딩 대체).

### 1.3 React Query Integration
-   **Library**: `@tanstack/react-query`
-   **Tasks**:
    -   `layout.tsx`에 `QueryClientProvider` 설정.
    -   데이터 캐싱 및 백그라운드 업데이트 전략 수립.

---

## 2. Phase 2: Core Feature Integration (핵심 기능 연동)

Mock 데이터를 실제 백엔드 API로 교체합니다.

### 2.1 Lobby (Dashboard) - `/`
-   **API Mapping**:
    -   투표 현황: `GET /votes`
    -   경매 배너: `GET /auctions?status=OPEN`
    -   패널티: `GET /users/penalties` (또는 유사 엔드포인트 신설 필요)
-   **Strategy**: `Promise.all`로 병렬 요청 처리 (Dashboard API 부재 대안).

### 2.2 Auction List - `/auction`
-   **API Mapping**:
    -   목록 조회: `GET /auctions`
    -   생성: `POST /auctions` (Admin Only)
-   **Tasks**:
    -   `AuctionRoomCard`의 Props를 백엔드 `Auction` 엔티티 구조로 매핑.

### 2.3 Shop (New Feature) - `/shop` (신규)
-   **Current Status**: 백엔드 모듈 존재, 프론트엔드 페이지 없음.
-   **Tasks**:
    -   `frontend/app/shop/page.tsx` 생성.
    -   상품 목록: `GET /shop/products`
    -   구매 모달: `POST /shop/products/:id/purchase`
    -   UI: `HeroCard` 스타일을 재사용하여 상품 카드 디자인.

---

## 3. Phase 3: Real-Time Infrastructure (실시간 기능)

**가장 중요한 단계입니다.** 백엔드 WebSocket 지원이 선행되어야 합니다.

### 3.1 Backend: WebSocket Gateway Implementation
-   **Priority**: **Critical (P0)**
-   **File**: `backend/src/modules/auctions/auctions.gateway.ts` (신규)
-   **Tasks**:
    -   `Socket.io` 기반 Gateway 구축.
    -   Events: `joinRoom`, `leaveRoom`, `placeBid`, `timerUpdate`, `chatMessage`.
    -   Auth: Socket Handshake 시 JWT 검증 Guard 적용.

### 3.2 Frontend: Socket Client
-   **File**: `frontend/lib/socket.ts`
-   **Tasks**:
    -   `socket.io-client` 설정.
    -   Auction Room 진입 시 연결, 이탈 시 해제 로직 (`useEffect`).

### 3.3 Auction Room Integration - `/auction/[id]`
-   **Integration**:
    -   **Bidding**: REST API(`POST /bid`) 대신 Socket 이벤트(`emit('placeBid')`) 사용 고려 (또는 REST 성공 후 Socket 브로드캐스트).
    -   **Timer**: 서버 사이드 타이머(`setInterval` in Backend)와 동기화.
    -   **Chat**: Socket Room 기반 채팅 구현.

---

## 4. Phase 4: Type Synchronization (타입 동기화)

프론트엔드 인터페이스를 백엔드 DTO와 일치시킵니다.

### 4.1 Type Definitions
-   **File**: `frontend/types/api.d.ts` (신규)
-   **Tasks**:
    -   백엔드 `*.entity.ts` 및 `*.dto.ts`를 참조하여 TypeScript 인터페이스 정의.
    -   주요 타입: `User`, `Auction`, `Bid`, `Vote`, `ShopProduct`.
-   **Migration**: 기존 컴포넌트(`VoteCard`, `HeroCard`)의 로컬 인터페이스를 `api.d.ts`의 타입으로 교체.

---

## 5. Implementation Checklist (Updated)

| 단계 | 작업 항목 | 우선순위 | 상태 | Backend 준비 |
|:---:|:---|:---:|:---:|:---:|
| **1** | `axios` 설정 및 `api.ts` 생성 | P0 | ⬜ | ✅ Ready |
| **1** | `AuthContext` 및 로그인 연동 | P0 | ⬜ | ✅ Ready |
| **2** | 로비(Dashboard) API 연동 | P1 | ⬜ | ✅ Ready |
| **3** | **백엔드 Auction Gateway 구현** | **P0** | ⬜ | ❌ **Not Started** |
| **3** | 프론트엔드 Socket 연결 및 경매방 연동 | P0 | ⬜ | ❌ Blocked |
| **2** | 상점(Shop) 페이지 구현 - 기본 UI | P2 | ⬜ | ⚠️ Partial (승인 프로세스 누락) |
| **2** | 상점(Shop) 쿠폰 시스템 연동 | P1 | ⬜ | ❌ **Backend 미구현** |
| **4** | 타입 정의 파일(`api.d.ts`) 생성 및 적용 | P1 | ⬜ | ✅ Ready |
| **NEW** | 베팅 시스템 UI 구현 | P1 | ⬜ | ⚠️ Partial (Math.ceil 수정 필요) |
| **NEW** | 내전 팀 배정 드래그앤드롭 UI | P2 | ⬜ | ⚠️ Partial (API 누락) |
| **NEW** | 소개팅 추천 시스템 UI | P3 | ⬜ | ❌ **Backend 미구현** |

---

## 6. Backend Blocker Issues (백엔드 대기 이슈)

다음 기능들은 **백엔드 구현 완료 후** 진행 가능합니다. SYNC_ANALYSIS.md 참조.

### 🔴 Critical Blockers (즉시 해결 필요)
1. **경매 실시간 입찰** - WebSocket Gateway 미구현
   - **영향:** 경매 시스템의 핵심 기능 불가능
   - **대안:** 임시로 Polling (5초마다 GET /auctions/:id) 사용 가능
   - **상태:** Backend P0

2. **상점 쿠폰 발급** - ShopCoupon 할당 로직 없음
   - **영향:** 기프티콘 판매 불가
   - **대안:** Mock 쿠폰 번호 표시 ("승인 후 표시됨")
   - **상태:** Backend P0

3. **소개팅 매칭 보상** - 포인트 지급 로직 없음
   - **영향:** 등록자에게 포인트 지급 안 됨
   - **대안:** UI만 구현, 실제 포인트는 수동 지급
   - **상태:** Backend P0

### 🟡 High Priority (다음 스프린트)
1. **상점 구매 승인 플로우** - 현재 자동 승인만 됨
   - **영향:** 클랜마스터의 재고 관리 불가
   - **현재:** 구매 즉시 승인 (status: APPROVED)
   - **필요:** PENDING → 클랜마스터 승인 → APPROVED
   - **상태:** Backend P1

2. **내전 팀 스냅샷** - teamSnapshot 저장 안 됨
   - **영향:** 과거 내전 기록 조회 시 당시 팀 구성 확인 불가
   - **대안:** 현재 유저 정보 기반으로 표시 (부정확)
   - **상태:** Backend P0

3. **베팅 정산 정확도** - Math.ceil 미적용
   - **영향:** 소수점 발생 시 사용자 손해
   - **예시:** 333 × 1.5 = 499.5 → 499 지급 (500이어야 함)
   - **대안:** 프론트엔드에서 Math.ceil로 예상 보상 표시
   - **상태:** Backend P0 (1시간 작업)

### 🟢 Medium Priority (백로그)
1. **소개팅 추천 알고리즘** - BlindDatePreference 미구현
   - **대안:** 전체 매물 리스트만 표시
   - **상태:** Backend P2

2. **투표 → 내전 연동** - API 없음
   - **대안:** 수동으로 내전 생성
   - **상태:** Backend P2

3. **베팅 수정 기능** - upsert 로직 없음
   - **대안:** 삭제 후 재등록으로 안내
   - **상태:** Backend P2

---

## 7. Temporary Workarounds (임시 해결책)

백엔드 수정 전까지 프론트엔드에서 가능한 대응:

### 상점 시스템
```typescript
// Mock 승인 플로우
const handlePurchase = async () => {
  // API 호출 (현재는 바로 APPROVED)
  const purchase = await shopApi.purchase(productId, quantity);

  // UI에서는 "승인 대기" 상태로 표시
  showToast("구매 요청이 전송되었습니다. 클랜마스터 승인 대기 중...");

  // 실제로는 이미 승인됨 (Backend 수정 후 제거)
  setTimeout(() => {
    showToast("구매가 승인되었습니다!");
    router.push('/my-coupons');
  }, 1000);
};
```

### 경매 시스템 (WebSocket 대체)
```typescript
// Polling 방식으로 임시 구현
useEffect(() => {
  const interval = setInterval(async () => {
    const auction = await auctionApi.get(auctionId);
    setAuctionData(auction);
  }, 5000); // 5초마다 갱신

  return () => clearInterval(interval);
}, [auctionId]);

// TODO: WebSocket 구현 후 교체
// const socket = io('/auction');
// socket.on('bidPlaced', (data) => { ... });
```

### 베팅 시스템 (정산 오류 대응)
```typescript
// 프론트엔드에서 Math.ceil로 예상 보상 표시
const expectedReward = Math.ceil(betAmount * rewardMultiplier);

// Backend 수정 전까지 경고 메시지
<Alert>
  예상 보상: {expectedReward}P<br />
  <small>※ 실제 보상은 소수점 처리에 따라 다를 수 있습니다</small>
</Alert>
```

---

## 8. Backend 수정 의존성 매핑

| Frontend 기능 | Backend 의존성 | 우선순위 | 예상 소요 |
|--------------|---------------|---------|----------|
| 경매 실시간 입찰 UI | Auction WebSocket Gateway | P0 | 2일 |
| 상점 쿠폰 확인 페이지 | ShopCoupon 할당 로직 | P0 | 4시간 |
| 상점 승인 대기 플로우 | Purchase PENDING → APPROVED | P1 | 2시간 |
| 베팅 예상 보상 정확도 | Math.ceil 수정 | P0 | 30분 |
| 내전 과거 기록 상세 | teamSnapshot 저장 | P1 | 2시간 |
| 소개팅 추천 탭 | BlindDatePreference API | P2 | 1일 |

**총 예상 소요:** 약 3.5일 (Backend 작업)

---

*Last Updated: 2026-01-20*
