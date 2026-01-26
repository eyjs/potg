# POTG 경매 시스템 - 핸드오프 문서

마지막 업데이트: 2026-01-27

## 0. 완료된 작업 (2026-01-27 세션)

### [WBS-012] 경매 포인트 차감 버그 수정 및 자동 낙찰 로직 추가

> 로컬과 origin이 diverge된 상태에서 origin/master로 리셋 후, 로컬 커밋의 버그 수정 패치를 재적용하여 커밋/푸시 완료.

#### 수정 내용

1. **confirmCurrentBid 포인트 차감 누락 수정** (치명적 버그)
   - **파일**: `backend/src/modules/auctions/auctions.service.ts`
   - **문제**: 낙찰 확정 시 `captain.currentPoints -= amount` 없이 비드만 비활성화 → 팀장 포인트가 차감되지 않음
   - **수정**: 낙찰 확정 시 포인트 차감 로직 추가

2. **autoConfirmOnTimeout 포인트 차감 누락 수정** (치명적 버그)
   - **파일**: `backend/src/modules/auctions/auctions.service.ts`
   - **문제**: 타임아웃 자동 낙찰 시에도 포인트 미차감
   - **수정**: 동일하게 포인트 차감 로직 추가

3. **checkAutoConfirm() 자동 낙찰 로직 추가**
   - **파일**: `backend/src/modules/auctions/auctions.service.ts`, `backend/src/modules/auctions/auction.gateway.ts`
   - 입찰 후 모든 경쟁 팀장의 잔여 포인트가 최소 다음 입찰가 미만이면 자동 낙찰
   - 경쟁자 없는 경우에도 자동 낙찰

4. **window.location.reload() → socket requestRoomState 대체**
   - **파일**: `frontend/src/app/auction/[id]/page.tsx`, `frontend/src/modules/auction/hooks/use-auction-socket.ts`
   - 새로고침 대신 소켓으로 방 상태 재요청

5. **선수 풀 상태 배지 UI 추가**
   - **파일**: `frontend/src/app/auction/[id]/page.tsx`
   - 현재 경매 중인 선수: "경매중" 배지 (파란색 하이라이트)
   - 나머지 선수: "대기" 배지

#### 수정된 파일
```
backend/src/modules/auctions/auction.gateway.ts      # requestRoomState 핸들러, 자동 낙찰 로직
backend/src/modules/auctions/auctions.service.ts     # 포인트 차감 수정, checkAutoConfirm() 추가
frontend/src/app/auction/[id]/page.tsx               # 상태 배지 UI, requestRoomState 연동
frontend/src/modules/auction/hooks/use-auction-socket.ts  # requestRoomState 함수 추가
```

#### Git 작업
- origin/master로 강제 리셋 (`git reset --hard origin/master`)
- 로컬 패치 재적용 후 커밋: `d53b1ad [WBS-012]`
- push 완료

---

## 0-1. 완료된 작업 (2026-01-26 세션)

### 프론트엔드 버그 수정 및 기능 개선 (6건)

#### 1. 명예의전당 CRUD 500 에러 수정
- **파일**: `frontend/src/components/dashboard/hall-of-fame.tsx`
- **문제**: `handleCreate`에서 POST 요청 시 `title` 필드 누락 → 백엔드 필수 필드 검증 실패 500 에러
- **수정**: `clanMembers`에서 `selectedMemberId`로 battleTag를 찾아 자동 title 생성
  - DONOR: `"[battleTag] 기부"`, WANTED: `"[battleTag] 수배"`

#### 2. WebSocket URL 운영환경 수정
- **파일**: `frontend/src/modules/auction/hooks/use-auction-socket.ts`
- **문제**: fallback URL이 `http://localhost:8100`으로 하드코딩
- **수정**: `https://potg.joonbi.co.kr`로 변경 (api.ts와 동일)

#### 3. 베팅 카운트다운 및 관리자 기능
- **파일**: `frontend/src/app/betting/page.tsx`
- **추가 기능**:
  - `bettingDeadline`이 있는 OPEN 문항에 실시간 카운트다운 표시 (일/시/분/초)
  - 마감 시 "베팅 시간 마감됨" 표시
  - ADMIN 사용자에게 "마감하기" 버튼 (PATCH로 status CLOSED 변경)
  - ADMIN 사용자에게 "수정하기" 버튼 (제목, 배율, 마감시간 수정 다이얼로그)

