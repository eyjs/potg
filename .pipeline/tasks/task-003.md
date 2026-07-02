# Task 003: current-player-card 통합 연출 (공개 + 입찰/콤보 + 골든카드/flight 소스)

## 메타데이터
- 복잡도: XL
- 병렬그룹: B (Group A 머지 후 실행)
- 의존:
  - task-001 (오디오 엔진) — `playRevealLegendary` import + 콤보 상수(`COMBO_WINDOW_MS`, `bidComboLevel`) 공유 **필수 선행**
  - task-002 (LayoutGroup/사이드바 타겟) — layoutId **문자열 규약**으로 결합(코드 import 아님), Group A에서 이미 머지됨
- 변경 파일 (충돌 방지용):
  - 수정(배타 소유): `frontend/src/modules/auction/components/parts/current-player-card.tsx`
  - 신규(배타 소유): `frontend/src/modules/auction/components/parts/card-rarity.ts`
  - 읽기전용: `frontend/src/modules/auction/hooks/auction-audio-engine.ts` (task-001, import만), `frontend/src/app/globals.css` (task-004, 기존 클래스 재사용만)

## 목적
매물 카드 하나에 수렴하는 3개 기능(공개=팩 오프닝 / 입찰=카드 임팩트·콤보 / 낙찰=골든카드·flight 소스)을 **단일 소유 파일**에서 순차 구현한다. 파일 전체를 이 태스크가 배타 소유해 병렬 충돌을 원천 차단한다.

## 배경 / 현재 구조 (검증 완료)
- Props = `player, currentBid, biddingPhase, stageEvent` (**bidEvents 미수신** — AD-3에 따라 추가하지 않음).
- 매물 전환 감지: `lastPlayer` state(63-64행). 낙찰/유찰: `seenSeq`/`celebrate`(66-76행), 1700ms 후 해제(72-76행). `displayPlayer`(79행).
- 아바타: 136-158행(`portraitByKey.get(hero) ?? avatarUrl`). 입찰가 패널: 203-227행(`bid-pop` 210-216행). 낙찰 오버레이: 231-310행(`celebrate==='sold'` 골드 / else 레드). `BURST_PARTICLES`(36-44행).
- 카드 컨테이너 `overflow-hidden` + `.game-panel` clip-path(108행) → **전체화면 플래시는 `createPortal(document.body)` 필요**.
- 재사용 가능한 기존 CSS 클래스(globals.css, 수정 없이): `.flash-burst`, `.burst-particle`(`--burst-x/--burst-y`), `.ring-expand`, `.bid-pop`, `.float-slow`.

## 구현 방식 (3단계 순차)

### 단계 1 — P0-1 매물 공개 (팩 오프닝)
- **등급 산정 유틸(`card-rarity.ts` 신규)**: `player.id` 문자열 결정적 해시 → `'common'|'rare'|'legendary'` (배분 70/25/5). 순수 함수 `getCardRarity(id: string): CardRarity`. 시드 고정(같은 매물 = 항상 같은 등급). 실력 지표 아님(코스메틱).
- **플립**: 매물 전환 감지(`lastPlayer` 패턴 확장) + `biddingPhase==='WAITING'` 구간에서 카드 뒷면(엠블럼/실루엣) → `framer-motion` 3D `rotateY` → 정면(대표 영웅 아트) 공개. 전환은 새 `player.id`에만 1회.
- **등급 프레임**: 등급별 CSS 클래스(`border-*`, `drop-shadow-*` — 오버워치 토큰: common=시안 약, rare=블루/퍼플, legendary=골드 강 글로우)로 아바타 테두리·카드 외곽에 적용. 등급 배지 문구는 게임적 표현("레전더리 카드" 등).
- **전설급 연출**: 등급 `legendary`일 때 공개 순간 (1) 전체화면 플래시 — `createPortal`로 `position:fixed inset-0` 오버레이(기존 `.flash-burst` 또는 framer-motion opacity 펄스 + radial-gradient) (2) 파티클 — `BURST_PARTICLES` 패턴 확대(개수/반경) (3) 사운드 — task-001 `playRevealLegendary()` 1회 호출(중복 방지 = 전환 감지 1회 트리거).

