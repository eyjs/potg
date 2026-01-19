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

## 5. Implementation Checklist

| 단계 | 작업 항목 | 우선순위 | 상태 |
|:---:|:---|:---:|:---:|
| **1** | `axios` 설정 및 `api.ts` 생성 | P0 | ⬜ |
| **1** | `AuthContext` 및 로그인 연동 | P0 | ⬜ |
| **2** | 로비(Dashboard) API 연동 | P1 | ⬜ |
| **3** | **백엔드 Auction Gateway 구현** | **P0** | ⬜ |
| **3** | 프론트엔드 Socket 연결 및 경매방 연동 | P0 | ⬜ |
| **2** | 상점(Shop) 페이지 구현 | P2 | ⬜ |
| **4** | 타입 정의 파일(`api.d.ts`) 생성 및 적용 | P1 | ⬜ |

---

*Last Updated: 2026-01-20*
