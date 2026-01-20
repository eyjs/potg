# POTG Frontend - 치명적 문제점 종합 보고서

**작성일**: 2026-01-20
**완성도**: **30%** 🔴 (프로덕션 불가)

---

## 🚨 치명적 문제 (P0) - 즉시 전면 수정 필요

### 1. ❌ **투표(Vote) 페이지 없음**

**문제**:
- 컴포넌트만 존재 (`modules/vote/components/`)
- **독립 페이지 없음** (`app/vote/` 없음)
- 대시보드에서만 CreateVoteModal로 생성 가능
- **투표 CRUD 불가능**:
  - ❌ 투표 목록 페이지
  - ❌ 투표 상세 페이지
  - ❌ 투표 수정/삭제
  - ❌ 투표 결과 확인
  - ❌ 투표하기 UI

**현재 상태**:
```
app/
├── login/
├── signup/
├── clan/
├── auction/
├── scrim/
├── shop/
├── betting/  ✅ (있으나 미완성)
├── gallery/  ✅ (소개팅, 컨셉 잘못됨)
└── vote/     ❌ 없음!
```

**필요한 구현**:
```
app/vote/
├── page.tsx              # 투표 목록
└── [id]/
    └── page.tsx          # 투표 상세 + 투표하기
```

---

### 2. ❌ **베팅(Betting) 기능 미완성**

**위치**: `app/betting/page.tsx`

**구현된 것**:
- ✅ 베팅 질문 목록 조회 (`GET /betting/questions`)
- ✅ 베팅하기 (`POST /betting/questions/:id/bet`)

**미구현 (심각)**:
- ❌ **베팅 질문 생성** (Admin 기능)
- ❌ **베팅 정산** (Admin 기능)
- ❌ **베팅 내역 조회** (내가 건 베팅)
- ❌ **베팅 결과 확인**
- ❌ Admin 전용 관리 페이지

**UI/UX 문제**:
```typescript
const amount = prompt("베팅할 금액을 입력하세요")  // ❌ prompt() 사용
alert("베팅이 완료되었습니다!")                   // ❌ alert() 사용
```

**필요한 구현**:
```
app/betting/
├── page.tsx           # 베팅 질문 목록 (현재 있음, 개선 필요)
├── admin/
│   └── page.tsx       # 베팅 질문 생성/관리/정산
├── my-bets/
│   └── page.tsx       # 내 베팅 내역
└── [id]/
    └── page.tsx       # 베팅 상세 (입력 폼 개선)
```

---

### 3. ❌ **소개팅(Blind Date) 컨셉 완전 오류**

**위치**: `app/gallery/page.tsx`

**현재 구현**:
```typescript
interface Hero {
  gameRole: "tank" | "dps" | "support"  // ❌ 게임 포지션
  tier: string                          // ❌ 게임 티어 (Gold, Diamond...)
  mostHeroes: string[]                  // ❌ 오버워치 영웅 이름
  mbti: string
  smoking: boolean
  // ...
}

// 필터링
<Button>탱커</Button>
<Button>딜러</Button>
<Button>힐러</Button>
```

**문제점**:
1. **소개팅 시스템에 게임 포지션 필터** (tank, dps, support)
2. **게임 티어와 영웅 정보** 포함
3. 실제 소개팅인지, 게임 파티 매칭인지 **컨셉 불명확**
4. 백엔드 BlindDateListing 엔티티에도 gameRole, tier, mostHeroes 존재

**사용자 지적**:
> "DPS TANK는 왜 필요해? 소개팅에 어이없고"

**해결 방법 (택1)**:

**옵션 1: 실제 소개팅으로 변경**
```typescript
interface BlindDateProfile {
  name: string
  age: number
  gender: 'MALE' | 'FEMALE'
  location: string
  job: string
  education: string
  height: number
  mbti: string
  smoking: boolean
  drinking: boolean
  idealType: string
  photos: string[]
}

// 필터링: 성별, 나이, 지역, 직업
```

**옵션 2: 게임 파티 매칭으로 명확화**
```typescript
// 페이지 이름 변경: gallery → team-finder
interface TeamMember {
  battleTag: string
  mainRole: 'TANK' | 'DPS' | 'SUPPORT'
  subRole?: string
  tier: string
  mostPlayedHeroes: string[]
  playtime: string
  voiceChat: boolean
}
```

---

### 4. ❌ **네비게이션/메뉴 접근성 없음**

**문제**:
- 베팅 페이지 URL 직접 입력해야 접근 가능
- 메뉴/네비게이션에 베팅, 투표 링크 없음
- 헤더에 주요 기능 링크 누락

