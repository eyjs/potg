# 코드 리뷰 — 2차 사이클 (경매 인터랙션 고도화)

VERDICT: PASS  (라운드2 재검증 확정 — 라운드1 P1-1 해결, 신규 P0/P1 회귀 없음. 아래 "라운드1" 기록은 이력으로 보존)

- 범위: `git diff 0d5b3ad..HEAD -- frontend/` (task-001~004, 12파일 / +1410 -309)
- 리뷰 일시: 2026-07-03
- 판정 근거: P0 위반 0건. 그러나 **P1 1건**(사이드바 flight-in 진입 애니메이션이 파생 state 1-render 지연으로 미발화) → 규칙상 P1 존재 시 FAIL. P2 5건은 권고.

---

## 자동 게이트 결과 (실행 검증)

| 게이트 | 결과 | 비고 |
|---|---|---|
| `npx tsc --noEmit` | PASS (0 err) | `any` 0건, MotionCard/CSSProperties/WebkitWindow 타입 정상 |
| `eslint .` (변경파일) | PASS (0 err, **1 warn**) | warn 1건 = current-player-card.tsx:143 exhaustive-deps (아래 P2-1). `--max-warnings` 미설정 → exit 0, lint 통과 |
| `vitest run` (신규 2파일) | PASS (8/8) | card-rarity 3건 + bidComboLevel 5건 |
| `npm run build` | PASS | Compiled + TypeScript + 16/16 정적 페이지, exit 0 |

---

## 제약 위반 점검 (전부 통과)

- [x] **`any` 미사용**: tsc 통과 + grep 0건 (엔진의 `as unknown as WebkitWindow`는 표준 webkit 폴백, 허용).
- [x] **신규 npm 패키지 없음**: `frontend/package.json` diff 비어 있음. `react-dom`(createPortal)/`framer-motion`/`lucide`는 기존 의존성.
- [x] **백엔드 무변경**: `git diff --name-only`에 frontend 외 파일 0건.
- [x] **`use-auction-socket.ts` 무변경**: diff 0줄. `useAuctionSound(bidEvents, stageEvent)` 시그니처 유지.
- [x] **shadcn `components/ui/*`·`lib/utils.ts` 무변경**: diff 0줄.
- [x] **Tailwind + 기존 토큰**: `globals.css`는 기존 파일 내 추가만(신규 CSS 파일 없음). `.timer-ember`의 `rgba(249,158,26)`/`rgba(255,70,73)`는 각각 `--ow-orange`/`--ow-red` 값이며, 기존 globals.css가 이미 채택한 rgba-리터럴 관례(예: 골드 `rgba(255,184,0,...)`)와 일치 + motion-spec §3.1이 명시 지정 → 허용.
- [x] **globals.css 추가만**: 신규 키프레임(timer-flame/spark/ember) + `@media (prefers-reduced-motion: reduce)` 블록 내 정지 규칙 추가. 기존 규칙 삭제/변경 없음.
- [x] **오버워치 테마 유지**, **등급 = 코스메틱 해시**(AD-6, id djb2, 실력지표 아님).
- [x] **스코프**: 각 태스크가 소유 파일만 수정. team-sidebar가 `diffNewMemberIds` export를 추가했으나 동일 파일 내(소유 범위) 순수함수 분리로 규약 준수. current-player-card는 team-sidebar/globals.css/socket 미수정.

---

## 기능 정합 점검 (성공 기준 대비)

