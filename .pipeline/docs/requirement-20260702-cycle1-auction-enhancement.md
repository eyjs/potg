# POTG 경매 고도화 — 효과음 / 최종 이미지 생성 수정 / 모바일 관전자 뷰 / 로그인 무한 새로고침 수정

## 생성일시
2026-07-02 00:00

## 목적
- 왜 만드는가: 현재 실시간 경매 화면에 청각 피드백이 없어 몰입감이 떨어지고, 경매 결과를 공유용 이미지로 저장하는 핵심 기능이 자주 실패하며, 모바일 관전자는 12-col 그리드 레이아웃이 그대로 반응 없이 눌려버려 사실상 시청이 불가능하다. 또한 새로운 IP/브라우저(신규 프로필·시크릿 모드 등)에서 로그인 시 무한 새로고침(리다이렉트 루프)에 걸려 서비스 진입 자체가 불가능한 심각한 버그가 있다.
- 누가 사용하는가: 경매 참여자(캡틴), 마스터, 관전자(모바일 포함) 전원. 특히 모바일 뷰는 "관전자"가 주 대상.
- 기대 효과: 실시간감 있는 경매 연출(효과음), 안정적인 결과 이미지 다운로드, 모바일에서도 트위치/치지직 세로 시청 스타일로 경매를 편하게 관전.

## 스코프

### 포함 (이번에 만드는 것)
- [ ] 입찰(bid) / 낙찰(sold) / 유찰(pass) 효과음 재생
- [ ] 결과 이미지 생성 실패 원인 진단 및 수정 (`auction-completed.tsx` `handleDownload` / `html-to-image`)
- [ ] 모바일 관전자 전용 반응형 레이아웃 (실시간 경매 현황 + 채팅만 노출)
- [ ] 로그인 무한 새로고침(리다이렉트 루프) 수정 — 신규 IP/브라우저에서 재현

### 제외 (이번에 만들지 않는 것)
- 캡틴/마스터용 모바일 조작 UI (입찰/진행 컨트롤은 이번 스코프 아님 — 관전자 뷰만 대상)
- 효과음 커스터마이징(사용자별 볼륨/음원 선택 등 고급 설정)
- 결과 이미지 템플릿 디자인 변경 (레이아웃/컬러 등은 그대로, 생성 안정성만 수정)
- 게스트 매물 수기 업로드 건 (이전 requirement, `.pipeline/docs/requirement-20260701-guest-upload.md` 참조 — 별도 파이프라인)

## 기술스택
- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Shadcn UI, socket.io-client
- 이미지 생성: `html-to-image` (기존 의존성, 신규 라이브러리 도입 없음)
- 효과음: 신규 — Web Audio API 기반 자체 재생 유틸 권장 (신규 npm 의존성 추가 여부는 P0 항목에서 결정, 아래 "권장안" 참조)
- Backend: NestJS 11, TypeORM, PostgreSQL, socket.io (이번 스코프는 원칙적으로 프론트 중심. 이미지 생성 실패는 원인 조사 결과 프론트 원인이 유력하므로 백엔드 변경 불필요할 가능성 높음 — 단, 조사 중 프록시/서버 원인이 확인되면 backend/src/modules/auctions/auctions.controller.ts 의 image-proxy 최소 수정 허용)

## 핵심 기능

### P0 (필수)

#### 1. 효과음 (입찰 / 낙찰 / 유찰)
- **트리거 지점 (코드 위치, 조사 완료)**: `frontend/src/modules/auction/hooks/use-auction-socket.ts`
  - 입찰: `socket.on('bidPlaced', ...)` 핸들러 내부 (라인 ~130) — `pushBidEvent({ kind: 'bid', ... })` 호출 지점에서 효과음 트리거
  - 낙찰: `socket.on('bidConfirmed', ...)` 핸들러 내부 (라인 ~140) — `setStageEvent({ kind: 'sold', ... })` 세팅 지점에서 효과음 트리거 (수동/자동 낙찰 공통)
  - 유찰: `socket.on('playerPassed', ...)` 핸들러 내부 (라인 ~156) — `setStageEvent({ kind: 'pass', ... })` 세팅 지점에서 효과음 트리거 (수동/타이머 자동 유찰 공통)
  - 이미 낙찰/유찰은 `AuctionStageEvent { kind: 'sold' | 'pass', seq }` 로 seq 증가 방식의 "1회성 이벤트" 패턴이 구축되어 있음 (연출 트리거 용도로 이미 사용 중 — `current-player-card.tsx`의 `stageEvent` prop 참조). 효과음도 동일 `stageEvent`를 구독해 seq 변화 시 1회 재생하는 방식을 재사용하는 것을 권장.
