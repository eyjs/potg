# 화면 스펙: 모바일 관전자 레이아웃 (`auction-ongoing-spectator.tsx`)

- 대상 컴포넌트: `frontend/src/modules/auction/components/auction-ongoing-spectator.tsx`
- 대상 태스크: task-003 (P0)
- Breakpoint 기준: Tailwind `lg` (1024px). `lg` 미만 = 모바일/태블릿 레이아웃, `lg` 이상 = 기존 데스크톱 12-col 그리드 그대로.
- 뷰포트 타깃: 375px ~ 430px (세로 방향), 가로 스크롤 없음.

## 0. 전제 — 이미 재사용 가능한 구조

- `ChatPanel`은 이미 `h-full flex flex-col min-h-0` + 내부 메시지 영역 `flex-1 min-h-0 overflow-y-auto` + 하단 입력 폼 구조로 구현되어 있다. 즉 **부모가 높이를 명확히 주기만 하면** ChatPanel 자체가 "메시지 스크롤 + 입력창 고정"을 이미 만족한다. 모바일 스펙의 핵심은 ChatPanel의 부모 컨테이너에 올바른 높이 전략을 부여하는 것이다.
- `CurrentPlayerCard`는 이미 매물 아바타 + 현재 입찰가 + 입찰 선두를 한 카드에 통합 렌더링한다. 별도로 "현재가/입찰자"를 새로 만들 필요 없음 — 요구사항의 "현재 매물 카드 + 현재가/입찰자"는 `CurrentPlayerCard` 자체로 충족됨.
- `BidTimer`는 이미 상단 헤더 카드(`Card` — 제목 + `LiveChip`)에 위치. 모바일에서 이 헤더 카드를 그대로 유지(breakpoint 무관)하면 별도 이동 없이 "경매 현황 영역 최상단"에 자연히 노출된다.

## 1. 레이아웃 구조 (top → bottom)

```
<div className="space-y-4">                          ← 기존 루트, 유지 (breakpoint 무관)
  <Card>...헤더(제목 + BidTimer + LiveChip)...</Card>  ← 기존 그대로, 유지
  {PAUSED && <Card>...일시정지 안내...</Card>}          ← 기존 그대로, 유지

  {/* 데스크톱 전용 — 최소 침습: grid만 hidden lg:grid로 격리 */}
  <div className="hidden lg:grid grid-cols-12 gap-4"> ... 기존 4영역 구조 변경 없음 ... </div>

  {/* 모바일 전용 — 신규 블록 */}
  <div className="lg:hidden flex flex-col gap-3">
    {/* 상단 — 실시간 경매현황 */}
    <div className="shrink-0">
      {isAssigning ? (
        <Card>...유찰자 배정 중 안내(데스크톱과 동일 문구)...</Card>
      ) : (
        <CurrentPlayerCard player=... currentBid=... biddingPhase=... stageEvent=... />
      )}
    </div>

    {/* 하단 — 채팅, 남은 높이 전부 사용 */}
    <div className="flex-1 min-h-0">
      {chatMessages && onSendChat && (
        <ChatPanel messages=... onSend=... participants=... myUserId=... />
      )}
    </div>
  </div>
</div>
```

핵심 포인트:
- 데스크톱 그리드는 `hidden lg:grid`로만 감싸고 내부 4영역(TeamSidebar / 현황+BidLog / PlayerStatusGrid / ChatPanel)은 **문자 그대로 유지** — 회귀 방지, task-003 가이드와 동일.
- 모바일 블록은 형제 `<div className="lg:hidden ...">`로 추가. `TeamSidebar`, `BidLog`, `PlayerStatusGrid`는 이 블록 안에 아예 렌더하지 않는다 (import는 하되 조건부 렌더 대상에서 제외 — task-003 제약과 동일, "import만 하고 수정 금지" 대상이므로 모바일 블록에서 사용하지 않는 것 자체는 허용).

## 2. 채팅이 "남은 공간을 채우는" 높이 전략 (중요)

### 2-1. 뷰포트 기준 높이 확보
모바일 블록 전체가 "화면 나머지 높이"를 차지해야 ChatPanel의 `flex-1 min-h-0`가 실제로 동작한다. 페이지 전체 스크롤 컨테이너(레이아웃 상위, 예: `<main>` 또는 페이지 루트)의 구조에 따라 두 가지 중 구현 시점에 실측 검증 후 택1:

