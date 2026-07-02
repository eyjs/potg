# 모션 스펙 — 2차 사이클 (경매 인터랙션 고도화)

> 대상: `current-player-card.tsx`(task-003), `bid-timer.tsx`+`globals.css`(task-004), `team-sidebar.tsx`+뷰 3개(task-002)
> 전제: framer-motion 재사용(신규 패키지 금지), 기존 `globals.css` 키프레임 확장(신규 CSS 파일 금지), 오버워치 토큰만 사용.
> 공유 상수: `COMBO_WINDOW_MS = 3000`(task-001 `auction-audio-engine.ts`에서 export, task-003 카드 로컬 계산과 동일 값 사용).
> 색 토큰: `--ow-gold #FFB800`, `--ow-orange #f99e1a`, `--ow-blue #00c3ff`, `--ow-red #ff4649`, `--stage-cyan #00c3ff`, `--stage-gold #ffb800`.

---

## 0. 공통 원칙

| 항목 | 규칙 |
|---|---|
| 애니메이션 속성 | transform/opacity/filter 중심(GPU 가속). `width`/`background-color`는 기존 코드(게이지)만 유지, 신규 연출에서 layout 트리거 속성 남발 금지 |
| reduced-motion 판정 | framer-motion 트리(카드/사이드바) = `useReducedMotion()` 훅. CSS 전용(타이머 불꽃) = `@media (prefers-reduced-motion: reduce)` |
| 모바일 판정 | `window.matchMedia('(min-width: 1024px)')` (Tailwind `lg` 기준과 동일) — `false`면 축소/생략 |
| 사운드-모션 동조 | 사운드는 reduced-motion에 영향받지 않음(모션 아님). 모션만 생략/정지 |
| 간격/사이즈 | 4px 배수(px 단위 신규 수치는 모두 4의 배수로 반올림) |

---

## 1. 매물 공개 = 팩 오프닝

대상: `current-player-card.tsx` 단계 1(P0-1). 트리거: `player.id !== lastPlayer?.id`이고 `biddingPhase === 'WAITING'`(새 매물 진입 시 1회).

### 1.1 타임라인 (ms, t=0을 전환 감지 시점으로)

| t (ms) | 이벤트 | 지속 | 비고 |
|---|---|---|---|
| 0 | 카드 뒷면(엠블럼/실루엣) 표시 시작 | — | `AnimatePresence mode="wait"` 또는 flip 컨테이너 진입 |
| 0–120 | 뒷면 진입 페이드/스케일 | 120ms | `opacity 0→1`, `scale 0.94→1`, ease `cubic-bezier(0.16,1,0.3,1)` |
| 120–560 | **3D 플립** (`rotateY`) | 440ms | 아래 1.2 참조 |
| 560 | 정면(아바타/영웅 아트) 노출 완료 | — | 등급 프레임 페이드인 시작 |
| 560–760 | 등급 프레임(테두리/글로우) 페이드인 | 200ms | `opacity 0→1`, `box-shadow` 강도 보간 |
| 560(legendary only) | 전설 시퀀스 트리거(§1.3) | — | 플립 완료와 동시 발화, 병렬 |

### 1.2 3D 플립 스펙

- 대상: 아바타를 감싼 wrapper (`motion.div`, `style={{ transformStyle: 'preserve-3d', perspective: 1000 }}` 부모에 배치)
- 뒷면 → 정면: `rotateY: 0 → 180` (뒷면 요소는 `rotateY(0deg)`, 정면 요소는 내부에서 `rotateY(180deg)`로 미리 뒤집어 배치해 최종적으로 정방향 노출되는 표준 flip-card 기법)
- duration: **440ms**, easing: `cubic-bezier(0.22, 1, 0.36, 1)` (deceleration, 팩 오프닝 특유의 "훅 감는" 느낌)
- framer-motion 표기:
```
transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
animate={{ rotateY: isRevealed ? 180 : 0 }}
```
- 뒷면 콘텐츠: 카드 실루엣 + 엠블럼(오버워치 `--ow-blue` 톤 다이아몬드 아이콘) — 신규 이미지 에셋 없이 CSS 그라디언트 + lucide 아이콘으로 대체(예: `Gavel`/`Shield` 아이콘 45% 투명도).
- 플립 중 미세 그림자: `box-shadow: 0 0 24px rgba(0,195,255,0.25)`가 `rotateY 90deg` 부근(t≈340ms)에서 피크(하이라이트 스윕 느낌). 구현: `useTransform`으로 rotateY progress 0.5 부근 boost, 또는 간단히 CSS `filter: brightness()` keyframe 대체 가능(선택적 디테일, 필수 아님).