- **구현 방식 권장안**:
  - 신규 훅 `frontend/src/modules/auction/hooks/use-auction-sound.ts` 생성 — `bidEvents`(또는 신규 `bid` 카운터)와 `stageEvent`를 구독해 각각 사운드 재생
  - 음원: 짧은 mp3/webm 에셋을 `frontend/public/sounds/`에 배치 (예: `bid.mp3`, `sold.mp3`, `pass.mp3`) 후 `new Audio(src).play()` 방식 — 별도 npm 라이브러리(howler 등) 도입은 불필요 (기존 코드베이스에 오디오 관련 코드/의존성 전무, 가벼운 3개 SFX 재생에는 네이티브 `HTMLAudioElement`로 충분)
  - 자체 합성(Web Audio API 오실레이터)은 에셋 관리 불필요하다는 장점이 있으나 오버워치 테마에 맞는 사운드 퀄리티 확보가 어려움 — **음원 파일 방식을 기본안으로 하되, 무료 라이선스 SFX 확보가 어려울 경우 Web Audio API 합성으로 폴백**하는 것으로 Planner 단계에서 최종 결정
- **모바일 자동재생 정책 고려사항**: iOS Safari/Chrome 등 모바일 브라우저는 사용자 인터랙션 없이 오디오 재생을 차단(autoplay policy)한다. 관전자가 페이지 진입 후 최초 클릭/탭(예: "관전 시작" 또는 음소거 토글 버튼) 전에는 효과음이 재생되지 않을 수 있음을 감안해, 최초 1회 사용자 제스처(탭)로 `AudioContext`/오디오 요소를 unlock 하는 처리 포함
- **P0 범위**: 3개 이벤트(입찰/낙찰/유찰) 효과음 재생 + 모바일 autoplay unlock 처리

#### 2. 최종 이미지 생성 실패 — 진단 및 수정
- **관련 파일**:
  - `frontend/src/modules/auction/components/auction-completed.tsx` (`handleDownload`, 라인 ~68-88) — `toPng(posterRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#0b0b0b' })` 호출
  - `frontend/src/modules/auction/components/parts/auction-result-poster.tsx` — 캡처 대상 DOM (1080px 고정폭, 다수의 원격 이미지 `<img crossOrigin="anonymous">` 포함)
  - `backend/src/modules/auctions/auctions.controller.ts` (`imageProxy`, 라인 84-136) — 원격 이미지(OverFast 영웅 초상화, Discord 아바타) CORS 우회 프록시. `Access-Control-Allow-Origin: *` 정상 설정 확인됨, 화이트리스트(`overfast-api.tekrop.fr`, `d15f34w2p8l1cc.cloudfront.net`, `cdn.discordapp.com`, `media.discordapp.net`)도 합리적으로 구성되어 있어 프록시 자체의 설계 결함 가능성은 낮음
