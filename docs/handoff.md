# POTG 경매 시스템 - 핸드오프 문서

마지막 업데이트: 2026-01-22

## 1. 완료된 작업 (이번 세션)

### 플러그인 설치 및 설정

#### Backend
- `@nestjs/swagger` + `swagger-ui-express` - API 문서 자동화 (`/api-docs`)
- `winston` + `nest-winston` - 구조화된 로깅
- `@nestjs/throttler` - Rate limiting (DDoS 방지)
- `@nestjs/cache-manager` - 캐싱

#### Frontend
- `framer-motion` - 페이지 전환 애니메이션
- `react-loading-skeleton` - 로딩 스켈레톤
- `@tanstack/react-query` - API 캐싱, 서버 상태 관리

### Backend 기능 추가

#### 클랜 관리 API
- `GET /clans/:id/members` - 멤버 목록 조회
- `GET /clans/membership/me` - 내 멤버십 정보
- `PATCH /clans/:clanId/members/:userId/role` - 역할 변경 (마스터만)
- `POST /clans/:clanId/members/:userId/kick` - 멤버 추방
- `POST /clans/:clanId/transfer-master` - 마스터 권한 양도

#### 경매 마스터 기능 API
- `POST /auctions/:id/players` - 매물 등록
- `POST /auctions/:id/players/bulk` - 매물 일괄 등록
- `POST /auctions/:id/participants/:userId/remove` - 참가자 제거
- `POST /auctions/:id/captains` - 팀장 추가
- `POST /auctions/:id/captains/:userId/remove` - 팀장 제거
- `PATCH /auctions/:id/settings` - 경매 설정 변경
- `POST /auctions/:id/delete` - 경매 삭제

### Frontend 기능 추가

#### 프로바이더 설정
- `QueryProvider` - React Query 설정 (`/providers/query-provider.tsx`)
- `MotionProvider` - 페이지 전환 애니메이션 (`/providers/motion-provider.tsx`)

#### 클랜 관리 페이지 확장 (`/clan/manage`)
- 탭 기반 UI (멤버 관리 / 가입 신청)
- 멤버 목록 (역할별 그룹화: 마스터, 운영진, 멤버)
- 역할 변경 기능 (마스터만)
- 멤버 추방 기능
- 마스터 권한 양도 기능

### 문서 업데이트
- `docs/ERD.md` - ClanRole에 MASTER 추가
- `docs/clan/PROCESS.md` - 클랜 관리 프로세스 문서 생성

---

## 2. 다음 단계 (TODO)

### 즉시 해야할 것

1. **대시보드 재설계**
   - 오늘 올라온 내전(스크림) 표시
   - 공지사항 수정 권한 (어드민/마스터/운영진)

2. **통계/집계 페이지** (기존 투표 메뉴 대체)
   - 스크림 기록 집계
   - 전적 통계

3. **경매 생성/관리 UI**
   - 매물 등록 UI (클랜원 선택)
   - 팀 생성/삭제 UI
   - 경매 설정 UI

4. **공지사항/명예의전당/현상수배 관리**
   - 운영진 CRUD 권한
   - 기부자 + 명예의전당 통합

5. **모바일 UI 재설계**
   - 메뉴 정리 (모바일 고려)
   - 스티키 타이머 + 플로팅 입찰 버튼

6. **디자인 컴포넌트**
   - 스켈레톤 로딩 적용
   - 오버워치 스타일 버튼
   - 404/에러 페이지

### 선택적 개선사항

- React Query 적용 (API 호출 최적화)
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
| **MANAGER** | 투표/스크림/경매/상품/베팅 CRUD |
| **MEMBER** | 참여만 가능 |

---

## 4. 파일 위치 요약

### 이번 세션에서 수정/생성된 파일

```
backend/src/
├── main.ts                          # Swagger 설정 추가
├── app.module.ts                    # Winston, Throttler, Cache 설정
├── modules/clans/
│   ├── clans.controller.ts          # 멤버 관리 API 추가
│   └── clans.service.ts             # 역할 변경, 추방, 양도 로직
└── modules/auctions/
    ├── auctions.controller.ts       # 경매 마스터 API 추가
    └── auctions.service.ts          # 매물/팀 관리 로직

frontend/src/
├── app/layout.tsx                   # QueryProvider, MotionProvider 추가
├── app/clan/manage/page.tsx         # 클랜 관리 UI 확장
└── providers/
    ├── query-provider.tsx           # NEW
    └── motion-provider.tsx          # NEW

docs/
├── ERD.md                           # MASTER 역할 추가
├── clan/PROCESS.md                  # NEW - 클랜 관리 프로세스
└── handoff.md                       # 업데이트
```

---

## 5. 주의사항

### DB 마이그레이션 필요 없음
- 이번 세션에서 Entity 변경 없음
- 기존 ClanRole enum에 MASTER는 이미 존재

### 환경변수
- 프로덕션 로깅 시 `logs/` 디렉토리 필요

### 테스트
- 클랜 관리 API 테스트 필요
- 경매 마스터 API 테스트 필요