### 1.3 등급 프레임 (일반/레어/전설)

세부 색상/보더/글로우 수치는 `rarity-frame-spec.md` 참조. 여기서는 타이밍만:

- 프레임 자체는 **정적 CSS 클래스**(등급별 고정) — 플립 완료(t=560ms) 시점에 `opacity 0→1, duration 200ms, ease-out`으로 페이드인.
- 전설(legendary) 한정: 프레임 글로우에 은은한 breathing 애니메이션 추가 가능 — 기존 `.pulse-glow`(`animation: pulse-glow 2s ease-in-out infinite`) 재사용(신규 키프레임 불필요, box-shadow 색만 `--ow-gold`로 이미 고정되어 있어 그대로 재사용).

### 1.4 전설 공개 시퀀스 (legendary only, t=560ms 발화)

3요소가 **동시 발화, 병렬 진행**(순차 아님 — 임팩트를 위해 동시 터짐):

| 요소 | 구현 | 타이밍 |
|---|---|---|
| ① 전체화면 플래시 | `createPortal(document.body)`로 `position: fixed; inset:0; z-index:9999` 오버레이. 기존 `.flash-burst` 클래스 재사용(`flash-burst-kf` 0.9s ease-out, opacity 0→1(18%)→0). 배경: `radial-gradient(circle at 50% 45%, rgba(255,184,0,0.6) 0%, transparent 60%)` (골드, 낙찰 연출과 구분 위해 중심색 골드+화이트 믹스 가능: `rgba(255,224,140,0.65)`) | duration 900ms, `pointer-events: none` |
| ② 파티클 버스트 | 기존 `BURST_PARTICLES` 패턴 확대: 개수 12→**24**, 반경 `90+((i%3)*34)` → **140+((i%4)*46)** (더 크고 멀리). `.burst-particle` 클래스 그대로 재사용(`burst-particle-kf` 0.9s `cubic-bezier(0.16,1,0.3,1)`). 색상 `--ow-gold`, `box-shadow: 0 0 10px rgba(255,184,0,0.95)` | duration 900ms, `animationDelay: (i%6)*0.03s` |
| ③ 사운드 | `playRevealLegendary()` (task-001 엔진, import). 카드 전환 감지 1회만 호출(중복 방지: 동일 `useEffect`/ref 가드로 `lastPlayer.id` 변경 시 1회) | t=560ms 즉시 |

- 전체 시퀀스 종료: t=560+900=**1460ms**(플래시/파티클 종료), 그 이후 카드는 평시 상태(등급 프레임만 유지).
- **모바일 축소**: 파티클 24→**12**(원래 개수), 반경 확대 없이 원래 90+((i%3)*34) 유지. 플래시 오버레이 opacity 최대치 0.6→**0.4**(전체화면 자극 저감).
- **reduced-motion**: 플립 생략(즉시 정면 상태로 렌더, `rotateY` 애니메이션 없이 최종값 적용) + 플래시/파티클 전체 생략. 등급 프레임은 **정적으로 즉시 표시**(breathing pulse도 정지 — `.pulse-glow` 자체가 프로젝트 전역 reduced-motion 블록엔 미포함이므로 legendary 전용 pulse는 카드 컴포넌트 레벨에서 `useReducedMotion()` 분기로 애니메이션 클래스 미부착). 사운드(`playRevealLegendary`)는 그대로 재생.

