# 코드 리뷰 — 경매 고도화 (task-001 ~ 004)

## Verdict: PASS

리뷰 범위: `git diff 9f25f99..HEAD -- frontend backend` (4개 태스크 브랜치 통합본)
리뷰 일시: 2026-07-02 / Reviewer (read-only)

금지 파일 변경 없음 확인: `components/ui/*`, `lib/utils.ts`, `*.entity.ts` 미접근. 변경 파일 12개 전부 각 태스크 배정 범위 내.

---

## task-001 효과음 (use-auction-sound.ts + use-auction-socket.ts 1줄 배선) — PASS

검증 통과:
- stageEvent.seq 패턴 재사용 확인 — 낙찰/유찰은 `stageEvent.seq` 증가 시 1회 재생, 입찰은 `bidEvents` 마지막 이벤트 `kind:'bid'`에만 반응. `kind:'sold'` bidEvent는 무시하여 stageEvent와 이중재생 없음.
- 신규 소켓 이벤트/리스너 추가 없음. `useAuctionSound(bidEvents, stageEvent)` 훅 최상위 무조건 호출(hooks 규칙 준수), import 1줄뿐.
- 과거 이벤트 소급 재생 방지: 마운트 시 `lastBidEventIdRef`=현재 마지막 id, `lastStageSeqRef`=`stageEvent?.seq ?? 0`로 시드.
- 모바일 autoplay unlock: 최초 `pointerdown`/`touchstart` `{ once:true }`에서 `AudioContext.resume()`, cleanup 리스너 제거 포함.
- 타입 명시적, `any` 없음 (`SoundKind`/`ToneConfig`/`OscillatorType`/`WebkitWindow` 인터페이스, `as unknown as` 캐스트만 사용).
- 의도적 에러 삼킴만 존재(playTone catch, resume catch) — autoplay 차단 대응으로 정상.

nit (비차단):
- 효과음이 관전자뿐 아니라 마스터/캡틴 화면에서도 재생됨(`useAuctionSocket` 공용). 요구사항상 전원 청각 피드백이 목표라 문제 아님 — 참고용.
- 입찰 effect가 배치된 다중 bid 이벤트 중 마지막 1건만 재생. 급속 연속 입찰 시 블립 1회로 합쳐짐 — 허용 가능.
- 리셋(seq→null) 후 새 seq가 이전 ref와 우연히 동일할 경우 낙찰/유찰음 1회 누락 가능. 엣지, 비차단.

## task-002 결과 이미지 생성 안정화 (auction-completed.tsx) — PASS

검증 통과:
- 실제 `console.error(...)` 로깅 추가 (1차 시도 실패 + 최종 실패 catch 양쪽).
- `await document.fonts.ready` 캡처 전 대기.
- `skipFonts: true` 적용 — cross-origin stylesheet cssRules 접근 SecurityError 경로 원천 차단.
- 300ms 지연 후 1회 자동 재시도(`captureResultImage` 재호출), 재시도까지 실패 시 최종 catch.
- 명확한 실패 토스트: "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." (handleApiError→toast.error).
- 포스터 템플릿 미변경(auction-completed.tsx 한 파일만 수정), 백엔드 변경 없음, 신규 라이브러리 없음.

nit (비차단):
- `skipFonts: true`와 `document.fonts.ready` 대기는 일부 중복 성격(폰트 임베딩을 스킵하므로). 다만 DOM 렌더 메트릭 안정화 목적상 대기 유지가 무해하고 task 요구사항이 둘 다 명시 — 유지 적절.
- 폰트 임베딩 스킵으로 캡처 이미지 폰트가 시스템 폰트로 대체될 수 있음. task-002 성공기준상 육안 확인 결과를 핸드오프에 기록하도록 되어 있으니 통합 검증 시 확인 권장.

## task-003 모바일 관전자 레이아웃 (auction-ongoing-spectator.tsx) — PASS