**Header 확인 필요**:
```typescript
// common/layouts/header.tsx 확인 필요
// 필요한 메뉴:
- 대시보드
- 투표
- 베팅
- 경매
- 스크림
- 상점
- 갤러리/소개팅
```

---

### 5. ❌ **API 엔드포인트 불일치/미사용**

**백엔드에는 있으나 프론트엔드에서 미사용**:

| 백엔드 API | 프론트엔드 | 상태 |
|-----------|----------|------|
| `POST /betting/questions` | ❌ | 관리자 베팅 생성 UI 없음 |
| `POST /betting/questions/:id/settle` | ❌ | 베팅 정산 UI 없음 |
| `GET /wallet/history` | ❌ | 포인트 내역 페이지 없음 |
| `POST /wallet/send` | ❌ | 선물하기 UI 없음 |
| `POST /votes` | ⚠️ | 있으나 VoteOption 생성 로직 불명확 |
| `POST /votes/:id/cast` | ❌ | 투표하기 UI 없음 |
| `GET /scrims` | ❌ | 스크림 목록 페이지 없음 |

---

## 🟡 심각한 문제 (P1)

### 6. ⚠️ **필터링 시스템 이상**

**위치**: `app/gallery/page.tsx:78-82`

```typescript
const filteredHeroes = heroes.filter((hero) => {
  if (filterStatus !== "all" && hero.status !== filterStatus) return false
  if (filterRole !== "all" && hero.gameRole !== filterRole) return false  // ❌
  return true
})
```

**문제**:
- 소개팅 페이지에서 **게임 포지션으로 필터링**
- 일반적인 소개팅 필터 (성별, 나이, 지역) 없음
- 백엔드 BlindDatePreference 엔티티와 불일치
  - 백엔드: `minAge, maxAge, preferredLocations, minHeight, minEducation`
  - 프론트: `gameRole` 필터만

---

### 7. ⚠️ **CRUD 작업 미완성 (placeholder)**

**위치**: `app/gallery/page.tsx:107-114`

```typescript
const handleUpdateStatus = async (heroId: string, status: Hero["status"]) => {
  alert("준비 중인 기능입니다.")  // ❌ 미구현
}

const handleDeleteHero = async (heroId: string) => {
  // Placeholder  // ❌ 미구현
}
```

**상태 업데이트 불가**:
- 소개팅 신청 불가
- 매칭 상태 변경 불가
- 삭제 불가

---

### 8. ⚠️ **페이지별 구현 상태**

| 페이지 | 경로 | CRUD | 상태 | 비고 |
|-------|------|------|------|------|
| 로그인 | `/login` | - | ✅ 90% | 작동 가능 |
| 회원가입 | `/signup` | C | ✅ 95% | 작동 가능 |
| 대시보드 | `/` | R | ✅ 80% | 기본 작동 |
| 클랜 생성 | `/clan/create` | C | ✅ 80% | |
| 클랜 가입 | `/clan/join` | C | ✅ 70% | |
| 클랜 관리 | `/clan/manage` | U | ⚠️ 50% | |
| 경매 목록 | `/auction` | R | ⚠️ 60% | |
| 경매 상세 | `/auction/[id]` | R | ⚠️ 60% | |
| 스크림 상세 | `/scrim/[id]` | R | ⚠️ 50% | |
| 상점 | `/shop` | R | ⚠️ 50% | |
| 내 정보 | `/my-info` | RU | ⚠️ 60% | |
| 갤러리 | `/gallery` | CR | ❌ 40% | 컨셉 오류, UD 미구현 |
| 베팅 | `/betting` | R | ❌ 30% | C 없음, 관리 불가 |
| **투표** | `/vote` | - | ❌ **0%** | **페이지 자체 없음** |
| 유틸리티 | `/utility` | - | ❓ | 용도 불명 |

---

## 🟢 추가 문제 (P2)

### 9. 📊 **UI/UX 품질 저하**

**alert/prompt 남발**:
```typescript
// betting/page.tsx
const amount = prompt("베팅할 금액을 입력하세요")
alert("베팅이 완료되었습니다!")

// gallery/page.tsx
alert("준비 중인 기능입니다.")
```

**권장**: Toast 시스템 (sonner) 활용

---

### 10. 🔒 **환경 설정 문제**

**위치**: `lib/api.ts:4`

```typescript
baseURL: 'https://potg.joonbi.co.kr',  // ⚠️ 프로덕션 URL 하드코딩
```

**문제**:
- 로컬 개발 불가
- 백엔드 포트 8100 사용 안 함

**해결**:
```typescript
baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100',
```

`.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8100
```

`.env.production`:
```env
NEXT_PUBLIC_API_URL=https://potg.joonbi.co.kr
```

---

## 📊 완성도 재평가

