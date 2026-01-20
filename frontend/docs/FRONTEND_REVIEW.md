# POTG Frontend - 종합 검토 보고서

**작성일**: 2026-01-20
**프레임워크**: Next.js 16.0.10 (App Router + Turbopack)
**상태**: 🔴 **심각한 문제 다수 발견**

---

## 🚨 심각도 P0 (Critical) - 즉시 수정 필요

### 1. ❌ **백엔드 API 불일치 - 로그인 실패**

**위치**: `src/app/login/page.tsx:31-34`

```typescript
const response = await api.post('/auth/login', {
  username: formData.username,  // ❌ 백엔드는 username 사용하지 않음
  password: formData.password
})
```

**백엔드 API**: `POST /auth/login`
```typescript
// LoginDto (backend)
{
  battleTag: string;  // ✅ 실제로 필요한 필드
  password: string;
}
```

**문제점**:
- 프론트엔드가 `username`을 전송하지만 백엔드는 `battleTag`를 요구
- **현재 로그인이 100% 실패함**
- 백엔드 수정 이력 확인 결과: username + battleTag 이원화 시스템으로 변경됨

**해결 방법**:
```typescript
// Option 1: 로그인 시 battleTag 입력받기
const response = await api.post('/auth/login', {
  battleTag: formData.battleTag,  // username 대신 battleTag
  password: formData.password
})

// Option 2: 백엔드에서 username으로도 로그인 가능하도록 수정
```

---

### 2. ❌ **회원가입 API 불일치**

**위치**: `src/app/signup/page.tsx:78-84`

```typescript
const payload = {
  username: formData.username,
  battleTag: formData.battleTag,
  password: formData.password,
  mainRole: formData.mainRole === 'damage' ? 'DPS' : formData.mainRole.toUpperCase(),
}
```

**백엔드 RegisterDto**:
```typescript
{
  username: string;    // ✅
  battleTag: string;   // ✅
  password: string;    // ✅
  mainRole: 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX';  // ✅
}
```

**문제점**:
- mainRole 매핑 로직 오류:
  - `'damage'` → `'DPS'` ✅
  - `'tank'` → `'TANK'` ✅
  - `'support'` → `'SUPPORT'` ✅
  - `'flex'` → `'FLEX'` ✅

**실제 문제**: 회원가입 자체는 작동하지만, 로그인 UI에서 username 입력을 요구하는데 로그인 API는 battleTag를 요구하므로 **회원가입 후 로그인 불가능**

---

### 3. ❌ **AuthContext User 인터페이스 불일치**

**위치**: `src/context/auth-context.tsx:7-16`

```typescript
interface User {
  id: string;
  username: string;      // ✅ 백엔드 User 엔티티에 존재
  battleTag: string;     // ✅
  role: 'USER' | 'ADMIN';
  mainRole: 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX';
  rating: number;
  avatarUrl?: string;
  clanId?: string;       // ❌ 백엔드 User 엔티티에 없음
}
```

**백엔드 User 엔티티**:
```typescript
{
  id: string;
  username: string;
  battleTag: string;
  password: string;  // 응답에서 제거됨
  role: 'USER' | 'ADMIN';
  mainRole: 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX';
  rating: number;
  avatarUrl?: string;
  bettingFloatingEnabled: boolean;  // ❌ 프론트엔드 인터페이스에 없음
  // clanId는 User 엔티티에 없고, ClanMember 관계로 관리됨
}
```

**문제점**:
1. `clanId`는 User 직접 속성이 아님
   - ClanMember 테이블을 통해 관리됨
   - `/auth/profile` 응답에 포함되지 않음
2. `bettingFloatingEnabled` 필드 누락
3. 클랜 소속 여부 확인 로직 오류 (`user.clanId` 체크)

**해결 방법**:
```typescript
interface User {
  id: string;
  username: string;
  battleTag: string;
  role: 'USER' | 'ADMIN';
  mainRole: 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX';
  rating: number;
  avatarUrl?: string;
  bettingFloatingEnabled: boolean;
  clan?: {  // 별도 API로 조회하거나 profile 응답에 포함 필요
    id: string;
    name: string;
    role: 'MASTER' | 'MANAGER' | 'MEMBER';
    totalPoints: number;
  };
}
```