---

## 2. 입찰 카드 임팩트 + 콤보

대상: `current-player-card.tsx` 단계 2(P0-2). 트리거: `currentBid.amount` 변경.

### 2.1 콤보 계산 규약 (task-001과 동일, AD-3/R4)

- `COMBO_WINDOW_MS = 3000`
- 로컬 링버퍼(`useRef<number[]>`)에 `currentBid.amount` 변경 시각 push, 오래된(윈도우 밖) 항목 제거 후 길이 = 콤보 count.
- 매물 전환(`lastPlayer.id` 변경) 또는 3000ms 내 입찰 없음(윈도우 자연 만료) 시 count 리셋(버퍼가 비므로 자동 리셋, 별도 처리 불필요하나 매물 전환 시 버퍼 명시적 clear 권장).

### 2.2 콤보 단계 테이블 (task-001 `bidComboLevel`과 동일 임계값)

| 단계 | count 범위 | 배지 표기 | 배지 색 | 배지 scale | 흔들림 진폭 | 흔들림 duration | 스탬프 오버슈트 scale | 사운드(참고, task-001) |
|---|---|---|---|---|---|---|---|---|
| L0 | 1 | (배지 미표시) | — | — | 4px | 80ms | 1.15 → 1.0 | 기본 피치 |
| L1 | 2–3 | "COMBO x{n}" | `text-ow-blue` / `border-ow-blue/60` | 1.0 | 4.5px | 90ms | 1.20 → 1.0 | 피치 +약 |
| L2 | 4–5 | "COMBO x{n}" | `text-ow-orange` / `border-ow-orange/70` | 1.08 | 5.5px | 105ms | 1.28 → 1.0 | 피치 +중, 밝기↑ |
| L3 | 6+ | "COMBO x{n}!!" | `text-ow-gold` / `border-ow-gold/80`, `drop-shadow(0 0 10px rgba(255,184,0,0.6))` | 1.18 | 6px | 120ms | 1.38 → 1.0 | 피치 +강, 최대 밝기 |

(진폭/duration은 plan 지시 범위 "x 4~6px, 80~120ms"를 4단계에 선형 매핑한 것. 4px 배수 원칙에 따라 4/4.5/5.5/6 중 4.5/5.5는 half-step 허용 — CSS/JS 수치라 정수 배수 강제 대상 아님. 정수로 맞추려면 4/5/6/6px 대체 가능.)

### 2.3 금액 임팩트 (스탬프형 오버슈트)

- 대상: 입찰가 텍스트 (`currentBid.amount`, 기존 `bid-pop` key 리마운트 지점). `bid-pop` CSS는 그대로 유지(대체 아님 — **병행**: CSS `bid-pop`은 밝기 flash, framer-motion은 3D 임팩트 담당).
- framer-motion `motion.span` (금액 텍스트 wrapper), `key={currentBid.amount}`로 리마운트:
```
initial={{ scale: comboOvershootScale, rotate: comboLevel >= 2 ? -3 : -1.5, opacity: 0.4 }}
animate={{ scale: 1, rotate: 0, opacity: 1 }}
transition={{ type: 'spring', stiffness: 420, damping: 16, mass: 0.6 }}
```
- `comboOvershootScale`: L0=1.15, L1=1.20, L2=1.28, L3=1.38 (표 2.2)
- spring 파라미터는 4단계 공통(stiffness 420 / damping 16) — 오버슈트 폭으로 강도 차이를 표현(스프링 자체를 단계별로 바꾸지 않아 일관된 탄성감 유지).

### 2.4 미세 화면 흔들림 (카드 컨테이너)

