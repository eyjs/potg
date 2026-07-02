# 하단 탭바 스펙 — `parts/mobile-tab-bar.tsx` (신규)

## 구조
2개 탭, 아이콘(lucide-react) + 라벨:
| 탭 id | 아이콘 | 라벨 |
|---|---|---|
| `auction` | `Gavel` (또는 `Radio`) | 경매 |
| `status` | `Users` | 현황 |

```tsx
interface Props {
  active: 'auction' | 'status'
  onChange: (tab: 'auction' | 'status') => void
}
```

## 마크업 골격
```tsx
<nav role="tablist" aria-label="경매 화면 전환" className="game-panel shrink-0 h-14 flex border-t-2 border-primary/30 bg-background/95 backdrop-blur-sm">
  {TABS.map((tab) => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={active === tab.id}
      onClick={() => onChange(tab.id)}
      className={cn(
        'game-btn flex-1 flex flex-col items-center justify-center gap-0.5 h-full min-w-11',
        active === tab.id
          ? 'text-primary border-t-2 border-primary -mt-0.5 drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]'
          : 'text-muted-foreground',
      )}
    >
      <tab.icon className="w-5 h-5" aria-hidden />
      <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
    </button>
  ))}
</nav>
```

## 토큰/클래스 결정 (신규 CSS 없음, 전부 기존 재사용)
- 컨테이너: `game-panel`(기존 각진 노치 프레임 — 단, 하단바는 `border-t-2 border-primary/30`로 상단 경계만 강조하고 `clip-path` 노치는 시각적으로 크게 부각되지 않으므로, `game-panel`이 과하면 대안으로 `bg-card/95 backdrop-blur-sm border-t border-border` 조합도 허용 — Implementor 판단. 단 `neon-frame` 남용 금지(스킴 다름).
- 활성 탭 강조: `text-primary`(=`--primary`=`--ow-gold`) + `border-t-2 border-primary` + 기존 `drop-shadow` 패턴(카드 타이틀에서 쓰는 `rgba(255,184,0,0.4)` 그대로 재사용, 신규 색상값 아님 — `--ow-gold` alpha 버전).
- 비활성 탭: `text-muted-foreground`(dim, 기존 토큰).
- hover/active 인터랙션: 버튼에 `game-btn` 클래스 부여 → 기존 `.game-btn:hover`(scale+glow), `:active`(scale-down+brightness) 그대로 적용됨(신규 CSS 불필요).
- 터치 타겟: `h-14`(=3.5rem=56px, 44px 기준 충족) 컨테이너 전체 + 각 버튼 `flex-1 min-w-11`(최소 44px 폭 보장, 2탭이므로 375px에서도 충분).
- skew: 기존 `skew-btn`은 현재 실질적으로 skew를 적용하지 않음(globals.css 146-151행, transform 주석 처리됨) — 탭바에 별도 skew 불필요, `game-btn`의 hover scale로 충분한 인터랙션 피드백.

## 접근성
- `role="tablist"` on nav, `role="tab"` + `aria-selected` on each button.
- 탭 콘텐츠 쪽(레이아웃 스펙 참조)에 `role="tabpanel"`/`id` 연결은 P0 필수는 아니지만 권장(`aria-controls={tab.id}` + 콘텐츠에 `id={tab.id}`).
- 키보드: `<button>` 기본 포커스/Enter 동작으로 충분(별도 화살표 키 네비게이션은 P1 스코프 아님).

## Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .game-btn { transition: none; } /* 이미 globals.css 553-556행에 정의됨 — 별도 추가 불필요 */
}
```
탭바는 `game-btn` 클래스를 그대로 쓰므로 기존 reduced-motion 규칙이 자동 적용됨. 탭 전환 시 콘텐츠 쪽에서 트랜지션을 추가하지 않는 한(레이아웃 스펙에서 `hidden` 즉시 토글만 사용) 별도 처리 불필요.

## 배치
`mobile-layout-spec.md`의 탭 콘텐츠 영역 다음, 루트 flex 컨테이너의 마지막 `shrink-0` 자식으로 배치. `fixed` 불필요(부모가 이미 `h-[calc(100dvh-7rem)]`로 고정).
