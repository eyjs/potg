# 경매 탭 스테이지 HUD 스펙 — `parts/mobile-auction-stage.tsx` (신규)

`hooks/use-player-card-stage.ts`(신규 공유 훅, `CurrentPlayerCard`와 동일 상태 소스)를 구독. 판정 로직(등급/콤보/셀레브레이션)은 여기서 새로 만들지 않고 훅에서 그대로 받아씀 — 이 스펙은 **레이아웃/오버레이 배치**만 정의.

## 전체 구조 (`shrink-0`, 부모가 h ≈ 38~42vh 부여)
```
<div className="game-panel relative overflow-hidden ..." style={{height: '100%'}}>
  [배경: 아바타 초상화, object-cover, 중앙 정렬 — 무대 아님, 인물 클로즈업]
  [오버레이 그라디언트: 하단 어둡게, 텍스트 가독성 확보 — bg-gradient-to-t from-black/80 via-black/20 to-transparent]
  [상단 오버레이: 역할 뱃지 + 등급 뱃지 (좌상단)]
  [중앙 오버레이: 없음 — 초상화가 채움]
  [하단 오버레이: 이름 + 현재가(펀치) + 입찰 선두 + 티커]
  [최하단: 도화선 타이머 바(전폭)]
</div>
```

## 세부 배치

### 1. 배경 초상화
- 기존 `Avatar`(원형, `w-44 h-44`) 대신 **전폭 클로즈업 배경**으로 변경: `<div className="absolute inset-0"><img className="h-full w-full object-cover object-top" .../></div>` (또는 `AvatarImage`의 `src`를 그대로 재사용, `Avatar` 컴포넌트 형태는 버리고 순수 `img`/`next/image`).
- 등급 프레임(`RARITY_FRAME`, `card-rarity.ts`)의 `avatarBorder`/`avatarGlow`는 원형 아바타 전제라 배경 이미지에 직접 적용 불가 — 대신 **컨테이너 테두리**(`game-panel` 자체 `border-2` + 등급별 `frame.cardBorder`, `CurrentPlayerCard` 269-281행과 동일 클래스)로 등급을 표현. 신규 색상 없음, 기존 `RARITY_FRAME` 값 그대로 재사용.
- 팩오프닝 플립(뒷면 실루엣→정면)은 배경 이미지 자체에 `motion.div` `rotateY` 애니메이션 그대로 적용 가능(구조는 `CurrentPlayerCard` 307-360행 패턴 재사용, `perspective`/`backfaceVisibility` 동일).

### 2. 상단 오버레이 (`absolute top-2 left-2 flex gap-1.5`)
- 역할 뱃지: 기존 `ROLE_COLORS` + `Badge variant="outline"` 그대로.
- 등급 뱃지(전설 등급일 때만): `frame.badgeClass` 재사용, `text-[10px]`.

### 3. 하단 텍스트 오버레이 (`absolute bottom-0 inset-x-0 p-3 pb-2 space-y-1`, 배경 그라디언트 위)
- 이름: `text-2xl font-black italic uppercase tracking-tighter` (데스크톱 `text-4xl` 대비 축소, 모바일 폭 대응).
- 현재가 + 입찰 선두: 기존 `neon-frame` 패널(414-480행)을 축소 버전으로 재사용 — `px-3 py-2`, 숫자 `text-3xl`(데스크톱 `text-5xl` 대비 축소), `bid-pop` 클래스는 **그대로 재사용**(펀치 애니메이션, 요구사항 명시). 콤보 배지도 동일 `COMBO_STAGE` 데이터, `badgeScale`/`badgeClass` 그대로.

### 4. 최근 입찰 티커 (`parts/fx/mobile-bid-ticker.tsx`, 신규 — 또는 stage 내부 서브파트)
- 위치: 현재가 패널 바로 아래, `overflow-hidden h-5` 정도의 가로 한 줄 영역.
- `bidEvents` 최근 2~3건만, 좌→우 또는 상→하로 페이드인(`pop-in` 클래스 재사용 — 신규 항목 등장 시 `pop-in-kf` 애니메이션 기존 정의 그대로).
- 텍스트: `text-[10px] text-muted-foreground truncate` + 최신 항목만 `text-ow-blue` 강조(선두 표시와 동일 색 규칙).
- `BidLog`(세로 카드형)를 그대로 쓰지 않는 이유는 요구사항 §3 티커 항목 참조 — 컴팩트 한 줄/두 줄 리스트만.

### 5. 도화선 타이머 바 (최하단, 전폭)
- `bid-timer.tsx`에 신규 `variant="bar"`(또는 `showNumber={false}`) prop 추가 — **`bid-timer.tsx` 파일 자체가 단일 소유자**, 신규 타이머 컴포넌트 작성 금지(요구사항 §4).
- 배치: 스테이지 컨테이너 최하단, `absolute bottom-0 inset-x-0` 또는 하단 텍스트 오버레이 안쪽 마지막 자식. 게이지 트랙은 `w-full`(기존 `h-1.5 w-full` 유지), 숫자 표시(`sec` 텍스트)는 `showNumber=false`일 때 생략하고 게이지 바 자체만 전폭으로.
- `isUrgent` 불꽃/스파크/`timer-ember`/`startFuseCrackle`/`aria-live`/`role=timer` 로직은 **변경 없이 그대로** 재생 — 신규 CSS 없음.

## 모바일 축소 강도 (요구사항 §3 명시값 그대로 적용, 신규 계산 없음)
- 전설 파티클: `LEGENDARY_PARTICLES_MOBILE`(=`BURST_PARTICLES`, 12개) — `current-player-card.tsx` 185-187행의 `isDesktop` 분기 로직을 공유 훅에서 그대로 가져와 사용.
- 콤보 흔들림 진폭: `stage.amp * 0.5`(`current-player-card.tsx` 218행과 동일 계수) — 공유 훅 또는 컴포넌트 로컬에서 `isDesktop=false` 고정 적용.
- 낙찰/유찰 셀레브레이션 오버레이(베일/링확산/파티클/스탬프): `CurrentPlayerCard` 483-577행 구조 그대로, 스탬프 텍스트 크기만 `text-3xl`(데스크톱 `text-5xl` 대비 축소)로 조정.

## Reduced Motion
- 플립 생략(즉시 정면), 전설 버스트는 사운드만 유지(시각 파티클 스킵) — `current-player-card.tsx` 156-164행과 동일 분기를 공유 훅에서 그대로 받음.
- 티커 등장 시 `pop-in` 생략(즉시 표시) — `pop-in` 자체는 이미 `@media (prefers-reduced-motion: reduce)` 전역 규칙에 없으므로, 신규로 `.pop-in` 항목을 globals.css의 reduced-motion 블록(542-556행)에 추가하는 것을 **task-005(globals.css 단독 소유)에 위임**(이 스펙은 언급만, 직접 구현 금지).
- 타이머 불꽃/스파크: 기존 reduced-motion 규칙(557-568행) 그대로 적용됨(변경 불필요).

## 구현 시 건드리는 파일
- 신규: `parts/mobile-auction-stage.tsx`, `hooks/use-player-card-stage.ts`, (선택) `parts/fx/mobile-bid-ticker.tsx`
- 확장: `parts/bid-timer.tsx`(`variant`/`showNumber` prop 추가, 데스크톱 기본값 무변경)
- 축소: `parts/current-player-card.tsx`(상태 로직만 훅으로 이전, 데스크톱 마크업 변경 없음)