- **원인 가설 (확신도 순, 코드 리딩 기반 — 실제 브라우저 콘솔 에러 로그 미확보 상태이므로 확정 아님)**:
  1. **(중) 진단 정보 부재로 원인 특정 불가능한 구조적 문제**: `handleDownload`의 catch 블록이 `handleApiError(error, '이미지 생성 실패')`만 호출하고 `console.error(error)` 등 실제 에러 객체를 로깅하지 않음 (auction-completed.tsx 라인 ~86 부근). 즉 지금 구조로는 사용자/개발자 모두 "실패했다"는 사실만 알고 원인(타임아웃/CORS/폰트/canvas 크기 등)을 알 수 없음. **이것 자체가 1차 수정 대상** — 원인 진단이 가능하도록 로깅/에러 노출을 먼저 개선해야 근본 수정이 가능
  2. **(중) html-to-image의 cross-origin stylesheet 접근 에러**: html-to-image는 폰트 임베딩을 위해 `document.styleSheets`를 순회하며 각 스타일시트의 `cssRules`에 접근하는데, 페이지에 cross-origin `<link rel="stylesheet">`(브라우저 확장 프로그램 주입 스타일, 외부 CDN 등)가 존재하면 `cssRules` 접근 시 SecurityError가 발생해 전체 캡처가 실패하는 것이 html-to-image의 널리 알려진 이슈. 사용자별 설치된 확장 프로그램에 따라 간헐적으로 실패("자꾸 실패"하지만 항상은 아닌 패턴)하는 현상과 부합
  3. **(중) 다수 원격 이미지 로딩 지연/실패**: 포스터는 팀당 여러 멤버의 영웅 초상화(`heroPortraits`)와 아바타를 모두 `image-proxy`를 거쳐 로드. 팀/인원이 많을수록 프록시 호출이 많아지고, 백엔드 프록시의 개별 fetch 타임아웃은 5초로 설정되어 있으나 브라우저 측에서 다수의 병렬 이미지 로드 완료를 html-to-image가 기다리는 동안 전체적으로 느려지거나, 프록시 응답 지연 시 이미지 일부가 로드되지 않은 상태로 캡처가 시도되어 실패할 가능성
  4. **(하) 폰트 로딩 타이밍**: `document.fonts.ready`를 기다리지 않고 `toPng` 호출 시 next/font로 로드되는 `Exo_2` (900 weight, italic 등 다양한 스타일) 웹폰트가 캡처 시점에 아직 준비되지 않아 렌더링 실패 또는 레이아웃 시프트로 이어질 가능성 (에러보다는 시각적 결함 가능성이 더 높으나 배제 불가)
  5. **(하) pixelRatio 2 배율로 인한 canvas 크기 제한**: 1080px 폭 DOM을 pixelRatio 2로 캡처 시 실제 canvas는 2160px 이상 — 저사양 기기/모바일 브라우저에서 canvas 최대 크기 제한에 걸릴 가능성 (다만 현재 다운로드 버튼은 데스크톱 마스터 화면에서만 노출되어 우선순위 낮음)
- **수정 방향 (P0)**:
  1. `handleDownload` catch 블록에 `console.error('[AuctionResultPoster] image generation failed', error)` 등 실제 에러 로깅 추가 — 최소한의 안전한 첫 조치이자 향후 재발 시 원인 파악 가능하게 함
  2. `toPng` 호출 전 `document.fonts.ready` await 추가
  3. `toPng` 옵션에 `skipFonts: true` 또는 `fontEmbedCSS: ''` 검토 — 포스터는 인라인 스타일 기반 고정 디자인이라 웹폰트 임베딩 없이도 시각적 차이가 크지 않을 가능성이 있어, cross-origin stylesheet 접근 에러(가설 2)를 원천 차단하는 효과 기대. 단, `--font-exo2` CSS 변수를 인라인 `fontFamily`로 참조하고 있어(`auction-result-poster.tsx`) 폰트 임베딩 스킵 시 캡처 이미지의 폰트가 시스템 기본 폰트로 대체될 수 있음 — Planner/Implementor 단계에서 시각적 트레이드오프 확인 필요
  4. 실패 시 1회 자동 재시도 로직 추가 (일시적 네트워크/타이밍 이슈 대응)
  5. 위 조치 후에도 실패가 재현되면, 로깅된 실제 에러 메시지를 바탕으로 2차 수정 (예: 프록시 타임아웃 연장, 이미지 로드 실패시 폴백 아바타로 대체 후 캡처 진행 등)