---

### 4. ❌ **API Base URL 프로덕션 하드코딩**

**위치**: `src/lib/api.ts:4`

```typescript
const api = axios.create({
  baseURL: 'https://potg.joonbi.co.kr',  // ❌ 프로덕션 URL 하드코딩
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**문제점**:
1. 로컬 개발 시 프로덕션 서버로 요청 전송
2. 개발/스테이징/프로덕션 환경 분리 불가
3. 로컬 백엔드(localhost:3001) 테스트 불가능

**해결 방법**:
```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

`.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🟡 심각도 P1 (High) - 조속히 수정 필요

### 5. ⚠️ **클랜 가입 플로우 불일치**

**위치**: `src/app/page.tsx:29-33`

```typescript
api.get('/clans/requests/me')  // ❌ 백엔드에 없는 엔드포인트
  .then(res => setPendingRequest(res.data))
```

**백엔드 실제 API**:
- `POST /clans/:id/join` - 즉시 가입 (승인 대기 없음)
- 가입 신청/승인 시스템은 백엔드에 구현되지 않음

**문제점**:
- 프론트엔드는 "가입 승인 대기" UI 구현
- 백엔드는 즉시 가입 방식
- API 엔드포인트 불일치로 기능 작동 불가

**해결 방법**:
1. 백엔드에 ClanJoinRequest 엔티티 및 승인 시스템 구현
2. 또는 프론트엔드를 즉시 가입 방식으로 변경

---

### 6. ⚠️ **Vote/Scrim 생성 API 불일치**

**위치**: `src/app/page.tsx:55-69`

```typescript
await api.post('/votes', {
  clanId: user?.clanId,
  title: voteData.title,
  deadline: new Date(voteData.deadline).toISOString(),
  scrimType: 'NORMAL',      // ❌ CreateVoteDto에 없는 필드
  multipleChoice: false,    // ❌ CreateVoteDto에 없는 필드
  anonymous: false,         // ❌ CreateVoteDto에 없는 필드
  options: [...]
})
```

**백엔드 CreateVoteDto**:
```typescript
{
  clanId: string;
  title: string;
  deadline: Date;
  // scrimType, multipleChoice, anonymous는 없음
}
```

**문제점**:
- 불필요한 필드 전송
- VoteOption 생성 로직 미구현 (백엔드에서 처리 안 됨)

---

### 7. ⚠️ **Missing 엔드포인트**

프론트엔드에서 호출하는 엔드포인트 중 백엔드 미구현:

| 엔드포인트 | 사용 위치 | 백엔드 상태 |
|-----------|----------|-----------|
| `GET /clans/requests/me` | page.tsx:30 | ❌ 없음 |
| `GET /votes?clanId=X` | page.tsx:43 | ⚠️ 미검증 |
| `GET /auctions?clanId=X` | page.tsx:44 | ⚠️ 미검증 |
| `GET /wallet/history` | 가능성 높음 | ✅ 구현됨 |
| `POST /wallet/send` | 가능성 높음 | ✅ 구현됨 |

---

## 🟢 심각도 P2 (Medium) - 개선 권장

### 8. 📊 **부족한 에러 핸들링**

**위치**: 대부분의 API 호출

```typescript
try {
  const response = await api.post('/auth/login', {...})
} catch (error) {
  console.error(error)  // ❌ 단순 콘솔 로그
  alert("로그인 실패: ...")  // ❌ alert 사용
}
```

**문제점**:
- 에러 타입별 처리 없음 (400, 401, 500 구분 안 함)
- 사용자 친화적 에러 메시지 부재
- Toast 알림 시스템 미사용 (sonner 설치되어 있으나 미활용)

**개선 방법**:
```typescript
import { toast } from 'sonner';

