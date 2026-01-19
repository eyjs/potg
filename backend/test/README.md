# POTG Backend Test Suite

## 테스트 구조

```
test/
├── unit/                    # 유닛 테스트 (모듈별)
│   ├── auth/               # 인증 서비스 테스트
│   ├── clans/              # 클랜 서비스 테스트
│   ├── auctions/           # 경매 서비스 테스트
│   ├── scrims/             # 스크림 서비스 테스트
│   ├── votes/              # 투표 서비스 테스트
│   ├── betting/            # 베팅 서비스 테스트
│   ├── shop/               # 상점 서비스 테스트
│   ├── blind-date/         # 소개팅 서비스 테스트
│   └── users/              # 유저 서비스 테스트
│
└── integration/            # 통합 테스트 (E2E 시나리오)
    ├── auth/               # 회원가입 → 로그인 → 인증 플로우
    ├── clans/              # 클랜 생성 → 멤버 추가 플로우
    ├── votes/              # 투표 생성 → 투표 → 결과 플로우
    ├── scrims/             # 스크림 생성 → 팀 배정 → 결과 플로우
    ├── auctions/           # 경매 생성 → 입찰 → 결과 플로우
    └── betting/            # 베팅 발행 → 베팅 → 정산 플로우
```

## 실행 방법

### 전체 테스트 실행
```bash
npm test
```

### 유닛 테스트만 실행
```bash
npm run test:unit
```

### 통합 테스트만 실행
```bash
npm run test:integration
```

### 특정 모듈 테스트 실행
```bash
# Auth 모듈 테스트
npm test -- auth

# Clans 모듈 테스트
npm test -- clans

# 특정 파일 실행
npm test -- test/integration/votes/vote-flow.e2e-spec.ts
```

### 커버리지 확인
```bash
npm run test:cov
```

### Watch 모드 (개발 중)
```bash
npm run test:watch
```

## 통합 테스트 시나리오

### 1. Auth Flow (인증 플로우)
**파일**: `test/integration/auth/auth-flow.e2e-spec.ts`

**시나리오**:
1. 회원가입 (POST /auth/register)
2. 로그인 및 JWT 발급 (POST /auth/login)
3. 인증된 프로필 조회 (GET /auth/profile)

**테스트 케이스**:
- ✅ 정상 회원가입
- ✅ 중복 battleTag 회원가입 실패
- ✅ 필수 필드 누락 시 실패
- ✅ 정상 로그인 및 토큰 발급
- ✅ 잘못된 비밀번호 로그인 실패
- ✅ JWT를 통한 인증된 엔드포인트 접근
- ✅ 토큰 없이 보호된 엔드포인트 접근 실패

---

### 2. Clan Flow (클랜 플로우)
**파일**: `test/integration/clans/clan-flow.e2e-spec.ts`

**시나리오**:
1. 유저 등록 및 로그인
2. 클랜 생성 (POST /clans)
3. 다른 유저가 클랜 가입 (POST /clans/:id/join)
4. 클랜 조회 및 멤버 확인

**테스트 케이스**:
- ✅ 클랜 생성자는 자동으로 MASTER 역할
- ✅ 가입한 멤버는 MEMBER 역할
- ✅ 같은 클랜에 두 번 가입 불가
- ✅ 인증 없이 클랜 생성 불가

---

### 3. Vote Flow (투표 플로우)
**파일**: `test/integration/votes/vote-flow.e2e-spec.ts`

**시나리오**:
1. 클랜 및 유저 설정
2. 투표 생성 (POST /votes)
3. 유저들이 투표 (POST /votes/:id/cast)
4. 투표 결과 조회 (GET /votes/:id)

**테스트 케이스**:
- ✅ 투표 생성 및 옵션 설정
- ✅ 유저가 투표 진행
- ✅ 중복 투표 방지
- ✅ 투표 결과 집계 확인

---

