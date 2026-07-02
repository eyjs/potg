# 디자인 토큰 — 재사용 확인 (task-003 모바일 관전자 레이아웃)

## 결론
이번 태스크(모바일 관전자 레이아웃)는 **신규 디자인 토큰을 추가하지 않는다.** 프로젝트에는 이미 `frontend/src/app/globals.css`에 완결된 오버워치 테마 토큰 체계가 존재하며, 모바일 레이아웃은 이 토큰들과 기존 하위 컴포넌트(`CurrentPlayerCard`, `BidTimer`, `ChatPanel`, `LiveChip`)를 그대로 재사용하는 순수 레이아웃(반응형 분기) 작업이기 때문이다.

## 재사용 대상 (출처: `frontend/src/app/globals.css`)

### 색상
- `--background` (#0b0b0b), `--foreground` (#f0edf2), `--card` (#151515), `--card-foreground`
- `--muted`, `--muted-foreground` (#a0a0a0), `--border` (#2a2a2a)
- `--primary` (#FFB800, 골드), `--accent` (#00c3ff, 시안)
- 오버워치 전용: `--ow-orange`, `--ow-gold`, `--ow-blue`, `--ow-red`, `--ow-dark`, `--ow-deep`, `--ow-light`
- Tailwind 클래스 매핑(`@theme inline`): `bg-card`, `text-muted-foreground`, `border-ow-blue/25`, `text-ow-gold`, `text-ow-red` 등 — 이미 대상 컴포넌트들이 사용 중.

### 타이포그래피
- `--font-sans`: `"Exo 2", "Geist", sans-serif` — 헤더 제목(`font-black italic uppercase tracking-tighter`)에서 이미 사용 중, 모바일에서도 동일 클래스 재사용.

### 간격
- Tailwind 기본 4px 스케일 그대로 사용 (`gap-3`=12px, `gap-4`=16px, `p-3`=12px, `py-3`=12px 등). 프로젝트에 별도 spacing 토큰 레이어는 없으며 Tailwind 기본값이 곧 팀의 간격 체계.

### 라운드/보더
- `--radius` (0.25rem) 및 파생 `--radius-sm/md/lg` — Shadcn `Card` 등에서 이미 적용, 모바일에서 별도 지정 불필요.

### 유틸리티 클래스 (신규 CSS 작성 없이 기존 것만 재사용)
- `.game-panel` — `ChatPanel`, `CurrentPlayerCard`가 이미 사용
- `.light-sweep` — 상단 헤더 카드 장식, breakpoint 무관 유지
- `.safe-area-pb` / `.safe-area-pt` — 이번 스펙에서는 `fixed` 하단 바를 쓰지 않으므로 미사용(스펙 문서에 근거 명시), 추후 P1에서 채팅 입력을 뷰포트에 완전 고정하는 방식으로 바뀌면 재사용 대상.
- 전역 스크롤바 스타일(`* { scrollbar-width: thin; ... }`) — `ChatPanel` 내부 스크롤에 자동 적용.

## 신규 토큰 필요 여부
없음. Implementor는 `auction-ongoing-spectator.tsx` 수정 시 위 기존 토큰/유틸리티 클래스와 Tailwind 기본 유틸리티(`flex`, `flex-col`, `flex-1`, `min-h-0`, `shrink-0`, `gap-4`, `hidden`, `lg:hidden`, `lg:grid`)만 사용하면 되며, 색상/폰트/간격 하드코딩이 발생하지 않는다.
