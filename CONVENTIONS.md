# Project Conventions & Architecture Guidelines

이 문서는 `POTG Auction` 프로젝트의 시스템 아키텍처, 코딩 컨벤션, 그리고 AI Agent가 작업을 수행할 때 반드시 준수해야 할 규칙을 정의합니다. 모든 기여자와 AI Agent는 이 가이드를 따라 기존 코드 스타일과 구조를 유지해야 합니다.

## 1. System Architecture (시스템 구조)

이 프로젝트는 Monorepo 형태의 구조를 가지며, Frontend와 Backend가 명확히 분리되어 있습니다.

-   **Root Directory**: `potg/`
-   **Frontend**: `potg/frontend/`
    -   Framework: **Next.js 16 (App Router)**
    -   Language: TypeScript
    -   Styling: Tailwind CSS, Shadcn UI (Radix UI 기반)
-   **Backend**: `potg/backend/`
    -   Framework: **Nest.js**
    -   Language: TypeScript

---

## 2. Frontend Guidelines (Next.js)

### 2.1 Directory Structure & File Naming
-   **File Naming**: 모든 파일명은 **kebab-case**를 사용합니다. (예: `auction-room-card.tsx`, `user-profile.ts`)
-   **Component Naming**: 코드 내부의 컴포넌트 명칭은 **PascalCase**를 사용합니다.
-   **Folder Structure**:
    -   `app/`: Next.js App Router 페이지 및 레이아웃.
    -   `components/ui/`: 버튼, 입력창 등 재사용 가능한 **Atomic UI 컴포넌트** (Shadcn UI 패턴). **이 폴더의 컴포넌트는 비즈니스 로직을 포함하지 않아야 합니다.**
    -   `components/`: 비즈니스 로직이 포함되거나, 특정 기능에 종속된 컴포넌트.
    -   `lib/`: 유틸리티 함수 (`utils.ts` 등) 및 설정.

### 2.2 Component Architecture
-   **Server Components Priority**: 기본적으로 모든 컴포넌트는 Server Component로 작성합니다.
-   **Client Components**: `useState`, `useEffect`, 브라우저 이벤트 핸들링이 필요한 경우에만 파일 최상단에 `'use client'`를 선언하여 Client Component로 전환합니다.
-   **Props Interface**: 모든 컴포넌트는 `interface`를 사용하여 Props 타입을 명시적으로 정의해야 합니다.

### 2.3 Styling (CSS)
-   **Framework**: **Tailwind CSS**를 전적으로 사용합니다.
-   **External CSS**: `globals.css` 외의 별도 CSS 파일(`.css`, `.scss`, `.module.css`) 생성을 **금지**합니다.
-   **Class Management**: 조건부 스타일링 및 클래스 병합 시 반드시 `lib/utils.ts`에 정의된 **`cn` (clsx + tailwind-merge)** 유틸리티 함수를 사용합니다.
    ```tsx
    // Good
    <div className={cn("bg-white p-4", className)}>...</div>
    
    // Bad
    <div className={`bg-white p-4 ${className}`}>...</div>
    ```

---

## 3. TypeScript Rules (Strict Mode)

-   **No `any`**: `any` 타입 사용을 **엄격히 금지**합니다. 데이터 구조를 모를 경우 `unknown`을 사용하고, 타입 가드(Type Guard)를 통해 좁혀서 사용하거나, 적절한 Interface/Type을 정의해야 합니다.
-   **Explicit Types**: 함수의 매개변수와 반환 타입은 가능한 한 명시적으로 작성합니다.
-   **Interfaces over Types**: 객체 정의 시 `type` 별칭보다 `interface` 확장을 선호합니다.

---

## 4. Backend Guidelines (Nest.js)

### 4.1 Architecture & Patterns
-   **Architecture**: Controller-Service-Module 패턴을 준수합니다.
-   **DTO**: 데이터 전송 객체(DTO)는 `class-validator`를 사용하여 유효성 검사를 수행해야 합니다.
-   **Configuration**: 환경 변수는 `@nestjs/config`를 통해 관리합니다.

### 4.2 Error Handling
적절한 HttpException을 사용하여 의미 있는 에러를 반환합니다:
-   **BadRequestException** (400): 유효하지 않은 요청, 입력 값 오류
-   **UnauthorizedException** (401): 인증 실패, 토큰 없음/만료
-   **ForbiddenException** (403): 권한 없음 (로그인은 됐으나 접근 불가)
-   **NotFoundException** (404): 리소스를 찾을 수 없음
-   **ConflictException** (409): 중복된 데이터 (예: 이미 투표함)