#### 3. 모바일 관전자 레이아웃
- **현황 (조사 완료)**: `frontend/src/modules/auction/components/auction-ongoing-spectator.tsx` 는 `grid grid-cols-12` 고정 그리드를 사용하며 각 영역이 `lg:col-span-N`만 지정되어 있고 `lg` 미만(모바일/태블릿)에서는 `col-span-12`(팀 사이드바) 또는 `col-span-6`(선수 현황 그리드, 채팅)로 좁게 압축되어 표시됨. 즉 모바일에서 별도 레이아웃 분기가 전혀 없어 4~5개 영역이 그대로 세로로 쌓이거나 절반 폭으로 눌린 채 노출되어 실질적으로 확인 불가능한 상태 (요구사항 2번 버그 원인과 일치하는 구조적 문제).
- **레이아웃 요구사항**:
  - 세로 화면(모바일) 기준, 트위치/치지직 세로 시청 스타일 UX: **상단 고정 — 실시간 경매 현황** (현재 매물 카드 `CurrentPlayerCard` + 현재가/입찰자 + `BidTimer`), **하단 — 채팅** (`ChatPanel`)만 노출
  - 팀 사이드바(`TeamSidebar`), 입찰 로그(`BidLog`), 선수 현황 그리드(`PlayerStatusGrid`)는 모바일에서는 기본 숨김 (필요 시 접이식/탭 전환으로 P1에서 확장 가능, 이번 P0는 "경매 현황 + 채팅"만)
  - 관전자는 조작 불가(터치 인터랙션 없음, 스크롤만) — 기존 관전자 권한 그대로 유지
  - 채팅 영역은 화면 하단에서 남은 공간을 채우며 자체 스크롤, 입력창은 하단 고정
- **접근 경로 권장안**: **같은 URL(`/auction` 등 기존 경매 페이지)에서 반응형(breakpoint) 분기**를 권장. 근거:
  - 기존 코드가 이미 `AuctionOngoingSpectator` 컴포넌트 하나로 마스터/캡틴/관전자 role 분기를 수행 중이며 (`use-auction-role.ts` 확인됨), 별도 라우트를 신설하면 소켓 연결/roomState 관리 로직(`useAuctionSocket`)을 중복 유지해야 해 상태 동기화 버그 위험이 커짐
  - Next.js App Router 특성상 별도 라우트(`/auction/mobile` 등)는 공유 링크 관리, SEO, 인증 가드 등을 이중으로 구성해야 하는 부담이 있음
  - Tailwind 반응형 유틸리티(`sm:`, `md:`, `lg:` 등)만으로 컴포넌트 조건부 렌더링이 충분히 가능한 구조(`AuctionOngoingSpectator` 내부에서 `lg:` 미만일 때 별도 모바일 전용 JSX 블록 분기)
  - **구현 방향**: `AuctionOngoingSpectator` 내부에 `lg` 미만 전용 레이아웃 블록을 추가(예: `<div className="lg:hidden">...모바일 전용 상단현황+채팅...</div>` / 기존 12-col 그리드는 `hidden lg:grid`로 감싸 데스크톱 전용으로 격리), 기존 데스크톱 JSX는 구조 변경 없이 `hidden lg:grid`만 추가해 최소 침습적으로 처리
  - 접속 URL/라우팅 변경 없음 — 사용자는 모바일 브라우저로 기존 경매 링크 접속 시 자동으로 최적화 레이아웃 노출

