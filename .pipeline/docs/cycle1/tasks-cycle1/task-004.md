# Task 004: 로그인 무한 새로고침(리다이렉트 루프) 수정 — 쿠키 + Authorization 헤더 병행

## 메타데이터
- 우선순위: P0
- 복잡도: M
- 병렬그룹: A
- 의존: 없음
- 변경 파일 (충돌 방지용):
  - 백엔드 수정:
    - `backend/src/modules/auth/jwt.strategy.ts` (쿠키 + Authorization 헤더 이중 추출)
    - `backend/src/modules/auth/auth.controller.ts` (`login` 응답 바디에 `access_token` 포함)
    - `backend/src/modules/auth/auth.service.ts` (필요 시 — `login()`이 이미 `{ access_token }` 반환하므로 대개 무변경, 반환 타입 정리 정도만)
  - 프론트 수정:
    - `frontend/src/lib/api.ts` (axios 요청 인터셉터로 Bearer 토큰 첨부)
    - `frontend/src/context/auth-context.tsx` (토큰 저장/삭제 + `fetchUser` 실패 표면화)
    - `frontend/src/app/login/page.tsx` (로그인 후 프로필 확인 실패 시 명확한 안내 + 루프 방지)
  - **이 태스크는 login+auth 전체 파일을 단독 소유한다.** 다른 태스크는 `api.ts`/`auth-context.tsx`/`login/page.tsx` 및 backend auth 파일을 절대 수정하지 않는다.

## 목적
신규 IP/브라우저(시크릿 모드, 새 프로필)에서 서드파티 쿠키가 차단되어 발생하는 로그인 무한 리다이렉트 루프를 제거한다. 기존 쿠키 기반 인증(동일 브라우저 재방문, 소켓 인증)은 회귀 없이 유지하고, 쿠키가 저장되지 않는 환경에서도 Authorization 헤더 폴백으로 정상 로그인·진입이 가능하게 한다.

## 배경 (조사 완료 — requirement.md P0-4)
- **근본 원인**: 프론트(`potg-psi.vercel.app`)와 백엔드(`potg.joonbi.co.kr`)가 서로 다른 사이트(eTLD+1 상이) → `access_token`이 **서드파티 쿠키**. `SameSite=None; Secure`여도 Chrome 시크릿/새 프로필·Safari ITP·Firefox ETP가 기본 차단. "신규 환경에서만 재현"과 정확히 일치.
- **루프 경로**: `login()`이 `fetchUser()` 실패를 조용히 삼켜(`setUser(null)`, throw 없음) 항상 정상 반환 → `login/page.tsx`가 `router.replace('/')` → `app/page.tsx`가 `!user` 감지 → `router.replace('/login')` → 왕복 반복. 동일 `!user` 가드가 `auth-guard.tsx`에도 존재.
- **현재 코드 사실 확인**:
  - `jwt.strategy.ts`: `jwtFromRequest: cookieExtractor` (쿠키만 추출).
  - `auth.controller.ts` `login()`: 쿠키만 set, 응답 바디는 `{ ok: true }`. `auth.service.ts` `login()`은 이미 `{ access_token }` 반환(컨트롤러가 쿠키로만 소비).
  - `api.ts`: `withCredentials: true`, Authorization 헤더 처리 없음.
  - `auth-context.tsx`: `fetchUser` catch에서 `setUser(null)`만, `login()`은 throw 안 함.
  - **방안 2(도메인 통일)는 스코프 제외** — 인프라 변경 필요, 후속 과제.

## 구현 가이드
1. **백엔드 — JWT 이중 추출 (쿠키 우선 + 헤더 폴백)**
   - `jwt.strategy.ts`: `jwtFromRequest`를 `ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()])`로 변경. **쿠키를 먼저 시도**하고 없으면 Bearer 헤더에서 추출 → 기존 쿠키 인증 경로 무회귀 보장. `passport-jwt`의 `ExtractJwt`를 import.
2. **백엔드 — 로그인 응답 바디에 토큰 포함**
   - `auth.controller.ts` `login()`: 기존 쿠키 set은 **그대로 유지**하고, 응답 바디를 `{ ok: true, access_token: tokens.access_token }`로 확장. 반환 타입 시그니처를 함께 갱신(`Promise<{ ok: true; access_token: string }>`).
   - `auth.service.ts`: 이미 `{ access_token }`을 반환하므로 대개 무변경. 반환 타입 명시가 부족하면 정리만.
   - **주의**: 토큰을 바디로 노출하는 트레이드오프(XSS 노출면)를 코드 주석에 명시하고, 근본 해결은 방안 2(도메인 통일, 후속 과제)임을 남긴다.