- 대상: `Card` 최상위 `motion` wrapper(신규 래핑, 기존 `<Card className="game-panel ...">`를 `motion(Card)` 또는 내부에 `motion.div`로 흔들림 전담).
- `x` 흔들림 시퀀스(framer-motion `animate` 배열):
```
animate={{ x: [0, -amp, amp, -amp*0.6, 0] }}
transition={{ duration: durationMs/1000, ease: 'easeOut' }}
```
- `amp`/`durationMs`는 표 2.2 값(L0: 4px/80ms ~ L3: 6px/120ms).
- **모바일(<1024px)**: 흔들림 진폭 50% 축소(예: L3 6px→3px) 또는 완전 생략(권장: 축소, 완전 생략은 과함) — `matchMedia('(min-width:1024px)')` false 시 `amp = amp * 0.5`.
- **reduced-motion**: 흔들림 애니메이션 전체 생략(`x` 트랜지션 미실행), 금액 임팩트 스프링도 생략하고 `opacity 0→1`(150ms)만 적용(정적 대체, 값 변경은 즉시 반영).

### 2.5 콤보 배지

- 위치: 입찰가 패널(`neon-frame`) 우측 상단 또는 "현재 입찰가" 라벨 옆(구현 시 절대배치 `top-1 right-1` 권장, 카드 레이아웃 침범 최소화).
- 등장: `initial={{ opacity: 0, y: -6, scale: 0.85 }}`, `animate={{ opacity: 1, y: 0, scale: 1 }}`, `transition={{ type: 'spring', stiffness: 500, damping: 22 }}` — 매 콤보 갱신 시 `key={comboCount}`로 재생.
- 소멸: count가 0(리셋)이 되면 `exit={{ opacity: 0, scale: 0.8 }}` (AnimatePresence), duration 150ms.
- L2 이상: 배지 자체에 미세 breathing(`scale: [1, 1.05, 1]`, 1.2s loop) — reduced-motion 시 정지.

---

## 3. 도화선 타이머 (bid-timer.tsx + globals.css)

대상: task-004. 트리거: `isUrgent`(`value <= 5 && value > 0`) 진입/이탈. **`role=timer`/`aria-live`/`aria-label`/`isEnded` 로직 변경 금지, 신규 요소는 `aria-hidden`.**

### 3.1 신규 keyframes (globals.css, `@media (prefers-reduced-motion: reduce)` 블록 477행 확장 포함)

```css
/* 게이지 끝단 불꽃 — flicker (scale/opacity/translateY 흔들림) */
@keyframes timer-flame-kf {
  0%   { transform: translateY(0) scale(1);     opacity: 0.85; }
  25%  { transform: translateY(-2px) scale(1.08); opacity: 1; }
  50%  { transform: translateY(0) scale(0.94);  opacity: 0.9; }
  75%  { transform: translateY(-1px) scale(1.05); opacity: 0.98; }
  100% { transform: translateY(0) scale(1);     opacity: 0.85; }
}
.timer-flame {
  animation: timer-flame-kf 0.42s ease-in-out infinite;
  will-change: transform, opacity;
}

/* 스파크 — 짧게 튀어오르며 소멸 (index 기반 결정적 각도, --spark-x 방식) */
@keyframes timer-spark-kf {
  0%   { transform: translate(0, 0) scale(1);   opacity: 1; }
  100% { transform: translate(var(--spark-x, 6px), var(--spark-y, -14px)) scale(0.3); opacity: 0; }
}
.timer-spark {
  animation: timer-spark-kf 0.55s ease-out infinite;
  will-change: transform, opacity;
}

/* 연소 텍스처 — 게이지 트랙 배경, 저알파 오렌지/레드 그라디언트 (정적 베이스 + 미세 shimmer) */
@keyframes timer-ember-kf {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 0.85; }
}
.timer-ember {
  background: linear-gradient(90deg, transparent 0%, rgba(249,158,26,0.18) 40%, rgba(255,70,73,0.22) 100%);
  animation: timer-ember-kf 1.1s ease-in-out infinite;
}
```