#### 4. 로그인 무한 새로고침(리다이렉트 루프) 수정
- **증상**: 신규 IP/브라우저(시크릿 모드, 새 프로필 등)에서 로그인 시 페이지가 새로고침만 반복되고 다음 페이지로 진입하지 못함. 기존 브라우저(이미 로그인 이력 있는 환경)에서는 정상.
- **인증 플로우 조사 결과**:
  - 프론트 로그인: `frontend/src/app/login/page.tsx` `onValid` (~28-38줄) — `login()` 호출 후 `router.replace("/")`
  - `frontend/src/context/auth-context.tsx` `login()` (108-119줄) — `POST /auth/login` 후 `fetchUser()`로 `GET /auth/profile` 재조회해 `user` 상태 설정. `fetchUser` 내부는 실패해도 조용히 `setUser(null)` 처리(101-112줄)하고 throw 하지 않으므로, `login()` 자체는 쿠키 저장 성공 여부와 무관하게 항상 정상 반환됨
  - `frontend/src/app/page.tsx` (대시보드, 11-26줄) — `useEffect`에서 `!user` 이면 `router.replace("/login")`로 즉시 되돌림
  - `frontend/src/common/components/auth-guard.tsx` (11-34줄) — 다른 보호 라우트에서도 동일하게 `!user` 시 `/login`으로 push
  - 토큰 저장 방식: 프론트는 별도 토큰 저장(localStorage 등) 없이 **전적으로 백엔드 HttpOnly 쿠키**(`access_token`)에 의존. `frontend/src/lib/api.ts`는 `withCredentials: true`로 axios 설정, 별도 Authorization 헤더 처리 없음. `middleware.ts`는 존재하지 않음(서버사이드 라우트 가드 없음 — 클라이언트 useEffect 리다이렉트만 존재).
  - 백엔드 쿠키 설정: `backend/src/common/config/access-token-cookie.ts` `buildAccessTokenCookieOptions()` — `{ httpOnly: true, secure: true, sameSite: 'none', maxAge: 7일, path: '/' }`. 코드 주석에 이미 "프론트(Vercel `*.vercel.app`)와 백엔드(`potg.joonbi.co.kr`)가 서로 다른 도메인(cross-site)이므로 `SameSite=None; Secure` 필요"라고 명시되어 있어, 설계자도 크로스사이트 쿠키 구조임을 인지하고 있었음
  - CORS: `backend/src/main.ts` (71-76줄) `credentials: true` + `backend/src/common/config/cors-origins.ts`의 화이트리스트(`potg-psi.vercel.app`, `potg.joonbi.co.kr`, `localhost`, `*.vercel.app`) — CORS 설정 자체는 정상이며 쿠키 전송 자체를 막는 요인은 아님
- **원인 진단 (확신도 높음)**: 프론트(`potg-psi.vercel.app`)와 백엔드(`potg.joonbi.co.kr`)가 서로 다른 사이트(eTLD+1이 다름)이므로 `access_token` 쿠키는 **서드파티(third-party) 쿠키**로 취급됨. `SameSite=None; Secure`로 설정되어 있어 프로토콜상으로는 크로스사이트 전송이 허용되지만, Chrome 시크릿 모드/새 프로필, Safari(ITP 기본 차단), Firefox(ETP strict) 등 다수 브라우저가 **기본값으로 서드파티 쿠키를 차단**하거나 첫 로그인 이후에야 예외를 학습하는 방식으로 동작함. 이는 "새 IP/브라우저(즉 쿠키 학습 이력이 없는 환경)에서만 재현되고, 기존 브라우저에서는 정상"이라는 증상과 정확히 일치함.
- **무한 새로고침 루프 경로 (특정 완료)**:
  1. `login/page.tsx` `onValid` → `login()` 호출 → `POST /auth/login` 성공 응답은 오지만, 브라우저가 서드파티 쿠키이므로 `Set-Cookie` 헤더를 **저장하지 않음**
  2. `auth-context.tsx` `login()` 내부 `fetchUser()` → `GET /auth/profile` 요청 시 쿠키가 없어 401 → catch에서 `setUser(null)` (에러를 삼킴, throw 없음)
  3. `login()`은 정상 반환되므로 `login/page.tsx`의 `router.replace("/")` 그대로 실행 → 대시보드(`app/page.tsx`)로 이동
  4. `app/page.tsx`의 `useEffect`가 `user === null`을 감지 → 즉시 `router.replace("/login")`로 되돌림
  5. `/login`으로 돌아오면 로그인 폼이 다시 렌더 — 사용자에게는 "새로고침만 반복되고 안 넘어간다"로 체감됨 (실제로는 매번 로그인 폼 재마운트 + 대시보드 리다이렉트 왕복이 반복되거나, 사용자가 재로그인을 반복 시도하며 동일 패턴이 재현)
  6. 동일한 `!user` 가드가 `auth-guard.tsx`(다른 보호 라우트)에도 존재해 어떤 보호 페이지로 이동해도 동일하게 `/login`으로 되돌아오는 루프가 발생