### 4. Scrim Flow (스크림 플로우)
**파일**: `test/integration/scrims/scrim-flow.e2e-spec.ts`

**시나리오**:
1. 스크림 생성 (POST /scrims)
2. 상태 업데이트: DRAFT → SCHEDULED → IN_PROGRESS
3. 경기 결과 기록 (PATCH /scrims/:id)
4. 스크림 종료 (status: FINISHED)

**테스트 케이스**:
- ✅ 스크림 생성 (DRAFT 상태)
- ✅ 상태 전환 (SCHEDULED → IN_PROGRESS → FINISHED)
- ✅ 팀 점수 기록
- ✅ 완료된 스크림 조회

---

### 5. Auction Flow (경매 플로우)
**파일**: `test/integration/auctions/auction-flow.e2e-spec.ts`

**시나리오**:
1. 경매 생성 (POST /auctions)
2. 팀장(Captain) 참가 (POST /auctions/:id/join)
3. 선수(Player) 참가
4. 팀장이 선수에게 입찰 (POST /auctions/:id/bid)
5. 경매 상태 및 입찰 내역 조회

**테스트 케이스**:
- ✅ 경매 생성 (startingPoints 1000)
- ✅ CAPTAIN 역할로 참가 (1000 포인트 지급)
- ✅ PLAYER 역할로 참가 (0 포인트)
- ✅ 팀장이 선수에게 입찰
- ✅ 보유 포인트 초과 입찰 방지
- ✅ 선수가 입찰 시도 시 실패

---

### 6. Betting Flow (베팅 플로우)
**파일**: `test/integration/betting/betting-flow.e2e-spec.ts`

**시나리오**:
1. 스크림 생성
2. 베팅 질문 생성 (POST /betting/questions)
3. 유저들이 베팅 (POST /betting/questions/:id/bet)
4. 베팅 정산 (POST /betting/questions/:id/settle)
5. 승패 결과 확인

**테스트 케이스**:
- ✅ 베팅 질문 생성 (O/X)
- ✅ 유저가 O에 베팅
- ✅ 유저가 X에 베팅
- ✅ 최소 금액 미만 베팅 실패
- ✅ 포인트 부족 시 베팅 실패
- ✅ 관리자가 결과로 정산
- ✅ 중복 정산 방지

---

## 테스트 데이터 정리

각 통합 테스트는 독립적으로 실행되며, `beforeAll`에서 필요한 데이터를 생성하고 `afterAll`에서 정리합니다.

### 주의사항
- 통합 테스트는 실제 데이터베이스를 사용합니다 (PostgreSQL)
- Docker 컨테이너가 실행 중이어야 합니다
- 테스트용 환경변수는 `.env.test` 사용 권장

## 테스트 환경 설정

### 1. 데이터베이스 준비
```bash
# Docker Compose로 PostgreSQL 실행
docker-compose up -d postgres
```

### 2. 환경 변수 설정
`.env.test` 파일 생성:
```env
NODE_ENV=test
DATABASE_HOST=localhost
DATABASE_PORT=5434
DATABASE_USER=potg
DATABASE_PASSWORD=potg_dev_password
DATABASE_NAME=potg_test_db
JWT_SECRET=test_secret_key
```

### 3. 테스트 실행
```bash
npm test
```

## CI/CD 통합

GitHub Actions 등 CI/CD 파이프라인에서 실행 시:

```yaml
- name: Run Tests
  run: |
    docker-compose up -d postgres
    npm run test:cov
```

## 테스트 커버리지 목표

- **유닛 테스트**: 80% 이상
- **통합 테스트**: 주요 비즈니스 플로우 100% 커버

---

## 추가 예정 테스트

- [ ] Shop Flow (상점 구매 플로우)
- [ ] Blind Date Flow (소개팅 매칭 플로우)
- [ ] Point Log (포인트 변동 추적)
- [ ] 동시성 테스트 (경매 동시 입찰 등)
- [ ] 성능 테스트 (부하 테스트)