### 전체 완성도: **30%** 🔴

| 카테고리 | 완성도 | 비고 |
|---------|-------|------|
| 인증 (로그인/회원가입) | 90% | 작동 가능 |
| 클랜 시스템 | 60% | 기본 기능만 |
| **투표 시스템** | **0%** | **페이지 없음** |
| **베팅 시스템** | **30%** | **관리 기능 전무** |
| 경매 시스템 | 50% | UI만 부분 완성 |
| 스크림 시스템 | 40% | UI만 부분 완성 |
| 상점 | 40% | 기본 UI만 |
| **소개팅** | **20%** | **컨셉 오류 + CRUD 미완** |
| 포인트 관리 | 10% | 거의 없음 |

**작동 가능 기능**:
- ✅ 로그인/회원가입
- ✅ 클랜 생성/가입
- ✅ 대시보드 조회
- ⚠️ 베팅 조회 및 참여 (생성/관리 불가)
- ❌ 투표 (불가능)
- ❌ 소개팅 (컨셉 오류)

---

## 🎯 긴급 수정 계획

### Phase 1: 핵심 기능 구현 (1주)

#### 1. 투표 시스템 완성 (2일)
```bash
# 생성 필요
app/vote/
├── page.tsx              # 투표 목록
└── [id]/
    └── page.tsx          # 투표 상세 + 투표하기
```

**구현 내용**:
- 투표 목록 조회
- 투표 상세 보기
- 투표하기 UI
- 투표 생성 (Admin)
- 투표 마감/결과 확인

#### 2. 베팅 시스템 완성 (2일)
```bash
# 추가 필요
app/betting/
├── admin/page.tsx        # 베팅 생성/관리/정산
└── my-bets/page.tsx      # 내 베팅 내역
```

**구현 내용**:
- 베팅 질문 생성 (Admin)
- 베팅 정산 (Admin)
- 내 베팅 내역
- 베팅 결과 확인
- prompt/alert 제거 → 모달/Toast

#### 3. 소개팅 컨셉 수정 (1일)

**옵션 A: 실제 소개팅**
- gameRole, tier, mostHeroes 제거
- 성별, 나이, 지역, 직업 필터
- 백엔드 엔티티도 수정 필요

**옵션 B: 게임 파티 매칭**
- 페이지 이름 변경 (gallery → team-finder)
- "소개팅" → "파티 찾기" 명확화
- UI 텍스트 수정

#### 4. 네비게이션 추가 (0.5일)
- Header에 주요 메뉴 추가
- 투표, 베팅, 포인트 링크

### Phase 2: 기능 완성 (1주)

5. 스크림 목록/관리 페이지
6. 포인트 내역 페이지
7. 선물하기 기능
8. 경매 관리 강화

### Phase 3: 품질 개선 (1주)

9. alert/prompt → Toast
10. 타입 안전성
11. 에러 핸들링
12. 반응형 디자인

---

## 📝 즉시 실행 가능한 수정

### 1. 환경변수 설정 (2분)

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8100
```

### 2. 투표 페이지 생성 (템플릿)

```bash
mkdir -p src/app/vote/[id]
```

```typescript
// src/app/vote/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { AuthGuard } from "@/common/components/auth-guard"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"

export default function VotePage() {
  const { user } = useAuth()
  const [votes, setVotes] = useState([])

  useEffect(() => {
    fetchVotes()
  }, [])

  const fetchVotes = async () => {
    try {
      const response = await api.get(`/votes?clanId=${user?.clanId}`)
      setVotes(response.data)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B]">
        <Header />
        <main className="container px-4 py-8">
          <h1 className="text-3xl font-black italic uppercase">
            투표 <span className="text-primary">VOTE</span>
          </h1>
          {/* 투표 목록 */}
        </main>
      </div>
    </AuthGuard>
  )
}
```

---

## 결론

### 프론트엔드 상태: **프로덕션 불가** 🔴

**핵심 문제**:
1. ❌ **투표 페이지 완전 누락**
2. ❌ **베팅 관리 기능 전무**
3. ❌ **소개팅 컨셉 오류** (게임 포지션 필터)
4. ❌ **네비게이션 미완성**

**필요 작업 시간**:
- Phase 1 (핵심): **1주**
- Phase 2 (완성): **1주**
- Phase 3 (품질): **1주**
- **총 3주 소요 예상**

**우선순위**:
1. 투표 시스템 구현 (최우선)
2. 베팅 관리 기능
3. 소개팅 컨셉 정리
4. 품질 개선

---

**작성자**: Claude Sonnet 4.5
**작성일**: 2026-01-20
**프로젝트**: POTG Frontend
**권장**: 즉시 Phase 1 착수