reduced-motion 블록(기존 477–491행)에 추가:
```css
.timer-flame,
.timer-spark,
.timer-ember {
  animation: none;
}
```
(불꽃/스파크는 정지 시 `.timer-flame`이 마지막 프레임이 아니라 **정지 스프라이트**(고정 opacity 0.9, 고정 scale 1)로 보이도록 별도 static opacity 지정 권장: `@media (prefers-reduced-motion: reduce) { .timer-flame { opacity: 0.9; } .timer-spark { display: none; } }`)

### 3.2 배치/타이밍 (bid-timer.tsx)

- `.timer-flame` 1개 + `.timer-spark` 2~3개(index 기반 `--spark-x`/`--spark-y` 결정적 값, `.burst-particle` 패턴과 동일 방식): 게이지 바(112–125행) 채워진 영역 우측 끝(`left: ${fraction*100}%` 근처, `transform: translateX(-50%)`로 중앙정렬), `isUrgent`일 때만 렌더.
- `.timer-ember`는 게이지 트랙(`bg-muted/40` 요소) 배경에 오버레이, `isUrgent` 진입 시 `opacity 0→1` CSS transition(200ms)으로 페이드인, 이탈 시 페이드아웃.
- 모든 신규 요소는 `aria-hidden="true"` — 기존 `role=timer`/`aria-live`/`aria-label` 구조에 개입하지 않음.
- 스파크 개수: 데스크톱 3개, **모바일 2개**(강도 축소).

### 3.3 사운드 동조

- `isUrgent` 진입(false→true) 시 `startFuseCrackle()` 1회.
- `isUrgent` 이탈(true→false: 종료/낙찰/유찰/WAITING 복귀) 또는 컴포넌트 언마운트 시 `stopFuseCrackle()`.
- `useEffect([isUrgent])` cleanup에서 stop 호출(중복 방지는 엔진이 내부 running 플래그로 보장하되, 컴포넌트도 진입/이탈 1회씩만 트리거).

### 3.4 reduced-motion / 모바일

- reduced-motion: 위 CSS 규칙대로 애니메이션 정지, `.timer-flame`은 정적 opacity 0.9로 표시(마감 임박을 시각적으로는 계속 알림), `.timer-spark`는 `display:none`. **사운드(크래클)는 계속 재생**(모션이 아니므로 감소 대상 아님, plan §공통 원칙과 일치).
- 모바일: 스파크 개수 축소(3→2), ember 배경 opacity 상한 0.85→0.65로 축소(과도한 색 자극 저감).

---

## 4. 낙찰 골든 카드 + flight-in

대상: `current-player-card.tsx` 단계 3(P0-4, 소스) + `team-sidebar.tsx`/뷰 3개(task-002, 타겟). 트리거: `stageEvent.kind === 'sold'` (celebrate==='sold').

### 4.1 타임라인 (t=0을 `celebrate` 상태 진입 시점으로, 기존 1700ms 자동 해제 유지)

| t (ms) | 이벤트 |
|---|---|
| 0 | 베일(`bg-black/45`) + 플래시(`flash-burst`) + 링 확산(`ring-expand` ×2) + 파티클(`burst-particle` ×12) 동시 시작 (기존 로직 그대로) |
| 0–250 | 오버레이 컨테이너 `opacity 0→1`(기존 `transition: duration 0.25`) |
| 150–470 | 스탬프("낙찰!") spring 진입(기존 `stiffness:320, damping:18, delay:0.15`) — **변경 없음** |
| 0–**450** (신규) | **골든 변신**: 카드 테두리/배경 골드 그라데이션 전이 (§4.2) |
| 1700 | `celebrate` 상태 해제(기존 setTimeout) → 오버레이 `exit` opacity 0 (기존) |
| 1700+ | flight 소스 layoutId 요소가 언마운트 전이(또는 오버레이 해제 직후) → 사이드바 타겟으로 **layout morph** 시작 (§4.3) |