```typescript
// Good
if (!user) throw new NotFoundException('User not found');
if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');

// Bad - 모든 에러를 BadRequestException으로
if (!user) throw new BadRequestException('User not found');
```

### 4.3 Transaction Usage
포인트 변경을 포함하는 모든 작업은 **트랜잭션 필수**:
-   베팅 참여 및 정산
-   상점 구매 및 승인
-   소개팅 매칭 승인
-   포인트 전송 (선물하기)
-   내전 완료 및 보상 지급

```typescript
// 트랜잭션 사용 예시
return this.dataSource.transaction(async (manager) => {
  // 1. Lock이 필요한 엔티티 조회
  const clanMember = await manager.findOne(ClanMember, {
    where: { userId, clanId }
  });

  // 2. 포인트 업데이트
  clanMember.totalPoints += reward;
  await manager.save(clanMember);

  // 3. PointLog 생성
  const log = manager.create(PointLog, {
    userId, clanId, amount: reward, reason: 'BET_WIN:...'
  });
  await manager.save(log);
});
```

### 4.4 Numeric Precision
포인트 계산 시 **사용자에게 유리하도록** `Math.ceil` 사용:
```typescript
// Good - 사용자에게 유리
const reward = Math.ceil(betAmount * rewardMultiplier);
// 예: 333 × 1.5 = 499.5 → 500

// Bad - 사용자에게 불리
const reward = Math.floor(betAmount * rewardMultiplier);
// 예: 333 × 1.5 = 499.5 → 499
```

**예외:** 명시적으로 버림이 필요한 경우 (할인율 적용 등)

### 4.5 Point Operations
모든 포인트 변동은 **PointLog 생성 필수**:
```typescript
// PointLog reason 포맷 규칙
await manager.save(
  manager.create(PointLog, {
    userId,
    clanId,
    amount: reward,
    reason: `BET_WIN:${questionId}`  // 승리
  })
);

// 다른 포맷 예시:
// - BET_LOSS:{questionId}
// - SCRIM_WIN:{scrimId}
// - SEND_TO:{recipientId} - {message}
// - RECEIVE_FROM:{senderId} - {message}
// - SHOP_PURCHASE:{productId}
// - BLIND_DATE_MATCH:{listingId}
```

### 4.6 WebSocket Guidelines (Socket.io)
실시간 통신이 필요한 기능에만 사용:
-   **Auction** (경매): 실시간 입찰 경쟁
-   **Scrim** (내전): 실시간 관전 (선택)

#### 인증
```typescript
// Socket Handshake 시 JWT 검증
@WebSocketGateway({ namespace: '/auction' })
export class AuctionsGateway {
  @UseGuards(WsJwtGuard)
  handleConnection(client: Socket) {
    const user = client.data.user; // JWT에서 추출
    // ...
  }
}
```

#### Room 명명 규칙
-   `auction:{id}` (예: `auction:123e4567-e89b-12d3-a456-426614174000`)
-   `scrim:{id}`

#### 이벤트 명명 규칙
-   **camelCase** 사용 (예: `placeBid`, `timerUpdate`, `chatMessage`)
-   클라이언트 → 서버: 동사형 (`joinRoom`, `placeBid`)
-   서버 → 클라이언트: 과거형 또는 상태 (`bidPlaced`, `timerUpdate`)

#### 이벤트 구조
```typescript
interface SocketEvent<T> {
  event: string;
  data: T;
  timestamp: string;
}

// 사용 예시
socket.emit('bidPlaced', {
  event: 'bidPlaced',
  data: { bidderId, amount, targetPlayerId },
  timestamp: new Date().toISOString()
});
```

---

## 5. General AI Agent Rules (AI 작업 수칙)

1.  **Context First**: 코드를 수정하기 전에 관련 파일(`package.json`, 주변 컴포넌트, `layout.tsx` 등)을 먼저 읽고 기존 스타일을 파악하십시오.
2.  **Minimize Changes**: 요청받은 기능 외에 불필요한 리팩토링이나 스타일 변경을 하지 마십시오.
3.  **Comments**:
    -   코드 자체로 설명이 되는 경우 주석을 줄이십시오.
    -   복잡한 로직에 대한 설명이 필요할 경우, 주석은 **한국어**로 작성하십시오.
4.  **Verification**: 코드를 생성한 후에는 import 경로가 올바른지, 사용된 라이브러리가 `package.json`에 존재하는지 확인하십시오.

---

## 6. UI/UX Design Patterns (Overwatch Theme Enforcement)

**All AI Agents MUST adhere to the following design system to maintain the 'Overwatch' aesthetic.**