- [x] **매물 공개 플립 + 결정적 등급 프레임**: `getCardRarity(id)` djb2 해시 결정성(테스트로 검증, 70/25/5 근사), 뒷면(Shield)→`rotateY 0→180`(440ms, cubic-bezier[0.22,1,0.36,1])→정면+`RARITY_FRAME` 적용. 트리거는 `lastPlayer.id` 변경 1회 = 매물 reveal 시점과 동치(WAITING 게이팅 미명시나 회귀 없음).
- [x] **전설 플래시 portal + `playRevealLegendary` 1회**: `createPortal(document.body)` + `typeof document` 가드, `legendaryFiredRef`(id 키)로 중복 가드. 데스크톱 24입자/모바일 12입자, 모바일 플래시 opacity 0.4.
- [x] **입찰 콤보 로컬 계산**: `currentBid.amount` 변경 시각 링버퍼, `COMBO_WINDOW_MS=3000` 윈도우, `bidComboLevel` 임계값(L0:1/L1:2-3/L2:4-5/L3:6+)이 엔진 상수와 **동일 import** → task-001/003/hook 3자 정합. 매물 전환 시 버퍼 명시 리셋(`useEffect([lastPlayer?.id])`).
- [x] **도화선 생명주기**: `wasUrgentRef` 기반 진입(start)/이탈(stop)/언마운트(cleanup stop) 1회씩. 엔진이 `fuseCrackleRunning` 플래그로 중복 방지, `stopFuseCrackle`가 interval clear + source stop/disconnect + gain disconnect. **누수 없음**. `role=timer`/`aria-live`/`aria-label`/`isUrgent`/`isEnded` 로직 무변경, 신규 요소 전부 `aria-hidden`.
- [x] **낙찰 flight-in 규약**: 소스 `flight-card-${lastPlayer.id}` (celebrate==='sold'일 때만), 타겟 `flight-card-${m.id}`, sold player.id==member.id로 일치. 3개 뷰 모두 그리드를 `LayoutGroup`으로 래핑. 유찰은 flight 없음.

## 접근성/반응형 (통과)

- [x] 모든 신규 연출에 reduced-motion 대체: 카드/사이드바 `useReducedMotion()` 분기, 타이머 `@media (prefers-reduced-motion: reduce)`(flame 정지·opacity 0.9, spark display:none). 사운드는 모션 아님 → 유지(spec 일치).
- [x] 모바일 강도 축소: 카드 입자 24→12·shake ×0.5·플래시 0.4, 타이머 스파크 3→2. 타이머 aria 구조 유지. 등급 배지는 색+텍스트 라벨 병기(WCAG 1.4.1).

## 에러 핸들링 (통과)

- [x] 오디오 엔진 전 함수 try/catch + `console.warn`(조용히 삼키지 않음). `unlockAudio`의 resume 실패만 의도적 무시(정상 케이스, 주석 명시).
- [x] SSR 가드: `getAudioContext`/`resolveAudioContextCtor` `typeof window` 체크, createPortal `typeof document` 체크, bid-timer matchMedia useState 초기화 가드. 모듈 레벨 브라우저 API 접근 없음(build 통과로 재확인).

---

## 이슈 목록

### P1 (중요 · 차단) — 1건

**[P1-1] 사이드바 신규 멤버 flight-in 진입 애니메이션이 1-render 지연으로 발화되지 않음**
- 파일: `frontend/src/modules/auction/components/parts/team-sidebar.tsx:69-76` (+ 렌더부 `layoutId`/`initial` 분기)
- 원인: 신규 멤버 판정을 `useEffect([teams])`로 처리 → `setNewMemberIds`는 **커밋 이후** 실행됨. 따라서 `teams`에 신규 멤버 B가 처음 들어오는 렌더에서는 `newMemberIds`가 아직 stale → 그 렌더에서 B는 `isNew=false`로 **마운트**된다(`initial={false}`, `layoutId={undefined}`). 다음 렌더에서야 `isNew=true`가 되지만, framer-motion의 `initial`(진입값)은 마운트 시 1회만 적용되므로 pop/flip-in(`opacity:0, scale:0.6, rotateY:-90`)이 **재생되지 않는다**. `layoutId`도 마운트 1프레임 뒤에 부여되어 카드→슬롯 flight morph 성립이 불확실해진다.
- 결정성: React의 effect-after-commit 규약상 결정적(항상 1렌더 지연). 참고로 same-repo 패턴인 `current-player-card.tsx:115`의 `if (player && player.id !== lastPlayer?.id) setLastPlayer(player)`(렌더 단계 감지)와 대조됨 — 이 파일만 effect 방식이라 지연 발생.
- 영향: task-002 성공기준 "신규 멤버 슬롯이 진입 애니메이션과 함께 나타난다"(사용자 명시 P0 flight-in) 미충족 가능. 데이터/기능/a11y 영향은 없고 멤버 자체는 정상 표기(graceful)되나, P0 핵심 연출이 시각적으로 누락된다.
- 수정 지시(택1):
  1. **렌더 단계 감지로 전환**(권장, current-player-card 패턴과 일관): effect 대신 렌더 중 ref 비교로 `newMemberIds`를 계산해 신규 멤버가 마운트되는 바로 그 렌더에 `isNew=true`가 되도록 한다. 예)
     ```
     const currentIds = teams.flatMap(t => t.members.map(m => m.id))
     const newIds = diffNewMemberIds(previousMemberIdsRef.current, currentIds)
     // 렌더 중 ref 갱신(또는 setState-during-render 패턴)로 즉시 반영
     ```
  2. 최소 수정으로도 가능: `newMemberIds` 계산을 렌더 단계로 올리고 `previousMemberIdsRef`는 `useEffect`에서 커밋 후 갱신하되, 신규 판정만 렌더 시점 값으로 하면 마운트 렌더에 `isNew`/`layoutId`/`initial`이 동시에 붙는다.