- **수정 방향 권장안 (현재 구조 기준 최소 침습)**:
  1. **(권장, 최소 침습)** 쿠키를 유지하되 **Authorization 헤더 기반 병행 방식으로 전환**: 로그인 응답 바디에 `access_token`을 함께 반환하거나, 쿠키 실패 시 폴백으로 프론트가 토큰을 받아 메모리/`localStorage`에 저장하고 axios 인터셉터에서 `Authorization: Bearer <token>` 헤더를 첨부. 백엔드 `jwt.strategy.ts`가 쿠키 외에 `Authorization` 헤더도 함께 지원하도록 확장(passport-jwt의 `ExtractJwt.fromExtractors`로 쿠키+헤더 이중 추출). 크로스사이트 쿠키 차단 브라우저에서도 동작하며, 기존 쿠키 기반 흐름(소켓 인증 등)은 그대로 유지 가능
  2. **(구조적 근본 해결, 침습 큼)** 프론트/백엔드를 동일 사이트(same-site)로 통일 — 예: `potg.joonbi.co.kr`을 프론트 도메인으로 쓰고 `/api`를 백엔드로 프록시(Vercel rewrites 또는 리버스 프록시)해 쿠키를 first-party로 전환. 근본적이지만 배포 인프라 변경이 필요해 이번 스코프의 "최소 침습" 기준에는 맞지 않음 — 후속 과제로 별도 requirement 분리 권장
  3. **(즉각 완화, 병행 권장)** `login()`이 `fetchUser()` 실패를 삼키지 않고 실제 실패를 감지하도록 수정 — 로그인 직후 프로필 조회 실패 시(쿠키 미저장 의심) 사용자에게 "브라우저의 서드파티 쿠키 차단 설정을 확인해 주세요" 등 명확한 에러 토스트를 띄우고 무한 루프 대신 로그인 페이지에 머무르게 해 UX상 루프 체감을 제거 (근본 수정은 아니나 즉시 적용 가능한 안전장치)
  - **이번 P0 범위**: 방안 1(Authorization 헤더 병행 지원)을 우선 구현하고, 방안 3(에러 가시화)을 함께 적용해 폴백 실패 시에도 무한 루프 대신 명확한 안내가 뜨도록 함. 방안 2(도메인 통일)는 스코프 제외, 특이사항에 후속 과제로 기록.

### P1 (중요)
- [ ] 효과음 음소거(mute) 토글 버튼 (경매 화면 상단, localStorage에 상태 저장)
- [ ] 모바일 뷰에서 팀 현황/입찰 로그를 탭 전환 또는 바텀시트로 확인할 수 있는 보조 UI
- [ ] 이미지 생성 실패 시 사용자에게 재시도 버튼 제공 (자동 재시도 실패 후)

### P2 (있으면 좋음)
- [ ] 효과음 볼륨 조절
- [ ] 낙찰 시 화면 진동(Vibration API, 모바일 한정) 등 추가 피드백
- [ ] 모바일 관전자 화면 공유(스크린샷/URL) 최적화