try {
  const response = await api.post('/auth/login', {...})
} catch (error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      toast.error('아이디 또는 비밀번호가 잘못되었습니다.');
    } else if (status === 400) {
      toast.error(message || '입력 정보를 확인해주세요.');
    } else {
      toast.error('서버 오류가 발생했습니다.');
    }
  }
}
```

---

### 9. 🔒 **인증 가드 미적용**

**위치**: 대부분의 페이지

**문제점**:
- AuthGuard 컴포넌트가 존재하지만 대부분 페이지에서 사용 안 함
- 각 페이지에서 개별적으로 인증 체크 (중복 코드)
- 클랜 미소속 사용자 접근 제어 누락

**현재**:
```typescript
// page.tsx에서 직접 체크
useEffect(() => {
  if (!user) {
    router.push("/login")
  }
}, [user, router])
```

**권장**:
```typescript
// app/layout.tsx 또는 middleware
export default function ProtectedLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}
```

---

### 10. 🎨 **UI/UX 일관성 문제**

**문제점**:
1. **로딩 상태 표시 불일치**:
   - 일부는 `animate-pulse`
   - 일부는 spinner
   - 일부는 아무 표시 없음

2. **빈 상태(Empty State) 불일치**:
   - 투표 없음: 이모티콘 + 메시지 ✅
   - 다른 페이지: 미구현 ❌

3. **반응형 디자인 불완전**:
   - 모바일에서 테스트 필요
   - `pb-20 md:pb-0` 등 임시 조치

---

## 📦 종속성 이슈

### 11. 📦 **미사용 패키지**

**설치되었으나 미사용**:
- `sonner` - Toast 알림 (에러 핸들링에 활용 필요)
- `socket.io-client` - 실시간 기능 미구현
- `react-hook-form` + `@hookform/resolvers` + `zod` - 폼 검증 미사용
- `recharts` - 차트/통계 페이지 미구현
- `date-fns` - 날짜 처리 (일부만 사용)

**권장**:
- 미사용 패키지 제거 또는 적극 활용
- `react-hook-form` + `zod`로 폼 검증 강화

---

## 🏗️ 아키텍처 평가

### ✅ 장점

1. **Next.js 최신 버전 (16.0.10)** + Turbopack
2. **Radix UI** 사용으로 접근성 좋음
3. **Tailwind CSS** + shadcn/ui로 일관된 디자인 시스템
4. **컴포넌트 모듈화**:
   ```
   src/
   ├── app/              # Pages (App Router)
   ├── modules/          # Feature modules
   ├── common/           # Shared components
   ├── context/          # Global state
   └── lib/              # Utilities
   ```
5. **TypeScript** 사용
6. **빌드 성공** (타입 에러 없음)

### ⚠️ 문제점

1. **백엔드 API 스펙 미확인**
   - 백엔드 구현 완료 후 프론트엔드 작업 시작했으나 API 검증 없음
   - 로그인 등 핵심 기능 작동 불가

2. **타입 안전성 부족**:
   ```typescript
   const [votes, setVotes] = useState([])  // ❌ any[]
   {votes.map((vote: any) => ...)}        // ❌ any 남발
   ```

3. **상태 관리 부재**:
   - Context API만 사용 (AuthContext)
   - 글로벌 상태 관리 필요 (Zustand, Jotai 등 고려)

4. **테스트 코드 없음**:
   - E2E 테스트 없음
   - 컴포넌트 테스트 없음

---

## 📊 완성도 평가

### 전체 완성도: **35%** 🔴

| 영역 | 구현도 | 작동 여부 | 비고 |
|-----|-------|----------|------|
| 인증 (로그인/회원가입) | 90% | ❌ 0% | API 불일치로 작동 안 함 |
| 클랜 관리 | 70% | ❌ 30% | 승인 시스템 불일치 |
| 대시보드 | 80% | ⚠️ 50% | API 미검증 |
| 투표 시스템 | 60% | ❌ 0% | API 불일치 |
| 경매 시스템 | 40% | ❓ | 미테스트 |
| 스크림 | 40% | ❓ | 미테스트 |
| 상점 | 50% | ❓ | 미테스트 |
| 소개팅 | 0% | ❌ | 미구현 |
| 베팅 | 0% | ❌ | 미구현 |

---

## 🎯 우선순위별 수정 계획

### 🔴 P0 (즉시) - 1~2일

1. **로그인 API 수정** (30분)
   - battleTag 입력 방식으로 변경
   - 또는 백엔드에 username 로그인 추가

2. **User 인터페이스 수정** (1시간)
   - clanId 처리 로직 수정
   - 클랜 정보 별도 조회 구현

3. **API Base URL 환경변수화** (10분)
   - `.env.local` 설정
   - 개발/프로덕션 분리

4. **Vote/Scrim API 수정** (1시간)
   - 불필요한 필드 제거
   - 백엔드 API 스펙에 맞게 수정

### 🟡 P1 (단기) - 3~5일

5. **클랜 가입 플로우 정리**
   - 백엔드 승인 시스템 구현
   - 또는 즉시 가입 방식으로 UI 변경

6. **에러 핸들링 개선**
   - Toast 시스템 도입
   - API 에러별 처리

7. **타입 안전성 강화**
   - API 응답 인터페이스 정의
   - any 타입 제거

### 🟢 P2 (중기) - 1~2주

8. **Missing 페이지 구현**
   - 베팅 시스템
   - 소개팅
   - 갤러리

9. **폼 검증 강화**
   - react-hook-form + zod

10. **테스트 코드 작성**
    - E2E 테스트 (Playwright)
    - 컴포넌트 테스트

---

## 🚀 즉시 실행 가능한 수정사항

### 1. 로그인 수정

```typescript
// src/app/login/page.tsx
const [formData, setFormData] = useState({
  battleTag: "",  // username → battleTag
  password: "",
  rememberMe: false,
})

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  try {
    const response = await api.post('/auth/login', {
      battleTag: formData.battleTag,  // ✅ 수정
      password: formData.password
    })
    await login(response.data.access_token)
    router.push("/")
  } catch (error) {
    toast.error("로그인 실패: 배틀태그나 비밀번호를 확인해주세요.")
  } finally {
    setIsLoading(false)
  }
}
```

### 2. API URL 수정

```typescript
// src/lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. User 인터페이스 수정