### 4.2 골든 변신 (카드 자체, 오버레이와 별개 레이어)

- 대상: 카드 최상위 `Card` 요소의 `border-color`/`box-shadow`(기존 `isSold && 'border-green-500/70'` → **골드 계열로 변경 제안**: 요구사항은 "골드 변신"이므로 기존 초록 낙찰 보더를 골드로 교체하는 것이 자연스러움. 단, 이는 task-003 구현 시 `isSold` 분기 클래스를 `border-ow-gold/70`으로 바꾸는 선택 — 기존 초록이 "성공" 시맨틱으로 이미 쓰인다면 유지하고 별도 골드 오버레이 레이어를 추가하는 대안도 가능. **권장: 골드로 교체**하여 "골든 카드" 요구사항을 명확히 시각화).
- 전이: `transition-[border-color,box-shadow] duration-300`(기존 클래스 그대로 재사용 가능, 300ms) → **450ms로 소폭 연장**(골드 그라데이션이 번지는 느낌, `duration-500` Tailwind 클래스 사용 가능: `transition-[border-color,box-shadow] duration-500 ease-out`).
- 배경 그라데이션 전이(신규, framer-motion 또는 CSS): 카드 배경에 `linear-gradient(135deg, rgba(255,184,0,0.08) 0%, transparent 60%)` 오버레이 레이어를 `opacity 0→1`, duration 450ms, delay 0ms(오버레이 등장과 동시 시작)로 페이드인. 기존 `.game-panel-gold` 클래스(403–406행, `border-color: rgba(255,184,0,0.45); box-shadow: inset 0 0 28px rgba(255,184,0,0.06)`)를 **그대로 재사용** — `isSold` 시 `game-panel-gold` 클래스 추가로 대체 가능(신규 CSS 불필요).

### 4.3 Flight-in (layoutId 공유 morph)

- 소스: 셀레브레이션 골든 카드(또는 아바타 요소)에 `layoutId={`flight-card-${lastPlayer.id}`}` 부여(task-003).
- 타겟: `team-sidebar.tsx` 신규 멤버 슬롯에 `layoutId={`flight-card-${m.id}`}` 부여(task-002, sold player.id === member.id 규약).
- 두 요소는 동일 `LayoutGroup`(뷰 3개에서 그리드를 감싼) 내부 — framer-motion이 자동으로 위치/크기 보간(`layout` prop 자동 처리, 별도 `animate` 좌표 계산 불필요).
- **모프 duration/이징**: `transition={{ layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}` (600ms, deceleration curve — "날아가 앉는" 느낌에 적합, 팩 플립과 동일 계열 이징으로 톤 일관성 유지).
- 스프링 대체안(택1, 더 통통 튀는 느낌 원하면): `transition={{ layout: { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 } }}`. **기본값은 duration 기반(600ms, cubic-bezier) 권장** — 다수 요소(파티클 등)와 동시 진행 시 spring이 예측 어려울 수 있어 카드 단일 morph에는 duration 방식이 타이밍 제어에 유리.
- 소스 요소 크기(카드 아바타, 약 176px `w-44 h-44`) → 타겟 크기(사이드바 아바타 `h-9 w-9`=36px)로 축소되며 이동 — framer-motion `layout`이 border-radius/scale까지 자동 보간(추가 코드 불필요, `layout` prop만 필요).
- 트리거 시점: `celebrate` 오버레이가 `exit`(1700ms)되며 소스 요소가 언마운트 조건에 들어갈 때, 이미 사이드바 쪽 `team.members`에 신규 멤버가 반영되어 있어야 morph 성립(서버 상태 갱신 타이밍 의존 — 소켓 이벤트 순서상 일반적으로 만족되나, 만약 지연 시 소스가 먼저 사라지고 타겟이 나중에 pop-in되는 fallback으로 자연 저하됨. R2 문서화됨).

### 4.4 사이드바 신규 멤버 진입 (타겟, task-002)