### 단계 2 — P0-2 입찰 임팩트 + 콤보
- **콤보 로컬 계산(AD-3)**: `currentBid.amount` 변경 시각을 로컬 링버퍼(`useRef<number[]>`)에 push. 콤보 = `COMBO_WINDOW_MS`(3000, task-001과 동일 상수) 내 개수. 매물 전환(새 `lastPlayer`) 또는 윈도우 만료 시 리셋. 단계는 task-001 `bidComboLevel`과 **동일 임계값**(L0:1, L1:2~3, L2:4~5, L3:6+).
- **금액 임팩트**: 입찰가 패널(210-216행)의 금액 텍스트가 "꽂히는" 애니메이션 — framer-motion 스케일 오버슈트 + 짧은 회전(기존 `bid-pop` key 리마운트와 병행/대체). currentBid.amount 변경 시 발화.
- **미세 화면 흔들림**: 카드 컨테이너를 `motion` 래핑 → 입찰 시 `x` 4~6px, 80~120ms 흔들림. 강도는 콤보 단계에 비례. **모바일(<lg)은 강도 축소 또는 생략**(뷰포트 폭 `matchMedia('(min-width:1024px)')` 체크). reduced-motion 시 생략.
- **콤보 배지**: 콤보 ≥2일 때 배지 표시(예: "COMBO x3"), 단계별 색/크기 상승. 무입찰/전환 시 사라짐.

### 단계 3 — P0-4 낙찰 골든카드 + flight 소스
- 기존 `celebrate==='sold'` 블록(230-310행) **확장**: 골든 카드 변신(테두리/배경 골드 그라데이션 전이) 애니메이션 단계 추가. 사운드(task-001 `playSoldSound`)와 타이밍 동조는 이미 훅에서 발화되므로 시각만 동조.
- **flight 소스**: 셀레브레이션의 골든 카드(또는 아바타) 요소에 `layoutId={`flight-card-${lastPlayer.id}`}` 부여 → task-002의 사이드바 신규 멤버(`flight-card-${member.id}`)와 공유 morph. 셀레브레이션 종료(오버레이 언마운트) 시 framer-motion이 카드 위치 → 슬롯 위치로 보간 이동.
- 유찰(`celebrate==='pass'`)은 flight 없음(기존 레드 연출 유지).

### 공통 — 접근성/모바일
- `useReducedMotion()`(framer-motion) 또는 `matchMedia`로 reduced-motion 시 플립/흔들림/파티클/flight 생략, 정적 등급 프레임·정적 골드 테두리·즉시 상태 반영은 유지.
- 모바일: 흔들림 강도 축소·전설 플래시/파티클 개수 축소.

## 성공 기준
- [ ] 새 매물 공개 시 뒷면→플립→정면(대표 영웅 아트), id 결정적 등급(일반/레어/전설) 프레임 표시.
- [ ] 전설급 공개 시 전체화면 플래시(portal, 카드 clip에 안 잘림) + 파티클 + `playRevealLegendary` 1회(중복 없음).
- [ ] 입찰 시 금액 임팩트 애니메이션 + 미세 화면 흔들림 발생.
- [ ] 연속 입찰 시 콤보 배지 증가 + 단계별 흔들림/스케일 상승, 매물 전환·무입찰 시 리셋. (사운드 피치는 task-001 담당, 동일 상수로 일치.)
- [ ] 낙찰 시 골드 변신 + `flight-card-${lastPlayer.id}` 소스 layoutId 부여(사이드바 타겟과 morph).
- [ ] `prefers-reduced-motion`에서 플립/흔들림/파티클/flight 생략, 정적 대체.
- [ ] 모바일에서 흔들림·전설 플래시/파티클 강도 축소.
- [ ] Props 시그니처 무변경(bidEvents 미추가) → 뷰 파일 수정 0. `any` 미사용. `cd frontend && npm run lint && npm run build` 통과.

## 테스트 요구사항
- 단위 테스트: `getCardRarity(id)` 결정성(동일 id 반복 = 동일 등급) + 배분 분포(대량 id 샘플에서 70/25/5 근사). 콤보 카운트 순수 로직(윈도우 경계).
- 수동 검증: 매물 전환 반복(플립·등급), 전설 매물(플래시/사운드 1회), 연속 입찰(콤보/흔들림), 낙찰(골드+flight, task-002 머지 후 통합에서 morph 확인), reduced-motion, 모바일 축소.

## 제약사항
- 뷰 파일·`team-sidebar.tsx`·`globals.css`·`use-auction-socket.ts` 수정 금지(각 소유 태스크 존재). globals.css는 기존 클래스 재사용만.
- 신규 npm 패키지/신규 CSS 파일 금지. `any` 금지. shadcn/`lib/utils.ts` 수정 금지.
- 등급은 코스메틱 해시(실데이터 tier/MMR 금지). 오버워치 테마/토큰 유지.
- 콤보 상수는 task-001과 반드시 동일(`COMBO_WINDOW_MS=3000`, L0~L3 임계값).
</content>