검증 통과:
- 데스크톱 그리드 `<div className="grid grid-cols-12 gap-4">` → `hidden lg:grid grid-cols-12 gap-4`로만 변경, 내부 JSX(TeamSidebar/CurrentPlayerCard/BidLog/PlayerStatusGrid/ChatPanel) 전부 그대로 — 회귀 없음.
- `lg:hidden flex flex-col gap-4 min-h-[calc(100dvh-10rem)]` 모바일 블록 추가: 상단 `shrink-0`에 CurrentPlayerCard(또는 배정중 카드), 하단 `flex-1 min-h-0`에 ChatPanel.
- 모바일에서 TeamSidebar/BidLog/PlayerStatusGrid 미렌더 확인.
- 신규 props/소켓 없음, 라우팅 변경 없음.
- 디자인 토큰 재사용(`bg-card`/`border-border`/`text-muted-foreground`), 하드코딩 색상 없음. Tailwind arbitrary value만 사용, 별도 CSS 파일 없음.
- BidTimer는 공용 헤더 카드(모바일/데스크톱 공통 렌더)에 존재 → 모바일에서도 타이머 노출됨(요구사항 충족).

nit (비차단):
- line 95 `stageEvent={stageEvent}` 들여쓰기 어긋남은 기존 코드(데스크톱 블록)로 이번 변경분 아님. 비차단.

## task-004 로그인 무한 새로고침 수정 (backend auth + frontend auth) — PASS

검증 통과 (백엔드):
- `jwt.strategy.ts`: `ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()])` — 쿠키 우선 → Bearer 폴백. 기존 쿠키 인증 경로 보존(회귀 없음).
- `auth.controller.ts`: 로그인 응답 바디 `{ ok: true, access_token }` 반환. XSS 트레이드오프 주석 명시(응답 바디 노출/localStorage 저장 위험, 근본해결=동일사이트 도메인 통합은 별도 과제).
- `auth.service.ts`: 반환 타입 `Promise<{ access_token: string }>` 명시.
- 테스트: `jwt.strategy.spec.ts` 신규 — 쿠키 우선(회귀 방지)/Bearer 폴백/둘 다 없음(null) 3케이스 커버, `any` 미사용(`as unknown as` 타입 단언). `auth.controller.spec.ts` access_token 병행 반환 검증으로 갱신.

검증 통과 (프론트):
- `lib/api.ts`: request 인터셉터가 `typeof window !== 'undefined'` 가드 후 localStorage 토큰을 `Authorization: Bearer`로 첨부(SSR 안전). `withCredentials` 유지로 쿠키 병행 전송. `ACCESS_TOKEN_STORAGE_KEY` export.
- `auth-context.tsx`: login이 응답 access_token을 `typeof window` 가드 후 localStorage 저장, `fetchUser()`가 `User|null` 반환, `!fetchedUser` 시 `throw`로 실패 표면화(무한 루프 차단). logout이 토큰 clear(가드 포함). fetchUser는 context 인터페이스 미노출이라 반환타입 변경이 타입 파괴 없음.
- `login/page.tsx`: 성공(세션 확인 포함) 시에만 `router.replace("/")`. 실패 시 페이지 잔류 + 토스트. `isAxiosError`로 자격증명 401(AxiosError)과 세션확인 실패(plain Error) 구분해 각각 명확한 메시지. 로그인 실패를 삼키지 않음 확인.

Security 관점: access_token 응답 바디 노출 + localStorage 저장(XSS 표면 확대)은 주석으로 명시 acknowledge됨. 쿠키 우선 추출이므로 기존 인증 회귀 없음, SSR 가드 존재. 완화책임이 문서화되어 수용 가능.

nit (비차단):
- localStorage 토큰은 브라우저 탭에 계속 잔존 → logout에서만 제거. 근본해결(동일사이트 도메인)은 요구사항/주석대로 후속 과제로 분리 기록됨. 추적용 참고.

---

## 종합
4개 태스크 모두 각 태스크 배정 파일만 수정, CLAUDE.md 컨벤션(no any / Tailwind+cn / kebab-case / PascalCase / 금지파일 미접근) 준수, 에러 핸들링 적절(의도적 삼킴만 존재, 로그인 실패 표면화), task-004 백엔드 스펙 테스트 포함. 차단 이슈 없음 → PASS.
통합 단계 권장 수동 확인: (1) task-002 캡처 폰트 육안 확인, (2) 시크릿 모드 로그인 정상 진입, (3) `cd frontend && npm run lint && npm run build`, `cd backend && npm test` 통과.