- 신규 감지된 멤버만 `motion.div`(기존 141행 아바타 wrapper 승격):
```
initial={{ opacity: 0, scale: 0.6, rotateY: -90 }}
animate={{ opacity: 1, scale: 1, rotateY: 0 }}
transition={{ type: 'spring', stiffness: 380, damping: 22, mass: 0.8 }}
layoutId={`flight-card-${m.id}`}
```
- pop/flip-in 혼합(스케일 팝 + 살짝 Y축 회전으로 "카드가 슬롯에 꽂히는" 느낌).
- 기존 아바타 스타일(border-ow-blue/50, 이름 라벨)은 변경 없이 유지, wrapper만 motion 승격.
- flight 소스와 layoutId가 일치하면 위 `initial`은 framer-motion이 자동으로 소스의 마지막 위치/크기에서 시작하도록 오버라이드(layout 애니메이션이 initial보다 우선 처리되는 것이 framer-motion 표준 동작이므로 morph가 자연스럽게 이어짐).

### 4.5 reduced-motion / 모바일

- **reduced-motion**: 골든 변신은 `duration: 0`(즉시 클래스 전환, 정적 골드 프레임 표시) — 색 변화 자체는 유지(정보 전달), 애니메이션만 제거. Flight-in `layout` 애니메이션 비활성화(`layout={!reducedMotion}` 또는 `transition={{ layout: { duration: 0 } }}`) — 신규 멤버는 즉시 최종 위치에 표시. 사이드바 pop-in도 `initial=animate`(애니메이션 없이 즉시 표시).
- **모바일 관전자(<lg)**: 사이드바 자체가 비노출(기존 레이아웃, task-002 §제약)이므로 flight-in 자동 미노출. 골든 카드 변신(카드 자체 연출)은 모바일에서도 노출하되 파티클/플래시는 §1.4 모바일 축소 기준과 동일 적용(낙찰 파티클 12개는 기존 그대로 유지 — 이미 절제된 개수이므로 추가 축소 불필요, 플래시 opacity만 상한 축소 적용 시 §1.4와 동일 로직 재사용 가능).

---

## 5. 구현자 체크리스트 (수치 요약)

| 연출 | 핵심 duration/scale/spring | 소유 파일 |
|---|---|---|
| 팩 플립 | 440ms, `cubic-bezier(0.22,1,0.36,1)`, rotateY 0→180 | current-player-card.tsx |
| 등급 프레임 페이드 | 200ms ease-out | current-player-card.tsx |
| 전설 플래시/파티클 | 900ms(`flash-burst-kf`/`burst-particle-kf` 기존 재사용), 파티클 24개(모바일 12개) | current-player-card.tsx |
| 입찰 임팩트 스프링 | stiffness 420 / damping 16 / mass 0.6, scale 1.15~1.38(단계별) | current-player-card.tsx |
| 화면 흔들림 | 4~6px, 80~120ms(단계별), 모바일 50% 축소 | current-player-card.tsx |
| 콤보 배지 등장 | stiffness 500 / damping 22 | current-player-card.tsx |
| 도화선 flicker | 0.42s ease-in-out infinite | globals.css |
| 도화선 spark | 0.55s ease-out infinite | globals.css |
| 도화선 ember | 1.1s ease-in-out infinite | globals.css |
| 골든 변신 | 450~500ms ease-out (또는 `duration-500`) | current-player-card.tsx |
| Flight morph | 600ms `cubic-bezier(0.22,1,0.36,1)` (또는 spring stiffness 260/damping 26) | current-player-card.tsx + team-sidebar.tsx |
| 사이드바 진입 | spring stiffness 380 / damping 22 / mass 0.8 | team-sidebar.tsx |

**COMBO_WINDOW_MS = 3000**, 단계 임계값 L0:1 / L1:2-3 / L2:4-5 / L3:6+ (task-001과 완전 동일 — R4 발산 방지).