```typescript
// src/context/auth-context.tsx
interface ClanMembership {
  clanId: string;
  clanName: string;
  role: 'MASTER' | 'MANAGER' | 'MEMBER';
  totalPoints: number;
  lockedPoints: number;
}

interface User {
  id: string;
  username: string;
  battleTag: string;
  role: 'USER' | 'ADMIN';
  mainRole: 'TANK' | 'DPS' | 'SUPPORT' | 'FLEX';
  rating: number;
  avatarUrl?: string;
  bettingFloatingEnabled: boolean;
  clan?: ClanMembership;  // 별도 조회 필요
}

// fetchUser 함수 수정
const fetchUser = async () => {
  try {
    const response = await api.get('/auth/profile');
    const userData = response.data;

    // 클랜 정보 조회 (백엔드에 API 필요)
    try {
      const clanRes = await api.get('/users/me/clan');
      userData.clan = clanRes.data;
    } catch {
      userData.clan = null;
    }

    setUser(userData);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    logout();
  } finally {
    setIsLoading(false);
  }
};
```

---

## 📝 결론

### 현재 상태: **작동 불가 (Non-functional)** 🔴

**핵심 문제**:
1. 로그인/회원가입 불가 (API 불일치)
2. 클랜 시스템 불완전 (API 누락)
3. 대부분의 기능 미검증

**필요 작업**:
- P0 이슈 4개 수정 → **2일 소요 예상**
- P1 이슈 해결 → **5일 소요 예상**
- 전체 기능 완성 → **2~3주 소요 예상**

**권장사항**:
1. 백엔드 API 문서화 (Swagger)
2. 프론트-백엔드 API 스펙 동기화 회의
3. P0 이슈 우선 수정 후 통합 테스트
4. 단계별 기능 검증 및 배포

---

**검토자**: Claude Sonnet 4.5
**검토일**: 2026-01-20
**프로젝트**: POTG Frontend v0.1.0
**빌드 상태**: ✅ 성공 (기능 작동: ❌ 실패)