### 6.1 Core Aesthetic
-   **Style**: Futuristic, Angular, High-Contrast.
-   **Fonts**: Primary font is `"Exo 2"`, Secondary is `"Geist"`. Use *italics* for headers (`font-style: italic`) to mimic the game UI.
-   **Shapes**: Prefer **skewed** rectangles over rounded corners for action buttons and headers.

### 6.2 Key CSS Utility Classes (Tailwind)
Use these specific patterns instead of generic styles:

-   **Skewed Buttons**: Use the `.skew-btn` class defined in global CSS or manually apply `skew-x-[-10deg]` to the container and `skew-x-[10deg]` to the content.
    ```tsx
    // Example
    <div className="skew-btn bg-primary text-primary-foreground ...">
      <span>BUTTON TEXT</span>
    </div>
    ```
-   **Borders**: Thin, crisp borders. Use `border` or `border-2`.
-   **Colors**: Use semantic variables only.
    -   Primary Action: `bg-primary` (Orange #f99e1a)
    -   Accent/Highlight: `text-accent` (Cyan #00c3ff) or `text-ow-blue`
    -   Danger/Enemy: `text-destructive` (Red #ff4649) or `text-ow-red`
    -   Backgrounds: `bg-card` (Dark Grey #1a1a1a) or `bg-background` (Deep Black #0b0b0b)

### 6.3 Strict Don'ts
-   ❌ **Do NOT** use rounded-full buttons (unless for avatars).
-   ❌ **Do NOT** use pastel colors. Stick to high-saturation neon (Orange, Cyan) on dark backgrounds.
-   ❌ **Do NOT** use arbitrary values like `w-[350px]`. Use Tailwind sizing (`w-full`, `w-96`, `max-w-md`).
-   ❌ **Do NOT** create new CSS files. All styles must be Tailwind utility classes or defined in `app/globals.css`.

---

---

## 7. Data Integrity Rules (데이터 무결성)

### 7.1 Clan-Scoped Points
포인트는 **클랜별로 독립적**으로 관리됩니다:
-   `ClanMember.totalPoints`: 해당 클랜에서만 사용 가능한 포인트
-   `ClanMember.lockedPoints`: 베팅으로 잠긴 포인트 (사용 불가)
-   **가용 포인트**: `totalPoints - lockedPoints`

```typescript
// 포인트 잠금 (베팅 시)
clanMember.totalPoints -= betAmount;    // 즉시 차감
clanMember.lockedPoints += betAmount;   // 잠금 처리

// 포인트 해제 (정산 시)
// 승리: 보상 지급 + 잠금 해제
clanMember.totalPoints += reward;
clanMember.lockedPoints -= betAmount;

// 패배: 잠금만 해제 (이미 차감됨)
clanMember.lockedPoints -= betAmount;
```

### 7.2 Snapshot Immutability
확정된 데이터는 **스냅샷으로 보존**:
-   `Scrim.teamSnapshot`: 내전 확정 시점의 팀 구성 저장
-   `BlindDateRequest.requesterInfo`: 요청 시점의 요청자 정보 저장
-   **목적**: 향후 유저 정보 변경되어도 과거 기록 유지

```typescript
// 내전 확정 시 teamSnapshot 생성
const teamSnapshot = {
  recruitmentType: scrim.recruitmentType,
  sourceId: scrim.voteId || scrim.auctionId,
  teamA: {
    players: teamAPlayers.map(p => ({
      userId: p.userId,
      battleTag: p.user.battleTag,  // 현재 값 저장
      role: p.user.mainRole,
      rating: p.user.rating
    }))
  },
  teamB: { /* 동일 */ },
  bench: [...],
  snapshotAt: new Date().toISOString()
};
scrim.teamSnapshot = teamSnapshot;
```

---

## 8. API Design Principles

### 8.1 RESTful Conventions
-   **GET**: 조회 (멱등성 O, 부작용 X)
-   **POST**: 생성, 복잡한 조회 (검색 등)
-   **PATCH**: 부분 수정
-   **PUT**: 전체 교체 (거의 사용 안 함)
-   **DELETE**: 삭제

### 8.2 Endpoint Naming
-   **복수형** 사용: `/users`, `/auctions`, `/scrims`
-   **하위 리소스**: `/auctions/:id/bids`, `/scrims/:id/participants`
-   **액션**: 동사는 URL 끝에 (`/votes/:id/close`, `/requests/:id/approve`)

```typescript
// Good
POST   /clans/:clanId/blind-date/listings
PATCH  /clans/:clanId/blind-date/requests/:id/approve
GET    /scrims/:id/participants

// Bad
POST   /clan/:id/blindDate/createListing
PATCH  /request/:id/approve
GET    /getScrimParticipants/:id
```

---

*Last Updated: 2026-01-20*