## 제약사항
- `frontend/src/components/ui/*` (Shadcn 컴포넌트) 수정 금지
- `frontend/src/lib/utils.ts` 수정 금지
- `any` 타입 사용 금지
- Tailwind CSS만 사용, 별도 CSS 파일 생성 금지 — 신규 사운드 재생 유틸도 인라인 스타일/CSS 파일 없이 로직만 추가
- 오버워치 테마(futuristic, skewed buttons, 고대비 네온) 유지 — 모바일 레이아웃도 기존 디자인 토큰/색상 체계를 그대로 사용
- 백엔드 변경 최소화: 효과음/모바일 뷰는 프론트 전용 작업으로 백엔드 변경 없음. 이미지 생성 수정은 원인이 프론트(html-to-image 옵션/에러 핸들링)로 확인될 가능성이 높아 원칙적으로 프론트 전용이나, 진단 과정에서 프록시 타임아웃 등 백엔드 원인이 확정되면 `auctions.controller.ts`의 `imageProxy`만 최소 수정 허용
- `backend/src/modules/*/*.entity.ts` 수정 금지 (이번 스코프에서 DB 스키마 변경 불필요)
- 신규 오디오 에셋(mp3/webm) 사용 시 라이선스 확인 필수 (무료/CC0 SFX만 사용)
- 기존 `useAuctionSocket`의 이벤트 리스너 등록 구조를 최대한 재사용 (신규 소켓 연결/이벤트 추가 지양)
- 로그인 수정은 도메인 통일(방안 2) 등 배포 인프라 변경 없이, 기존 쿠키 기반 인증을 유지하면서 헤더 기반 폴백을 추가하는 최소 침습 방식으로 진행 (`jwt.strategy.ts` 확장 시 기존 쿠키 인증 경로를 깨지 않아야 함 — 회귀 금지)

## 성공 기준
- **효과음**: 입찰 발생 시, 낙찰 확정 시, 유찰 확정 시 각각 구분되는 효과음이 재생된다. 모바일에서 최초 사용자 탭 이후 정상 재생된다. 음소거 시 재생되지 않는다(P1 구현 시).
- **이미지 생성**: 실패 원인이 콘솔 로그로 확인 가능해야 하며, 조치 후 정상 케이스(팀 2~4개, 멤버 다수, 미낙찰 포함)에서 반복 다운로드 시 일관되게 성공한다. 실패 시에도 사용자에게 명확한 에러 토스트가 표시된다.
- **모바일 관전자 뷰**: 실제 모바일 뷰포트(375px~430px 폭) 및 Chrome DevTools 반응형 모드에서 "현재 매물/입찰 현황"과 "채팅"이 스크롤 없이 한 화면에 보이거나 세로 스크롤만으로 자연스럽게 확인 가능해야 함. 데스크톱(lg 이상)에서는 기존 레이아웃이 그대로 유지되어야 함(회귀 없음).
- 전체 공통: `cd frontend && npm run lint` 및 `npm run build` 통과
- **로그인 무한 새로고침**: 새 브라우저(시크릿 모드) 또는 새 브라우저 프로필/신규 IP 환경에서 로그인 시 무한 리다이렉트 루프 없이 정상적으로 대시보드(`/`)에 진입해야 함. 기존 쿠키 기반 로그인 흐름(동일 브라우저 재방문, 소켓 인증 등)은 회귀 없이 그대로 동작해야 함.

## 특이사항
- 이미지 생성 실패는 실제 브라우저 콘솔 에러 로그가 없는 상태로 코드 리딩만으로 원인을 추정한 것이므로, Implementor 단계에서 1차로 에러 로깅부터 추가한 뒤 재현/확인 후 근본 수정하는 2단계 접근을 권장함 (요구사항에 이미 반영됨)
- `AuctionStageEvent`(`stageEvent`, seq 기반 1회성 트리거) 패턴이 이미 낙찰/유찰 연출용으로 구축되어 있어 효과음 트리거에 그대로 재사용 가능 — 신규 상태 관리 최소화 가능
- 모바일 레이아웃은 관전자(`auction-ongoing-spectator.tsx`)만 대상이며, 마스터/캡틴 화면(`auction-ongoing-master.tsx`, `auction-ongoing-captain.tsx`)은 이번 스코프에서 제외 (필요 시 후속 요구사항으로 분리)
- 이전 요구사항(게스트 매물 수기 업로드)은 `.pipeline/docs/requirement-20260701-guest-upload.md`로 보관됨. 그 이전 이력은 `.pipeline/status.json.bak` 참조
- 로그인 무한 새로고침의 근본 원인은 크로스사이트(third-party) 쿠키 구조 자체이며, 이번 스코프의 Authorization 헤더 폴백은 완화책. 프론트/백엔드 도메인을 완전히 통일하는 근본 해결(방안 2)은 배포 인프라(Vercel rewrites 등) 변경이 필요해 별도 후속 요구사항으로 분리 권장
