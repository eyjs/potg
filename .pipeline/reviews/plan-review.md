# 계획 리뷰 결과 (plan-review)

## Verdict: PASS

리뷰어: Reviewer (opus, plan-review 모드, read-only)
대상: `.pipeline/plan.md`, `.pipeline/tasks/task-001~004.md`
기준: `.pipeline/requirement.md`, 프로젝트 `CLAUDE.md`, 글로벌 review-criteria.md
일시: 2026-07-02

---

## 종합 판정
4개 P0가 파일 교집합이 공집합인 4개 태스크로 정확히 분할되었고, 병렬 그룹 A 동시 실행이
실제 소스 대조로 검증되었다. 로그인 토큰 계약(백엔드 body access_token ↔ jwt.strategy 이중 추출
↔ 프론트 Bearer)이 실제 코드 상태와 일치하며 쿠키 회귀 위험이 통제되었다. **승인.**

---

## 기준별 findings

### 1. P0 항목 전부 포함? — PASS
- P0-1 효과음 → task-001, P0-2 이미지 생성 → task-002, P0-3 모바일 관전자 → task-003,
  P0-4 로그인 루프 → task-004. 4/4 매핑 완전. 누락 없음.
- 제외 항목(캡틴/마스터 모바일 조작 UI, 음소거/볼륨 P1·P2, 이미지 템플릿 디자인 변경,
  도메인 통일 방안 2, 게스트 업로드)이 plan 스코프에 명시적으로 제외 처리됨. requirement와 일치.

### 2. 태스크 분할 적절? — PASS
- 각 태스크 자기완결적, 복잡도 M/M/L/M로 균형. 과대·과소 분할 없음.
- task-004가 6파일(BE 3 + FE 3)로 가장 크지만, "login body ↔ 프론트 저장/Bearer ↔ jwt.strategy 헤더 추출"이
  단일 계약으로 얽혀 있어 분할 시 태스크 간 계약 의존이 생긴다는 아키텍처 결정 근거가 타당. 단일 worktree 소유가 옳다.

### 3. 의존성 그래프 — PASS
- 4개 태스크 상호 의존 0, 전부 그룹 A. 유일 선행은 Design→task-003 (모바일 스펙 공급).
- task-001/002/004는 Design 무관하게 시작 가능하다는 서술 정확. 순환 의존 없음.

### 4. 병렬 그룹 파일 충돌 — PASS (실제 소스 대조 검증 완료, CRITICAL 항목)
편집(edit) 파일 집합 교차검증 결과 교집합 공집합 확인:
- task-001 edit: `use-auction-sound.ts`(신규), `public/sounds/*`(신규), `use-auction-socket.ts`
- task-002 edit: `auction-completed.tsx`, `auction-result-poster.tsx`, (조건부)`auctions.controller.ts`
- task-003 edit: `auction-ongoing-spectator.tsx` (단일)
- task-004 edit: `jwt.strategy.ts`, `auth.controller.ts`, `auth.service.ts`, `api.ts`, `auth-context.tsx`, `login/page.tsx`
→ 어떤 파일도 두 태스크에 동시 소속되지 않음.

**`use-auction-socket.ts` 클레임 검증 (요청 사항):**
- 실제 소스 확인: `use-auction-socket.ts`는 `AuctionChatMessage`/`AuctionBidEvent`/`AuctionStageEvent`
  인터페이스를 export하며, `auction-ongoing-spectator.tsx`(003 대상)를 포함한 다수 컴포넌트가 이 타입들을 **import**한다.
- 태스크 파일 대조: task-001만 이 파일을 edit 목록에 포함. task-002/003/004는 edit 목록에 없음
  (003은 type import만, 002의 `auction-completed.tsx`는 애초에 이 파일을 import조차 하지 않음).
- **결론: "task-001만 수정, 나머지는 import만" 클레임 사실 확인됨.** import는 머지 충돌을 유발하지 않으므로 4-way 병렬 안전.

### 5. 제약사항이 각 태스크에 반영? — PASS
- `any` 금지: 4개 태스크 전부 명시.
- Tailwind + `cn()`만: task-003 명시(하드코딩 색상/간격 금지, 4px 배수). 001/002는 "로직만·시각변경 없음"으로 무해.
- 금지 파일 미접근: `components/ui/*`·`lib/utils.ts`(001/002/003 명시), `*.entity.ts`(002/004 명시). 위반 없음.
- 오버워치 테마 유지: 001(절제된 UI SFX)/002/003 명시.
- CC0 사운드: task-001에 CC0/퍼블릭도메인 한정 + 출처 기록 필수 명시.
- 신규 소켓 이벤트 금지: task-001(리스너 구조 변경 금지, 배선 1줄만)/task-003(새 prop·소켓 로직 금지) 명시.
- auth 최소 침습·쿠키 무회귀: task-004에 "쿠키 우선 + 헤더 폴백", "auth 3파일 외 접근 금지", 소켓 파일 미접근 명시.

