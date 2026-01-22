# POTG Auction Project

## 프로젝트 개요
POTG Auction은 오버워치 클랜 커뮤니티 관리 시스템입니다.
- Monorepo 구조 (frontend + backend)
- 주요 기능: 투표, 경매, 내전(스크림), 베팅, 상점, 소개팅

## 기술 스택

### Frontend
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI (Radix UI 기반)
- React 19, axios, socket.io-client, zod

### Backend
- NestJS 11
- TypeScript
- TypeORM + PostgreSQL 16
- JWT 인증 (passport-jwt)
- class-validator, class-transformer

## 코딩 컨벤션

- 파일명: kebab-case
- 컴포넌트명: PascalCase
- `any` 사용 금지
- Tailwind CSS만 사용 (별도 CSS 파일 금지)
- `cn()` 유틸리티로 클래스 병합
- 오버워치 테마: futuristic, skewed buttons, 고대비 네온

## 주요 파일 위치

```
potg/
├── frontend/src/
│   ├── app/           # Next.js 페이지
│   ├── components/ui/ # Shadcn UI 컴포넌트 (비즈니스 로직 X)
│   ├── components/    # 비즈니스 컴포넌트
│   ├── modules/       # 기능별 모듈
│   ├── lib/api.ts     # axios 설정
│   ├── lib/utils.ts   # cn() 등 유틸리티
│   └── context/       # Auth 등 Context
├── backend/src/
│   ├── modules/       # NestJS 모듈들
│   ├── common/        # 공통 데코레이터, 가드 등
│   └── app.module.ts  # 루트 모듈
└── docs/              # 문서 (ERD, API 스펙 등)
```

## 절대 건드리면 안되는 파일

- `frontend/src/components/ui/*` - Shadcn 컴포넌트 (수정 시 UI 일관성 파괴)
- `backend/src/modules/*/*.entity.ts` - DB 스키마 (마이그레이션 필요)
- `.env`, `.env.local` - 환경변수 (커밋 금지)
- `frontend/src/lib/utils.ts` - cn() 유틸리티
- `node_modules/`, `dist/`, `.next/` - 빌드 결과물

## 테스트 실행 방법

### Backend
```bash
cd backend
npm test           # 전체 테스트
npm run test:unit  # 유닛 테스트
npm run test:integration  # 통합 테스트
npm run test:cov   # 커버리지
```

### Frontend
```bash
cd frontend
npm run lint       # ESLint
npm run build      # 빌드 확인
```

## 개발 환경 실행

```bash
# Docker로 전체 실행
docker-compose up -d

# 또는 개별 실행
cd backend && npm run start:dev   # 포트 3000 (외부 8100)
cd frontend && npm run dev        # 포트 3000 (외부 3001)
```

## 세션 핸드오프 규칙

**중요: `/clear` 명령 전에 반드시 핸드오프 문서를 작성해야 합니다.**

사용자가 `/clear`를 요청하거나 컨텍스트가 부족해지면:

1. `docs/handoff.md` 파일을 생성/업데이트
2. 다음 내용 포함:
   - 완료된 작업 목록
   - 수정/생성된 파일 경로
   - 다음 세션에서 해야할 작업
   - 주의사항 (Entity 변경, 마이그레이션 필요 등)
   - 현재 진행 상황 플로우 다이어그램 (필요시)

3. 핸드오프 문서 작성 완료 후에만 `/clear` 진행