- 재검증: 낙찰 반복 시 신규 멤버만 pop/flip-in 재생 + (task-003 소스와) morph. 기존 멤버 무애니메이션 유지 확인.

### P2 (권고) — 5건 (PASS 시 후속)

**[P2-1] current-player-card.tsx:141-144 useMemo exhaustive-deps 경고 — 실제 버그 아님(판정)**
- 경고: "useMemo has a missing dependency: 'lastPlayer'".
- 판정: **실제 버그 아니다.** `rarity`는 `lastPlayer.id`의 순수 함수(`getCardRarity(id)`)이고 그 외 필드는 읽지 않는다. 의존성 `[lastPlayer?.id]`가 출력에 영향을 주는 모든 입력을 완전히 포착한다. `lastPlayer`는 null→player로만 전이(코드상 다시 null이 되지 않음)하며 id가 곧 유일 입력이므로, **잘못된 player로 등급이 계산될 여지가 없다**(id 변경 시에만 재계산, 동일 id면 재계산 불필요가 정상).
- 조치: 형제 useEffect들과 일관되게 `// eslint-disable-next-line react-hooks/exhaustive-deps` 추가 또는 deps에 `lastPlayer` 포함(무해). 경고 1건은 lint exit 0(통과)에 영향 없음.

**[P2-2] flight layoutId 동시 등록 구간(0–1700ms)**
- 파일: `current-player-card.tsx:265`(소스) ↔ `team-sidebar` 타겟.
- sold 셀레브레이션 동안(최대 1700ms) 소스 카드와 사이드바 신규 멤버가 **동일 `flight-card-${id}`를 동시 보유**할 수 있다. framer-motion은 동일 layoutId 2요소에 콘솔 경고 + morph 방향/타이밍 불안정을 유발할 수 있다. 통합 런타임에서 morph 품질 확인 권장(소스 layoutId를 오버레이 exit 직전에만 부여하거나, 타겟 등장 타이밍 조정 고려). status.json R2에 문서화된 리스크와 동일.

**[P2-3] 콤보 자연 만료 타이머가 무관 리렌더에 취소될 수 있음**
- 파일: `current-player-card.tsx:201-234`.
- effect deps `[currentBid, isDesktop, reducedMotion]`. `currentBid` 객체 참조만 바뀌고 `amount`가 같으면 cleanup이 이전 `expireTimer`를 clear한 뒤 가드 early-return으로 **재스케줄하지 않는다**. 부모가 입찰 사이에 `currentBid`를 새 참조로 전달하면 콤보 배지가 `COMBO_WINDOW_MS` 이후에도 다음 실입찰/매물전환 전까지 잔류할 수 있다(매물 전환 시 리셋되므로 영향 제한적). 만료 타이머를 amount 가드와 분리해 스케줄 권장.