- **권장(A안 — 페이지가 이미 뷰포트 높이 컨테이너를 제공하는 경우)**: 모바일 블록에 `h-[calc(100dvh-<헤더높이>)]` 형태 대신, **부모 스크롤 컨테이너 자체가 `min-h-dvh` 또는 `h-dvh flex flex-col`**이라면 모바일 블록에 `flex-1 min-h-0`만 주면 자동으로 남은 높이를 채움. `dvh`(dynamic viewport height)를 사용해 모바일 브라우저 주소창 접힘/펼침에 따른 높이 변화에 대응한다 (`100vh` 대신 `100dvh` — 최신 Safari/Chrome 모두 지원).
- **폴백(B안 — 상위 컨테이너가 뷰포트 높이를 보장하지 않는 경우)**: 모바일 블록에 직접 `className="lg:hidden flex flex-col gap-3 h-[calc(100dvh-var(--mobile-header-h,0px))]"` 형태로 헤더/상단카드 실측 높이를 뺀 고정 높이를 부여하기보다, 더 안전한 방식으로 **모바일 블록을 `min-h-[calc(100dvh-6rem)]`** 정도의 여유값으로 잡고 CurrentPlayerCard는 `shrink-0`, ChatPanel 래퍼는 `flex-1 min-h-0`로 나머지를 흡수하게 한다. 정확한 rem 값은 Implementor가 실제 헤더/PAUSED 카드 렌더 높이를 DevTools로 확인해 4px 배수로 보정한다(예: `6rem`, `7rem` 등 — 하드코딩 픽셀 대신 rem 사용, 매직넘버 도입 시 주석으로 근거 명시).
- Implementor는 A안을 우선 시도하고, 페이지 레이아웃(`app/auction/.../page.tsx` 등 상위 스코프 — 이번 태스크 파일 수정 범위 밖)상 뷰포트 높이 컨테이너가 없다면 B안으로 폴백한다. 어느 쪽이든 **컴포넌트 자체 파일(`auction-ongoing-spectator.tsx`) 내부에서만 완결**되도록 한다 (다른 파일 수정 금지 제약 준수).

### 2-2. 컨테이너 클래스 요약 (Tailwind, `cn()` 사용)
- 모바일 래퍼: `flex flex-col gap-3` (세로 스택, 카드 간 12px 간격 — 기존 `gap-4`/`space-y-4`와 톤 맞춤이면 `gap-4`도 허용, 기존 루트가 `space-y-4`이므로 일관성 위해 동일하게 `gap-4` 사용 권장)
- 상단 카드 래퍼: `shrink-0` (내용만큼만 높이 차지, 절대 눌리지 않음)
- 채팅 래퍼: `flex-1 min-h-0` (`min-h-0`이 없으면 flex item이 내용만큼 늘어나 스크롤이 아니라 페이지 전체가 늘어나버리는 문제 발생 — 필수)
- ChatPanel 내부는 이미 `min-h-[20rem]`이 하드코딩되어 있음(기존 컴포넌트, 이번 태스크 수정 대상 아님) — 채팅 래퍼 높이가 20rem보다 작아지는 매우 좁은 화면에서는 ChatPanel이 그 최소 높이를 유지하며 상단 카드와 함께 페이지 레벨 스크롤이 발생할 수 있음. 이는 허용 가능한 폴백(성공 기준의 "세로 스크롤만으로 자연스럽게 확인 가능"과 부합).

## 3. 간격 스케일 (4px 배수 / 기존 토큰)
- 카드 간 세로 간격: `gap-4` (16px, 기존 루트 `space-y-4`와 동일 값 재사용)
- 모바일 블록 좌우 패딩: 별도 지정 불필요 — 상위 페이지 컨테이너의 기존 패딩을 그대로 상속 (신규 패딩 추가 금지, 데스크톱과 동일 여백 유지로 일관성 확보)
- Safe area: 모바일 블록 최하단(ChatPanel 입력 폼)이 실제 뷰포트 최하단에 닿는 풀블리드 레이아웃이 아니라 페이지 내 일반 스크롤 블록이므로 별도 `env(safe-area-inset-bottom)` 처리는 불필요. 단, 만약 구현 중 ChatPanel이 화면 최하단에 완전히 고정(`fixed`)되는 방식으로 변경된다면 기존 유틸리티 클래스 `.safe-area-pb`(`globals.css`에 이미 정의됨)를 재사용한다. **이번 스펙은 `fixed` 방식을 권장하지 않음** — ChatPanel이 이미 컨테이너 내부 relative 스크롤 방식으로 설계되어 있고, task-003도 "화면 하단에서 남은 공간을 채우며"라고 명시했지 화면에 고정하라고는 하지 않았으므로 문서 스크롤 흐름 내부에 두는 편이 CurrentPlayerCard 셀레브레이션 오버레이 등과 z-index 충돌 위험도 낮다.

## 4. 헤더 / PAUSED / ASSIGNING 모바일 처리
- 상단 헤더 카드(제목 + `BidTimer` + `LiveChip`)는 breakpoint 분기 없이 그대로 유지. 단, 좁은 화면에서 제목(`text-xl font-black italic uppercase`)이 두 줄로 줄바꿈되어도 무방 (`break-keep` 이미 적용됨). 별도 축소 스타일 추가 불필요 — 기존 반응형 텍스트가 이미 충분히 작음.
- `PAUSED` 안내 카드: 기존 그대로 유지, breakpoint 무관.
- `ASSIGNING` 상태: 모바일 블록의 "상단 — 실시간 경매현황" 자리에 데스크톱과 동일한 안내 카드(`마스터가 유찰자를 각 팀에 수동 배정 중입니다...`)를 표시. 데스크톱에서 쓰는 `py-12`(48px)는 모바일에서 다소 크므로 모바일 전용으로는 `py-8`(32px, 4px 배수 유지) 정도로 축소 권장 — 필수는 아니며 시각적 여유 확보 목적.