#### 4. 상점 카테고리 제거 및 UX 개선
- **파일들**: `frontend/src/app/shop/page.tsx`, `frontend/src/modules/shop/components/product-card.tsx`
- **수정 내용**:
  - 카테고리 탭 (`TabsList`) 제거 → 전체 상품 직접 표시
  - 상품 등록 다이얼로그에서 카테고리 Select 필드 제거
  - 상품 등록 시 기본 카테고리 `"ETC"` 자동 전송 (백엔드 호환)
  - `ProductCard`에서 카테고리 Badge 제거
  - `alert()`/`confirm()` → `toast()` 변경 (UX 통일)

#### 5. 소개팅 필터링 개선
- **파일**: `frontend/src/app/gallery/page.tsx`
- **수정 내용**:
  - 기존 상태 필터 (만남가능/소개팅중/매칭완료) 제거
  - 새 필터 추가: 성별, 나이 범위(최소~최대), MBTI(16종 드롭다운), 지역(텍스트), 흡연여부
  - 접기/펼치기 UI로 모바일 공간 절약
  - "전체 매물" / "내 등록 매물" 뷰 모드 유지
  - 필터 초기화 버튼 추가

#### 6. React #418 Hydration 에러 수정
- **파일**: `frontend/src/common/layouts/bottom-nav.tsx`
- **문제**: 서버에서는 `user=null`로 `null` 반환, 클라이언트에서는 localStorage 기반으로 렌더링 → hydration 불일치
- **수정**: `mounted` 상태 추가, `useEffect`로 클라이언트 마운트 후에만 렌더링

#### 수정된 파일 목록
```
frontend/src/components/dashboard/hall-of-fame.tsx    # title 필드 추가
frontend/src/modules/auction/hooks/use-auction-socket.ts  # fallback URL 수정
frontend/src/app/betting/page.tsx                     # 카운트다운 + 관리자 기능
frontend/src/app/shop/page.tsx                        # 카테고리 제거, toast 전환
frontend/src/modules/shop/components/product-card.tsx  # 카테고리 Badge 제거
frontend/src/app/gallery/page.tsx                     # 필터링 개선
frontend/src/common/layouts/bottom-nav.tsx            # hydration 수정
docs/handoff.md                                       # 최신화
```

#### 빌드 검증
- `next build` 성공 (TypeScript 에러 없음)
- ESLint는 기존 설정 문제(circular reference)로 실행 불가 (이번 변경과 무관)

---

## 1. 완료된 작업 (이전 세션 2026-01-24)

### 경매 비딩 버그 수정 및 테스트

#### 발견된 버그
- **BidDto 클래스-밸리데이터 데코레이터 누락**
  - 파일: `/backend/src/modules/auctions/dto/create-auction.dto.ts`
  - 증상: REST API 비딩 요청 시 `property targetPlayerId should not exist` 에러 발생
  - 원인: NestJS 전역 ValidationPipe가 `forbidNonWhitelisted: true`로 설정됨
  - 데코레이터가 없는 프로퍼티는 화이트리스트에 포함되지 않아 거부됨

#### 수정 내용
```typescript
// 수정 전
export class BidDto {
  targetPlayerId: string;
  amount: number;
}

// 수정 후
export class BidDto {
  @IsString()
  targetPlayerId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
```