**[P2-4] 모바일 ember opacity 상한 미구현**
- 파일: `bid-timer.tsx` ember 오버레이 / `globals.css .timer-ember`.
- motion-spec §3.4는 모바일에서 `.timer-ember` opacity 상한 0.85→0.65 축소를 명시하나, 구현은 `isUrgent`에 따라 opacity-100/0 토글만 하고 모바일 축소가 없다. 스파크 개수(3→2)는 반영됨. 경미.

**[P2-5] 불꽃 팁 색상 `yellow-300`(Tailwind 기본 팔레트) 사용**
- 파일: `bid-timer.tsx:283` `to-yellow-300`.
- 오버워치 토큰이 아닌 Tailwind 기본색(단, 원시 hex 아님). motion-spec이 불꽃 팁 색을 명시하지 않았고 Tailwind 유틸이라 하드코딩 위반은 아니나, 테마 일관성 위해 ow 토큰/정의값 권장. 경미.

---

## 재검증 체크리스트 (implementor)

- [ ] **[P1-1]** team-sidebar 신규 멤버 판정을 렌더 단계로 이동 → 신규 멤버 마운트 렌더에 `isNew=true`/`layoutId`/`initial` 동시 적용. 기존 멤버 무애니메이션, reduced-motion 정적, 모바일 사이드바 미노출 회귀 없음 확인.
- [ ] `cd frontend && npm run lint && npx tsc --noEmit && npm run build && npx vitest run` 전부 통과 유지.
- [ ] (권고) P2-1~P2-5 반영 여부 판단.

---

## 라운드2 재검증 (집중 재검증)

VERDICT: **PASS**

- 범위: `git diff 5c69233 HEAD -- frontend/` (수정 커밋 `a51da01`·`4b2ae15`·`a98d6e9` + 3 머지 커밋, 4파일)
- 재검증 일시: 2026-07-03
- 판정 근거: **P1-1 올바르게 해결**. 신규 P0/P1 회귀 0건. 자동 게이트 전부 통과. 잔여는 라운드1 P2-2/P2-3(런타임 품질 권고, 비차단)만.

### 자동 게이트 (재실행)

| 게이트 | 결과 | 비고 |
|---|---|---|
| `npm run lint` | PASS (0 err, 2 warn) | **P2-1 exhaustive-deps warn 소멸**(eslint-disable 반영). 잔여 warn 2건은 `image-uploader.tsx` `<img>` — 이번 diff 무관 기존 경고 |
| `npx tsc --noEmit` | PASS (0 err, exit 0) | `React.CSSProperties` 인라인 CSS 변수 캐스팅 정상 |
| `npm run build` | PASS (exit 0) | 16/16 정적 페이지 |
| `npx vitest run` | PASS (17/17) | 라운드1 8건 → 17건(테스트 증가), 회귀 0 |

### [P1-1] 신규 멤버 flight-in 진입 애니메이션 — **해결 확인**

`team-sidebar.tsx`: `useEffect([teams])` 파생 state를 **렌더 단계 setState-during-render 패턴**(React 공식 "이전 렌더 정보 저장" 관용구)으로 전환. `useEffect`/`useRef` import 제거.