## 5. 모바일에서 숨기는 요소
- `TeamSidebar` — 숨김 (P1에서 탭/바텀시트로 재도입 예정)
- `BidLog` — 숨김
- `PlayerStatusGrid` — 숨김
- 위 3개는 `import`는 유지하되 모바일 블록(`lg:hidden`) 내부에서 렌더링하지 않는다. 데스크톱 그리드(`hidden lg:grid`) 안에서는 기존과 동일하게 렌더링된다.

## 6. 접근성 (WCAG 2.1 AA)
- 텍스트 대비: 기존 디자인 토큰(`--foreground` #f0edf2 on `--card` #151515, `--muted-foreground` #a0a0a0 on `--card`)은 이미 프로젝트 전역에서 사용 중인 값 그대로 재사용 — 신규 색상 조합을 만들지 않으므로 기존 대비 검증 결과를 그대로 승계.
- `BidTimer`는 이미 `role="timer"` + `aria-live`(긴급/종료 시 `assertive`, 평시 `polite`) 적용됨 — 모바일에서도 동일 컴포넌트 재사용이므로 별도 조치 불필요.
- `ChatPanel` 메시지 목록은 이미 `aria-live="polite"` 적용됨 — 재사용 시 그대로 승계.
- 관전자는 조작 UI가 없음(입찰 버튼 등 없음) — 모바일 블록에 신규 인터랙션 요소를 추가하지 않는다. 유일한 인터랙티브 요소는 기존 `ChatPanel`의 메시지 입력/전송(이미 `aria-label` 적용됨).
- 스크롤 영역: `ChatPanel` 내부 메시지 리스트만 별도 스크롤 컨테이너이고, 나머지(상단 카드 포함 모바일 블록 전체)는 페이지의 일반 문서 스크롤을 따른다 — 스크린리더/키보드 포커스 트랩이 발생하지 않는 단순한 문서 흐름 구조를 유지한다(별도 `tabindex` 조작 불필요).
- 모션: `CurrentPlayerCard`의 낙찰/유찰 셀레브레이션, `float-slow`, `pulse-live` 등은 이미 `globals.css`의 `prefers-reduced-motion: reduce` 미디어쿼리로 처리되어 있음 — 모바일도 동일 컴포넌트 재사용이므로 추가 조치 불필요.

## 7. 오버워치 테마 토큰 재사용 (신규 토큰 없음)
모바일 레이아웃은 아래 기존 토큰/유틸리티만 재사용하며 신규 색상/폰트/간격 값을 도입하지 않는다:
- 폰트: `--font-sans` (`"Exo 2", "Geist", sans-serif"`, `globals.css` `@theme inline`)
- 카드/배경: `--card`, `--card-foreground`, `--border`, `--background` (Shadcn `Card` 컴포넌트가 이미 사용)
- 액센트: `--color-ow-blue`, `--color-ow-gold`, `--color-ow-red` (헤더 라인 `light-sweep`, `BidTimer` 긴급 표시, `CurrentPlayerCard` 셀레브레이션 등에서 기존 사용 중인 그대로)
- 간격: Tailwind 기본 스케일(4px 배수) — `gap-3`(12px), `gap-4`(16px), `p-3`(12px) 등 기존 컴포넌트들이 이미 쓰는 값과 동일 계열만 사용
- 스크롤바: 전역 `* { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }` — `ChatPanel` 내부 스크롤에 자동 적용됨, 별도 처리 불필요

## 8. Implementor 체크리스트 (task-003 성공 기준과 매핑)
1. 데스크톱 그리드 `<div className="grid grid-cols-12 gap-4">` → `<div className="hidden lg:grid grid-cols-12 gap-4">`로 변경, 내부 JSX 무변경.
2. 형제로 `<div className="lg:hidden flex flex-col gap-4 ...">` 추가 (섹션 1~2 구조).
3. `isAssigning` 조건 분기를 모바일 블록에도 동일하게 적용 (섹션 4).
4. `TeamSidebar` / `BidLog` / `PlayerStatusGrid`는 모바일 블록에 렌더하지 않음 (섹션 5).
5. `ChatPanel` 래퍼에 `flex-1 min-h-0` 적용, 상단 카드 래퍼에 `shrink-0` 적용 (섹션 2).
6. 375/390/430px + 데스크톱 1280px+ 두 시나리오 모두 DevTools로 육안 검증 (섹션 2-1 A/B안 중 실측 후 최종 채택).