### 6. 명확한 acceptance criteria? — PASS
- 4개 태스크 모두 체크박스형 성공 기준 보유. lint/build 게이트 공통 포함, task-004는 `cd backend && npm test`까지 포함.
- 성공 기준이 requirement.md 성공 기준과 정합(모바일 375~430px, 시크릿 진입, 소급 재생 방지, 반복 다운로드 일관 성공 등).

### 7. 로그인 태스크(004) — 쿠키 무회귀 + 토큰 계약 정합 — PASS (실제 코드 대조)
- **현재 코드 사실 확인:**
  - `jwt.strategy.ts`: `jwtFromRequest: cookieExtractor` (쿠키 단독) — 태스크 서술과 일치. 확장 대상 정확.
  - `auth.controller.ts` `login()`: `res.cookie(...)` 후 `return { ok: true }` — 태스크의 "쿠키 set 유지 + body에 access_token 추가" 방향 정합. `tokens.access_token`이 스코프 내 존재해 body 확장 가능.
  - `auth.service.ts` `login()`: 이미 `{ access_token }` 반환 — "대개 무변경" 서술 정확, 계약 정합.
  - `api.ts`: `withCredentials: true` + 응답 인터셉터만 존재. 요청 인터셉터(Bearer 첨부) 신규 추가 방향 정합.
- **회귀 안전성:** `ExtractJwt.fromExtractors([cookieExtractor, fromAuthHeaderAsBearerToken()])`로 쿠키 우선 → 기존 쿠키 경로 무회귀. 컨트롤러 쿠키 set 유지 + 소켓 인증(withCredentials 쿠키) 파일 미접근으로 소켓 경로 무영향. 계약 전 구간 일관.
- **루프 해소 논리:** 헤더 폴백으로 `user` 정상 세팅 시 `app/page.tsx`/`auth-guard.tsx`의 `!user` 리다이렉트가 근본 해소되고, 실패 시엔 표면화(throw/false)로 로그인 페이지 잔류 + 안내 토스트 → 무한 왕복 제거. 논리 타당.

---

## 비차단(non-blocking) 제안 — 승인에 영향 없음, Implementor 참고
1. **[004] 새로고침/마운트 시 세션 복원 경로 명시 권장.** localStorage 토큰은 `api.ts` 요청 인터셉터가 매 요청 첨부하므로 auth-context 마운트 시 `fetchUser()`에도 자동 적용되어 하드 리프레시 후 세션 복원이 동작할 것으로 보이나, 태스크에 "마운트 시 Bearer로 세션 복원 확인"을 수동 검증 시나리오(4)에 추가해 두면 회귀 누락을 방지할 수 있음.
2. **[004] 토큰 스토리지 선택지 주석화.** XSS 노출면을 낮추려면 localStorage 대신 in-memory + refresh 재획득도 후보이나, 현 스코프(최소 침습)에서는 localStorage로 충분. 이미 트레이드오프 주석 요구가 있으므로 그대로 진행하되, 후속 과제(방안 2 도메인 통일)와 연결해 기록하면 좋음.
3. **[001] master/captain 뷰에도 효과음이 재생됨(공유 훅).** requirement 대상이 "전원"이라 의도에 부합하나, 진행자 화면에서 과도하게 잦은 입찰음이 방해가 될 여지가 있음 — P1 음소거 토글 도입 전까지는 수용 가능. 리뷰 참고용.
4. **[001/002/003] 프론트 자동 테스트 면제.** 오디오/canvas/레이아웃 특성상 단위 테스트 면제 + 수동 검증 시나리오 문서화는 합리적. 다만 글로벌 "새 기능=테스트" 규칙 관점에서, 최소한 `use-auction-sound`의 순수 로직(seq/id 추적으로 "1회만 발화" 판정) 부분은 오디오 재생을 주입 가능하게 분리하면 경량 단위 테스트가 가능함 — 여력 시 권장(비필수).
5. **[002] `skipFonts`/`fontEmbedCSS` 채택 여부는 실측 후 결정하도록 이미 조건부로 기술됨.** 채택 시 캡처 폰트 시스템 대체 육안 확인 결과를 핸드오프에 반드시 남길 것(성공 기준에 이미 포함).
6. **[003] Design 선행 게이트.** task-003은 Design 산출물(간격/breakpoint/채팅 높이/sticky) 소비가 필수 조건이므로, Integrator/Orchestrator는 Design 미완 시 003 착수를 보류할 것.

---

## 결론
차단 이슈 없음. 병렬 그룹 A 4-way 동시 실행 및 Design→003 선행 구조 승인.
Designer(003 스펙) 및 Implementor ×4 착수 가능.