#### 테스트 계정 생성
- **tcaptain1** / test1234 (TCaptain1#1111, 탱커, 마스터)
- **tcaptain2** / test1234 (TCaptain2#2222, DPS, 마스터)
- 두 계정 모두 POTG 클랜 가입 승인 완료

#### 테스트 경매 설정
- 경매명: "캡틴 비딩 테스트"
- 경매 ID: `54079df7-f010-4923-a8e0-addbf8058622`
- 팀장: TCaptain1, TCaptain2 (각 10,000P)
- 매물: Player1, Player2

#### 수정된 파일
- `backend/src/modules/auctions/dto/create-auction.dto.ts` - BidDto에 데코레이터 추가

#### 로컬 테스트 완료
- 백엔드 컨테이너 재빌드 후 비딩 API 정상 동작 확인
- 테스트 결과: `POST /auctions/:id/bid` 성공

---

### 메뉴 구조 재설계 (이전)

#### 변경 사항
- **데스크톱 헤더 메뉴** 정리
  - "대시보드" → "로비" 명칭 변경
  - "통계" 메뉴 삭제 (대시보드에서 진입)
  - "지갑" 메뉴 삭제 (내정보 > 포인트관리로 이동)

- **모바일 하단 네비게이션** 정리
  - 메인 아이콘: 로비, 경매 (2개로 축소)
  - "통계", "지갑" 메인에서 삭제
  - "베팅"은 기존대로 햄버거 메뉴에 유지

- **대시보드 페이지**
  - "빠른 실행" 섹션에 "📊 통계 보기" 버튼 추가

- **내정보 페이지**
  - "포인트 관리" 섹션 추가
  - 총 포인트 / 가용 포인트 표시
  - 지갑 페이지로 이동하는 링크

#### 수정된 파일
- `frontend/src/common/layouts/header.tsx` - 네비게이션 메뉴 정리
- `frontend/src/common/layouts/bottom-nav.tsx` - 모바일 하단바 정리
- `frontend/src/app/page.tsx` - 통계 진입 버튼 추가
- `frontend/src/app/my-info/page.tsx` - 포인트 관리 섹션 추가

---

### 비밀번호 재설정 기능 (이전)

#### Backend
- **PasswordReset 엔티티** (`/modules/auth/entities/password-reset.entity.ts`) - 비밀번호 재설정 토큰 저장
- **EmailService** (`/modules/auth/email.service.ts`) - nodemailer를 이용한 이메일 발송
- **비밀번호 재설정 API**
  - `POST /auth/forgot-password` - 재설정 이메일 발송
  - `POST /auth/reset-password` - 새 비밀번호 설정
  - `GET /auth/verify-reset-token` - 토큰 유효성 검증
- **User 엔티티 수정** - `email` 필드 추가 (unique, nullable)
- **RegisterDto 수정** - `email` 필드 추가 (필수)
- **nodemailer 패키지 추가**

#### Frontend
- **회원가입 페이지 수정** (`/app/signup/page.tsx`) - 이메일 필드 추가
- **비밀번호 찾기 페이지 수정** (`/app/forgot-password/page.tsx`) - API 연동
- **비밀번호 재설정 페이지 생성** (`/app/reset-password/page.tsx`) - 토큰 검증 및 비밀번호 변경

---

## 1-1. 이전 세션 완료 작업

### 대시보드 재설계

#### Backend
- **공지사항 엔티티** (`Announcement`) - 클랜 공지사항 관리
- **명예의전당 엔티티** (`HallOfFame`) - MVP, 기부자, 현상수배 통합
- **공지사항 API**
  - `GET /clans/:clanId/announcements` - 목록 조회
  - `POST /clans/:clanId/announcements` - 생성
  - `PATCH /clans/announcements/:id` - 수정
  - `POST /clans/announcements/:id/delete` - 삭제
- **명예의전당 API**
  - `GET /clans/:clanId/hall-of-fame` - 목록 조회 (타입별 필터링)
  - `POST /clans/:clanId/hall-of-fame` - 생성
  - `PATCH /clans/hall-of-fame/:id` - 수정
  - `POST /clans/hall-of-fame/:id/delete` - 삭제
- **스크림 오늘 필터** - `GET /scrims?today=true` 지원

#### Frontend
- **TodayScrims 컴포넌트** - 오늘의 내전 목록 표시
- **Announcements 컴포넌트 개선** - CRUD 기능, canManage prop
- **HallOfFame 컴포넌트 개선** - MVP/기부자/현상수배 탭, CRUD 기능
- **대시보드 페이지 업데이트** - 새 컴포넌트 통합, API 호출 추가

### 통계/집계 페이지 (투표 메뉴 대체)

- **투표 페이지 → 통계 페이지 변환** (`/vote/page.tsx`)
  - 내전 기록 탭 - 스크림 히스토리, 필터링
  - 리더보드 탭 - 포인트 랭킹
  - 월별 통계 탭 - 월별 내전 집계
- **헤더 메뉴 업데이트** - "투표" → "통계"

### 경매 생성/관리 UI

- **AuctionSetupPanel 컴포넌트** (`/modules/auction/components/auction-setup-panel.tsx`)
  - 매물 등록 (클랜원 선택, 일괄 등록)
  - 팀장 지정/해제
  - 경매 설정 변경 (팀 수, 시작 포인트, 턴 시간)
  - 참가자 제거
- **경매 상세 페이지 통합** - PENDING 상태에서 설정 패널 표시

### 모바일 UI 개선

- **하단 네비게이션 재설계** (`/common/layouts/bottom-nav.tsx`)
  - 주요 메뉴 4개: 홈, 통계, 경매, 지갑
  - 확장 메뉴: 베팅, 상점, 유틸리티, 소개팅, 클랜 관리, 내 정보
  - 사용자 정보 표시
  - 로그아웃 버튼

---

## 2. 다음 단계 (TODO)

### 즉시 해야할 것

0. **경매 포인트 차감 수동 검증** (WBS-012 배포 후)
   - 낙찰 확정 시 팀장 포인트가 정상 차감되는지
   - 타임아웃 자동 낙찰 시 포인트 차감 확인
   - 자동 낙찰 조건 (경쟁자 포인트 부족) 트리거 확인
   - 선수 풀 상태 배지(경매중/대기) 표시 확인

1. **배포 후 수동 테스트** (이전 WBS 분)
   - 명예의전당: 기부자/수배자 등록 시 500 에러 안 나는지 확인
   - 베팅: 카운트다운 표시 + 관리자 마감/수정 버튼 동작
   - 상점: 카테고리 없이 상품 등록/구매 정상
   - 소개팅: 성별/나이/MBTI/지역/흡연 필터 동작
   - Hydration: 콘솔에 #418 에러 없는지 확인
   - 경매 WebSocket 연결이 운영 서버로 정상 연결되는지 확인

2. ~~**베팅 백엔드 확인**~~ ✅ 완료 (2026-01-26)

3. ~~**경매 포인트 차감 버그**~~ ✅ 완료 (WBS-012, 2026-01-27)
   - confirmCurrentBid, autoConfirmOnTimeout 포인트 차감 수정
   - checkAutoConfirm 자동 낙찰 로직 추가

4. **환경변수 설정** (이메일 발송을 위해 필수)
   ```env
   # backend .env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="POTG" <noreply@potg.gg>
   FRONTEND_URL=http://localhost:3001
   ```

4. **DB 마이그레이션**
   - `PasswordReset` 엔티티 추가됨
   - `User` 엔티티에 `email` 필드 추가됨
   - Announcement, HallOfFame 엔티티 추가됨
   - 실제 DB와 동기화 필요

5. **ESLint 설정 수정**
   - 현재 ESLint 9.x에서 circular reference 에러 발생
   - `eslint.config.mjs` 설정 점검 필요

### 선택적 개선사항

- React Query 적용 확대 (API 호출 최적화)
- Framer Motion 애니메이션 확장
- 스켈레톤 로딩 적용
- 404/에러 페이지

---

## 3. 권한 체계

### 시스템 역할 (UserRole)
| 역할 | 설명 |
|------|------|
| **ADMIN** | POTG 시스템 관리자 (모든 클랜 전체 권한) |
| **USER** | 일반 사용자 |

### 클랜 역할 (ClanRole)
| 역할 | 권한 |
|------|------|
| **MASTER** | 클랜 내 모든 권한 |
| **MANAGER** | 투표/스크림/경매/상품/베팅/공지/명예의전당 CRUD |
| **MEMBER** | 참여만 가능 |

---

## 4. 파일 위치 요약

### 2026-01-26 세션에서 수정된 파일

```
frontend/src/
├── components/dashboard/
│   └── hall-of-fame.tsx              # title 필드 누락 수정
├── modules/
│   ├── auction/hooks/
│   │   └── use-auction-socket.ts     # WebSocket fallback URL 수정
│   └── shop/components/
│       └── product-card.tsx          # 카테고리 Badge 제거
├── app/
│   ├── betting/page.tsx              # 카운트다운 + 관리자 기능
│   ├── shop/page.tsx                 # 카테고리 탭 제거, toast 전환
│   └── gallery/page.tsx              # 필터링 개선
└── common/layouts/
    └── bottom-nav.tsx                # hydration 에러 수정 (mounted state)
```

### 2026-01-24 세션에서 수정된 파일

```
frontend/src/common/layouts/
├── header.tsx                   # 메뉴 정리 (통계, 지갑 삭제, 대시보드→로비)
└── bottom-nav.tsx               # 모바일 하단바 (로비, 경매만 유지)

frontend/src/app/
├── page.tsx                     # 통계 진입 버튼 추가
└── my-info/page.tsx             # 포인트 관리 섹션 추가
```

### 이전 세션에서 수정/생성된 파일

```
backend/src/
├── modules/auth/
│   ├── auth.module.ts               # PasswordReset 엔티티, EmailService 추가
│   ├── auth.controller.ts           # forgot-password, reset-password API 추가
│   ├── auth.service.ts              # 비밀번호 재설정 로직 추가
│   ├── email.service.ts             # NEW - nodemailer 이메일 서비스
│   ├── dto/auth.dto.ts              # ForgotPasswordDto, ResetPasswordDto 추가
│   └── entities/
│       └── password-reset.entity.ts # NEW - 비밀번호 재설정 토큰 엔티티
├── modules/users/
│   ├── entities/user.entity.ts      # email 필드 추가
│   └── users.service.ts             # findByEmail, updatePassword 메서드 추가
├── modules/clans/
│   ├── clans.module.ts              # Announcement, HallOfFame 엔티티 추가
│   ├── clans.controller.ts          # 공지/명예의전당 API 추가
│   ├── clans.service.ts             # 공지/명예의전당 비즈니스 로직
│   └── entities/
│       ├── announcement.entity.ts   # NEW - 공지사항 엔티티
│       └── hall-of-fame.entity.ts   # NEW - 명예의전당 엔티티
└── modules/scrims/
    ├── scrims.controller.ts         # today 파라미터 추가
    └── scrims.service.ts            # 오늘 날짜 필터링 로직

frontend/src/
├── app/
│   ├── page.tsx                     # 대시보드 재설계 (새 컴포넌트 통합)
│   ├── vote/page.tsx                # 통계 페이지로 변환
│   ├── auction/[id]/page.tsx        # AuctionSetupPanel 통합
│   ├── login/page.tsx               # 아이디 필드명 수정
│   ├── signup/page.tsx              # 이메일 필드 추가
│   ├── forgot-password/page.tsx     # API 연동
│   └── reset-password/page.tsx      # NEW - 비밀번호 재설정 페이지
├── common/layouts/
│   ├── header.tsx                   # "투표" → "통계" 메뉴명 변경
│   └── bottom-nav.tsx               # 모바일 네비게이션 재설계
├── components/dashboard/
│   ├── today-scrims.tsx             # NEW - 오늘의 내전
│   ├── announcements.tsx            # 개선 - CRUD 기능
│   └── hall-of-fame.tsx             # 개선 - 탭 UI, CRUD 기능
└── modules/auction/components/
    └── auction-setup-panel.tsx      # NEW - 경매 설정 패널

docs/
└── handoff.md                       # 업데이트
```

---

## 5. 주의사항

### DB 마이그레이션 필요
- `Announcement` 엔티티 추가됨
- `HallOfFame` 엔티티 추가됨 (type: MVP/DONOR/WANTED)
- TypeORM sync 또는 마이그레이션 실행 필요

### 새 엔티티 스키마

```typescript
// PasswordReset
{
  id: string (UUID)
  userId: string
  token: string (unique)
  expiresAt: timestamp
  used: boolean (default: false)
  createdAt: timestamp
  updatedAt: timestamp
}

// User 추가 필드
{
  email: string (unique, nullable)
}

// Announcement
{
  id: string (UUID)
  clanId: string
  authorId: string
  title: string
  content: text
  isPinned: boolean (default: false)
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}

// HallOfFame
{
  id: string (UUID)
  clanId: string
  userId: string (nullable)
  type: enum('MVP', 'DONOR', 'WANTED')
  title: string
  description: text (nullable)
  amount: integer (default: 0)
  imageUrl: string (nullable)
  displayOrder: integer (default: 0)
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 테스트 필요 항목
- **[2026-01-26 수정분]**
  - 명예의전당 기부자/수배자 등록 (title 포함 여부)
  - 경매 WebSocket 운영 서버 연결
  - 베팅 카운트다운 표시 + 관리자 마감/수정 기능
  - 상점 카테고리 제거 후 상품 등록/구매
  - 소개팅 필터 (성별/나이/MBTI/지역/흡연)
  - Hydration 에러 (#418) 해소 확인
- **[이전 수정분]**
  - 비밀번호 재설정 플로우 (이메일 발송, 토큰 검증, 비밀번호 변경)
  - 공지사항 CRUD API
  - 경매 비딩 플로우 (BidDto 수정 후 재테스트)
    - 테스트 계정: tcaptain1, tcaptain2 (비밀번호: test1234)
    - 테스트 경매 ID: 54079df7-f010-4923-a8e0-addbf8058622