3. **프론트 — 토큰 저장 + Bearer 첨부**
   - `auth-context.tsx` `login()`: `const res = await api.post('/auth/login', credentials)` 후 `res.data.access_token`이 있으면 저장(예: `localStorage.setItem('access_token', token)` — SSR 안전 가드 `typeof window !== 'undefined'`). 저장 후 `fetchUser()`.
   - `api.ts`: **요청 인터셉터** 추가 — `typeof window !== 'undefined'`에서 `localStorage.getItem('access_token')`이 있으면 `config.headers.Authorization = 'Bearer ' + token` 첨부. `withCredentials: true`는 유지(쿠키 정상 환경은 쿠키로 계속 동작). 기존 응답 인터셉터는 유지.
   - `logout()`: 서버 로그아웃 호출과 함께 저장 토큰 제거(`localStorage.removeItem('access_token')`).
4. **프론트 — 실패 표면화(루프 체감 제거)**
   - `auth-context.tsx` `login()`: `fetchUser()` 후 여전히 `user`가 세팅되지 않으면(프로필 조회 실패 = 쿠키·토큰 모두 무효 의심) 명확한 에러를 throw 하거나 실패 신호를 반환한다. 단, throw 방식 채택 시 `fetchUser` 내부의 조용한 `setUser(null)`은 유지하되 `login()` 레벨에서 성공 여부를 판정(예: `fetchUser`가 성공/실패 boolean을 반환하도록 소폭 리팩터, 또는 profile 재조회 결과로 판정).
   - `login/page.tsx` `onValid`: `login()`이 실패(throw/false)하면 `router.replace('/')` 하지 않고 로그인 페이지에 머무르며 "브라우저의 서드파티 쿠키 차단 설정을 확인하거나 다시 시도해 주세요" 등 명확한 토스트 표시 → 무한 왕복 대신 명시적 안내. 성공 시에만 `router.replace('/')`.
   - `app/page.tsx`/`auth-guard.tsx`의 `!user` 리다이렉트 로직 자체는 변경 불필요(정상 동작). 헤더 폴백으로 `user`가 정상 세팅되면 루프가 근본 해소됨.
5. **회귀 방지 확인**: 소켓 인증(`use-auction-socket.ts`의 `withCredentials` 쿠키 검증)은 쿠키 정상 환경에서 그대로 동작. 헤더 폴백은 REST(axios) 경로에만 적용되며 소켓 경로를 변경하지 않는다(이 태스크는 소켓 파일 미접근).

## 제약사항 (requirement.md + CLAUDE.md)
- 도메인 통일(방안 2) 등 **배포 인프라 변경 금지** — 헤더 폴백 방식으로만 해결.
- 기존 쿠키 인증 경로를 깨지 않는다 (**회귀 금지** — 쿠키 우선 추출).
- `any` 타입 사용 금지.
- `backend/src/modules/*/*.entity.ts` 수정 금지 (DB 스키마 변경 없음).
- 에러 응답/핸들링 규칙 준수: UI는 사용자 친화 메시지, 서버는 상세 로깅. 에러 삼키기 금지(로그인 실패는 표면화).
- 프론트는 기존 스타일/테마 유지 (login/page.tsx는 로직·토스트만 추가, 디자인 변경 없음).
- 백엔드 변경 최소화 — auth 3개 파일 외 접근 금지.

## 성공 기준
- [ ] 신규 브라우저(시크릿 모드)/새 프로필/신규 IP에서 로그인 시 무한 리다이렉트 루프 없이 대시보드(`/`)에 정상 진입한다.
- [ ] 기존 쿠키 기반 로그인(동일 브라우저 재방문)과 소켓 인증이 회귀 없이 동작한다.
- [ ] `jwt.strategy.ts`가 쿠키를 우선 추출하고, 쿠키가 없을 때만 Authorization 헤더로 폴백한다.
- [ ] 로그인 응답 바디에 `access_token`이 포함되고, 프론트가 이를 저장해 이후 요청에 Bearer로 첨부한다.
- [ ] 쿠키·토큰 모두 무효한 경우 무한 루프 대신 명확한 안내 토스트가 뜨고 로그인 페이지에 머문다.
- [ ] `logout` 시 저장 토큰이 제거된다.
- [ ] `cd frontend && npm run lint && npm run build` 및 `cd backend && npm test` 통과.

## 테스트 요구사항
- 단위/통합 테스트 (백엔드, 필수):
  - `jwt.strategy` 이중 추출: 쿠키 있는 요청 / 쿠키 없고 Bearer 헤더 있는 요청 / 둘 다 없는 요청 각각의 인증 결과 검증.
  - `auth.controller` `login` 응답 바디에 `access_token` 포함 검증 (`auth.controller.spec.ts` 갱신).
  - 기존 쿠키 인증 회귀 테스트 유지.
- 프론트 수동 검증 시나리오(핸드오프 기록): (1) 시크릿 모드 로그인 → `/` 진입 성공, (2) 쿠키/토큰 강제 무효화 시 안내 토스트 + 루프 없음, (3) 로그아웃 후 재로그인 정상, (4) 기존 브라우저 재방문 세션 유지.
