# ADR-001: 로그인 인증에 Authorization 헤더 폴백 도입 (쿠키 우선 + Bearer 폴백)

- 상태: 채택됨 (Accepted)
- 일시: 2026-07-02
- 관련 태스크: `.pipeline/tasks/task-004.md`

## 컨텍스트

신규 브라우저(시크릿 모드), 새 프로필, 신규 IP 환경에서 로그인 시 무한 리다이렉트 루프(로그인 ↔ 대시보드 왕복)가 발생해 서비스 진입 자체가 불가능한 심각한 버그가 보고되었다.

원인을 조사한 결과:
- 프론트엔드(`potg-psi.vercel.app`)와 백엔드(`potg.joonbi.co.kr`)는 서로 다른 사이트(eTLD+1 상이)이며, 인증 쿠키(`access_token`)는 구조적으로 **서드파티 쿠키**다.
- `SameSite=None; Secure` 속성을 부여해도, Chrome 시크릿 모드/새 프로필, Safari ITP(Intelligent Tracking Prevention), Firefox ETP(Enhanced Tracking Protection)는 서드파티 쿠키를 기본적으로 차단한다.
- 기존 코드는 `login()` 이후 `fetchUser()` 실패를 조용히 삼켜(`setUser(null)`, throw 없음) 로그인 요청 자체는 "성공"으로 취급했다. 이 때문에 `login/page.tsx`가 `router.replace('/')`로 이동하고, `app/page.tsx`/`auth-guard.tsx`의 `!user` 가드가 다시 `/login`으로 되돌리는 왕복이 반복되었다.
- "신규 환경에서만 재현된다"는 버그 리포트 패턴이 서드파티 쿠키 차단 가설과 정확히 일치했다.

## 결정

1. **백엔드 — JWT 이중 추출 (쿠키 우선, 헤더 폴백)**
   `jwt.strategy.ts`의 `jwtFromRequest`를 `ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()])`로 확장한다. 쿠키를 먼저 시도하고, 없을 때만 `Authorization: Bearer` 헤더에서 추출한다.
2. **백엔드 — 로그인 응답 바디에 토큰 포함**
   `auth.controller.ts`의 `login()`은 기존처럼 HttpOnly 쿠키를 계속 설정하되, 응답 바디에도 `access_token`을 함께 반환한다 (`{ ok: true, access_token }`).
3. **프론트엔드 — 토큰 저장 및 Bearer 첨부**
   `auth-context.tsx`의 `login()`은 응답의 `access_token`을 `localStorage`에 저장한다(SSR 안전 가드 `typeof window !== 'undefined'` 적용). `lib/api.ts`의 axios 요청 인터셉터가 저장된 토큰이 있으면 모든 요청에 `Authorization: Bearer <token>`을 첨부한다. `withCredentials: true`는 유지해 쿠키가 정상 동작하는 환경에서는 계속 쿠키로 인증한다.
4. **프론트엔드 — 실패 표면화**
   `login()` 후 `fetchUser()`가 실패하면(쿠키·토큰 모두 무효) 명시적으로 실패를 표면화(throw)한다. `login/page.tsx`는 이 실패를 감지해 `router.replace('/')`를 호출하지 않고 로그인 페이지에 머무르며 명확한 안내 토스트를 표시한다. 이로써 무한 왕복 대신 사용자에게 인지 가능한 실패 상태를 제공한다.
5. **소켓 인증은 변경하지 않음**
   `use-auction-socket.ts`(소켓 인증, `withCredentials` 쿠키 기반)는 이 태스크에서 접근하지 않는다. 헤더 폴백은 REST(axios) 경로에만 적용된다.

## 고려한 대안

### 대안 A — 프론트/백엔드 도메인 통일 (same-site)
프론트와 백엔드를 동일 사이트(예: 동일 apex 도메인의 서브도메인)로 재배치하면 쿠키가 first-party가 되어 브라우저 차단 정책의 영향을 받지 않는다. 이것이 **근본적인 해결책**이다.

**채택하지 않은 이유**: 배포 인프라(도메인/DNS/Vercel 프로젝트 설정 등) 변경이 필요해 이번 스코프(애플리케이션 코드 수정)를 벗어난다. `requirement.md`에서도 인프라 변경은 명시적으로 스코프 제외되었다. **후속 과제로 이월**하며, 이 과제가 완료되면 헤더 폴백 로직(및 localStorage 토큰 저장)을 제거하고 순수 쿠키 인증으로 되돌릴 수 있다.

### 대안 B — 쿠키만 유지하고 프론트에서 재시도/안내만 개선
쿠키 차단 자체는 해결하지 못하므로 신규 환경 사용자는 여전히 로그인할 수 없다. 무한 루프는 없어지지만 근본 문제(로그인 불가)가 해결되지 않아 기각.

### 대안 C — 토큰을 메모리(in-memory)에만 보관 (localStorage 미사용)
XSS 노출면을 줄일 수 있으나, 페이지 새로고침 시 토큰이 소실되어 매번 재로그인이 필요해 사용성이 크게 저하된다. 이번 스코프(최소 침습)에서는 채택하지 않았으며, plan-review에서도 비차단 참고사항으로 남겨 후속 검토 대상으로 기록했다.

## 결과 (Consequences)

### 긍정적
- 서드파티 쿠키가 차단된 환경에서도 로그인 및 서비스 진입이 정상 동작한다.
- 기존 쿠키 기반 인증(동일 브라우저 재방문, 소켓 인증)은 쿠키 우선 추출 순서 덕분에 회귀 없이 그대로 동작한다.
- 무한 루프 대신 명확한 실패 안내로 사용자 경험이 개선된다.

### 부정적 / 트레이드오프
- **XSS 공격 표면 확대**: `access_token`이 응답 바디로 노출되고 `localStorage`에 저장되므로, XSS 취약점이 존재할 경우 스크립트가 토큰을 탈취할 수 있다. HttpOnly 쿠키 대비 보안 수준이 낮아진다. 이 트레이드오프는 `auth.controller.ts`의 코드 주석에 명시적으로 기록했다.
- `logout()` 시 저장 토큰을 제거하지만, 로그아웃 없이 방치된 세션의 토큰은 브라우저 저장소에 남아있는 기간이 길어질 수 있다.
- 근본 해결책(도메인 통일)이 적용되기 전까지는 두 가지 인증 경로(쿠키 + 헤더)를 계속 유지·검증해야 하는 유지보수 비용이 있다.

### 완화 및 후속 과제
- 근본 해결책인 도메인 통일(same-site)을 후속 과제로 명시적으로 남긴다. 완료 시 헤더 폴백/localStorage 저장 로직을 제거하는 것을 권장한다.
- 백엔드 테스트(`jwt.strategy.spec.ts`)에 쿠키 우선/Bearer 폴백/둘 다 없음 3케이스를 커버해 회귀를 방지한다.
- 장기적으로 XSS 노출면을 더 줄이고 싶다면 대안 C(in-memory 토큰 + refresh 재획득)를 재검토할 수 있다.
