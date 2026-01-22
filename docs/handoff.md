# POTG 경매 시스템 - 핸드오프 문서

마지막 업데이트: 2026-01-23 (오후)

## 1. 완료된 작업 (이번 세션)

### 비밀번호 재설정 기능

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

1. **환경변수 설정** (이메일 발송을 위해 필수)
   ```env
   # backend .env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="POTG" <noreply@potg.gg>
   FRONTEND_URL=http://localhost:3001
   ```

2. **DB 마이그레이션**
   - `PasswordReset` 엔티티 추가됨
   - `User` 엔티티에 `email` 필드 추가됨
   - Announcement, HallOfFame 엔티티 추가됨
   - 실제 DB와 동기화 필요

3. **디자인 컴포넌트**
   - 스켈레톤 로딩 적용 (react-loading-skeleton 활용)
   - 오버워치 스타일 버튼
   - 404/에러 페이지

4. **테스트**
   - 비밀번호 재설정 플로우 테스트
   - 새 API 엔드포인트 테스트
   - 모바일 UI 테스트

### 선택적 개선사항

- React Query 적용 확대 (API 호출 최적화)
- Framer Motion 애니메이션 확장
- Winston 로깅 적용 범위 확대

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

### 이번 세션에서 수정/생성된 파일

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
- 비밀번호 재설정 플로우 (이메일 발송, 토큰 검증, 비밀번호 변경)
- 회원가입 이메일 필드
- 공지사항 CRUD API
- 명예의전당 CRUD API
- 스크림 today 필터
- 경매 설정 패널 기능
- 모바일 하단 네비게이션