- **마운트 렌더 동시 적용 ✓**: 신규 멤버 c 추가 시 — (렌더1) `previousMemberIdsKey`("a,b") ≠ `currentMemberIdsKey`("a,b,c") → `added = diffNewMemberIds({a,b}, [a,b,c]) = {c}` 로 `setNewMemberIds` 큐잉. React가 이 렌더 출력을 **커밋 없이 폐기**하고 즉시 재렌더 → (렌더2) 키 일치로 setState 없음, `newMemberIds={c}` 확정. **DOM에 실제 마운트되는 것은 렌더2**이므로 c의 `motion.div`는 마운트 시점에 `isNew=true` → `layoutId=\`flight-card-c\``·`initial={opacity:0,scale:0.6,rotateY:-90}` 가 **동시** 적용된다. 라운드1의 1-render 지연(마운트 시 `initial={false}`) 문제 제거. ✓
- **무한 루프 없음 ✓**: `if (previousMemberIdsKey !== currentMemberIdsKey)` 가드 + `setPreviousMemberIdsKey(currentMemberIdsKey)` 로 다음 렌더에 키가 수렴(false) → setState 정지. 멤버십 불변 리렌더(포인트 변경 등)에는 키 동일 → setState 미발화. 결정적 수렴.
- **초기 마운트 전원 애니메이션 방지 ✓**: `previousMemberIds === null` 가드 유지 → 최초 전체 로드는 `added = ∅`, 기준선만 수립.
- **StrictMode idempotent ✓**: ref 변형을 의도적으로 제거하고 순수 계산 + 가드된 setState만 사용. 이중 렌더에서 부작용 오염 없음(주석에 근거 명시). 신규 판정 소실/중복 없음.
- **flight morph layoutId 규약 유지 ✓**: 소스 `flight-card-${lastPlayer.id}`(celebrate==='sold') ↔ 타겟 `flight-card-${m.id}`(isNew), sold player.id==member.id. 문자열 포맷 diff 무변경.
- 비차단 참고: 멤버십 변경당 렌더 1회 추가 발생(폐기 렌더). 소규모 사이드바에서 무시 가능하며 React 권장 패턴상 정상.

### [P2-4] 모바일 ember opacity 축소 — 반영 확인

`timer-ember-kf` 50% 키프레임을 `opacity: var(--timer-ember-peak-opacity, 0.85)` 로 변경, `bid-timer.tsx`에서 `!isDesktop` 시 인라인 `--timer-ember-peak-opacity: 0.65` 주입. 데스크톱은 fallback 0.85 유지 → 회귀 없음. reduced-motion 블록은 `.timer-ember { animation: none }` 로 애니메이션 정지 상태라 peak 변수 미적용 → 접근성 회귀 없음. ✓

### [P2-5] 불꽃 팁 테마 토큰화 — 반영 확인

`to-yellow-300` → `to-ow-gold`. `--color-ow-gold: var(--ow-gold)`(=`#FFB800`, globals.css:9/114)로 **실존 Tailwind v4 테마 토큰** 확인(동일 파일 다수 사용). 원시 hex 아님, 오버워치 테마 일관성 개선. 그라디언트 회귀 없음. ✓

### [P2-1] useMemo deps 억제 주석 — 적절

`current-player-card.tsx`에 근거 주석 + `// eslint-disable-next-line react-hooks/exhaustive-deps` 추가. 라운드1에서 비버그로 확인된 건이며, lint에서 해당 경고 소멸 확인. 형제 useEffect들과 관례 일치. ✓

### 회귀 점검 (통과)

- reduced-motion: 사이드바 `reducedMotion` 분기(`initial={false}`, `transition duration:0`) 유지, 타이머 정지 규칙 무변경. ✓
- aria/role: diff 내 aria/role 변경 0건(ember 오버레이는 여전히 `aria-hidden` 계열 장식). ✓
- isUrgent/isEnded: `bid-timer.tsx` 로직 미변경, 인라인 style·그라디언트 토큰만 추가. ✓
- 3뷰 공유: `team-sidebar` 렌더단계 state는 인스턴스 내 자기완결 — 뷰 간 결합/누수 없음. ✓

### 남은 이슈 (비차단 · 후속 권고)

- **P2-2**(라운드1): sold 셀레브레이션 0–1700ms 소스/타겟 `flight-card-${id}` 동시 등록 구간 — 코드 미변경. 런타임 morph 품질 관찰 권고(status.json R2 리스크와 동일). PASS 비차단.
- **P2-3**(라운드1): 콤보 자연 만료 타이머가 `currentBid` 참조 변경 시 재스케줄 누락 — 코드 미변경. 매물 전환 리셋으로 영향 제한. PASS 비차단.

### 결론

P1-1(P0 flight-in 연출)이 렌더 단계 판정으로 정확히 해결됐고, P2-4/P2-5/P2-1 폴리시가 회귀 없이 반영됐다. 신규 P0/P1 회귀 없음, 자동 게이트 4종 전부 통과 → **PASS**. Integrator 단계 진행 가능.
