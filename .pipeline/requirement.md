# POTG 경매 매물 수기 업로드 UI

## 생성일시
2026-07-01 00:00

## 목적
- 왜 만드는가: 경매 참여 선수(매물) 풀을 구성할 때 회원가입하지 않은 비회원도 매물로 등록해야 함. 15명 전원 회원가입 유도는 현실적으로 불가능하므로, 관리자가 이름만 수기 입력해 게스트 매물을 일괄 등록하는 UI가 필요함.
- 누가 사용하는가: 경매 관리자 (어드민)
- 기대 효과: 회원가입 없이도 매물 풀 구성 가능. 게스트 유저는 회원 목록에 노출되지 않아 데이터 오염 없음.

## 스코프

### 포함 (이번에 만드는 것)
- [ ] `frontend/src/modules/auction/api/auctions.ts` — `auctionsApi`에 `addGuestPlayers(id: string, names: string[])` 메서드 추가 (`POST /auctions/:id/players/guest`, 바디 `{ names: string[] }`)
- [ ] `frontend/src/modules/auction/components/parts/user-picker-dialog.tsx` — `mode='players'`일 때 "회원 선택" 탭 + "수기 입력" 탭 구조로 개편
- [ ] 수기 입력 탭: 텍스트영역(한 줄에 한 명 이름 입력/붙여넣기) → 파싱 → `addGuestPlayers` 호출 → 성공 시 매물 목록 갱신 + 다이얼로그 닫기 + 성공 토스트
- [ ] 에러 발생 시 에러 토스트 표시 (다이얼로그 유지)
- [ ] 빈 목록 제출 방지 및 제출 중 로딩 상태(버튼 비활성화)

### 제외 (이번에 만들지 않는 것)
- 백엔드 엔드포인트 신규 작성 (이미 완료: `POST /auctions/:id/players/guest`, 재작업 금지)
- 게스트 DB 컬럼(`is_guest`) 및 목록 필터 로직 (백엔드 완료, docker 재배포 대기 중 — 코드 무변경)
- 팀장(captains) 모드 수기 입력 추가 (회원만 허용, 변경 없음)
- 세션 keepalive / JWT 12h (완료·배포됨)
- 레이아웃·네비 통일, 대시보드, 회원 CRUD/통합모달, 로그인 쿠키, KST, 관리자 페이지 크래시 수정 (완료·배포됨)
- `frontend/src/components/ui/*` 및 `frontend/src/lib/utils.ts` 수정

## 기술스택
- 언어: TypeScript (any 금지)
- 프레임워크: Next.js 16 App Router, React 19
- 스타일링: Tailwind CSS + `cn()` 유틸리티
- UI 컴포넌트: Shadcn UI (`frontend/src/components/ui/*`)
- HTTP 클라이언트: axios (`frontend/src/lib/api.ts` 설정 기반)
- 배포: Vercel (`potg-psi.vercel.app`) ↔ NestJS 백엔드 (`potg.joonbi.co.kr`, 크로스도메인)
- 테마: 오버워치 테마 (futuristic, skewed buttons, 고대비 네온) 유지

## 핵심 기능

### P0 (필수)
- `auctionsApi.addGuestPlayers(id: string, names: string[])` 메서드 추가
  - 엔드포인트: `POST /auctions/:id/players/guest`
  - 바디: `{ names: string[] }`
- `user-picker-dialog.tsx` (mode=players)에 탭 UI 추가
  - 탭 1 "회원 선택": 기존 회원 목록 선택 UI 현행 유지
  - 탭 2 "수기 입력": 텍스트영역, 한 줄에 한 명, 빈 줄 무시, 앞뒤 공백 trim
- 수기 입력 제출 흐름: `addGuestPlayers` 호출 → 성공 시 매물 목록 갱신 + 다이얼로그 닫기 + 성공 토스트 → 실패 시 에러 토스트 (다이얼로그 유지)
- 제출 중 버튼 비활성화(로딩 상태)
- 빈 목록 제출 방지

### P1 (중요)
- 파싱된 이름 목록에서 중복 제거 또는 경고 처리

### P2 (있으면 좋음)
- 수기 입력 미리보기: 파싱된 이름 목록을 텍스트영역 하단에 칩/배지로 표시

## 제약사항
- `frontend/src/components/ui/*` 및 `frontend/src/lib/utils.ts` 수정 금지
- TypeScript `any` 타입 사용 금지
- 스타일은 Tailwind CSS + `cn()` 조합만 사용 (별도 CSS 파일, 인라인 style 객체 금지)
- 오버워치 테마 일관성 유지 (skewed button, 네온 등 기존 스타일 따름)
- 백엔드 코드 무변경 (엔드포인트 이미 완료)
- 팀장(captains) 모드는 현행 회원 선택만 유지 (수기 입력 추가 금지)
- 크로스도메인 환경(Vercel ↔ potg.joonbi.co.kr) — 기존 axios 인스턴스(`lib/api.ts`) 그대로 사용

## 성공 기준
1. 매물 추가 다이얼로그(mode=players)에서 "수기 입력" 탭이 노출된다.
2. 텍스트영역에 이름 여러 개를 줄바꿈으로 붙여넣고 제출하면 `POST /auctions/:id/players/guest`가 정상 호출된다.
3. 응답 성공 시 매물 풀 목록이 즉시 갱신되고 게스트 매물이 표시된다.
4. 등록된 게스트는 `/users` 및 `/admin/members` 회원 목록에 노출되지 않는다 (백엔드 필터 보장).
5. 팀장(captains) 모드 다이얼로그는 기존 동작 그대로 유지된다.
6. `cd frontend && npm run lint` 및 `npm run build` 오류 없이 통과한다.

## 특이사항
- 백엔드 `POST /auctions/:id/players/guest` 동작: 이름마다 `isGuest=true` 게스트 User 생성 후 PLAYER로 경매에 추가. 게스트는 `/users`·`/admin/members` 목록에서 자동 제외됨 (로그인 불가).
- docker 재배포(백엔드)는 코드 변경 없이 운영팀이 별도 수행 — 프론트 작업과 독립적으로 진행됨.
- `auction-pending-master.tsx`가 매물 추가 진입점 — `user-picker-dialog.tsx`를 `mode='players'`로 호출하는 흐름 확인 후 탭 추가 위치 결정.
- 관련 파일 경로:
  - API: `frontend/src/modules/auction/api/auctions.ts`
  - 다이얼로그: `frontend/src/modules/auction/components/parts/user-picker-dialog.tsx`
  - 진입점: `frontend/src/modules/auction/components/parts/auction-pending-master.tsx` (참고용)
