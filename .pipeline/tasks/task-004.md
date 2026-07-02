# Task 004: mobile-bid-ticker — 최근 입찰 컴팩트 티커

## 메타데이터
- 복잡도: S
- 병렬그룹: A (선행 없음)
- 우선순위: P0
- 의존: 없음

## 담당 파일
- **신규**: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/fx/mobile-bid-ticker.tsx`

## 배타 소유 파일
- `components/parts/fx/mobile-bid-ticker.tsx` (신규)

## import만 하는 파일 (편집 금지)
- `../../../hooks/use-auction-socket` — `AuctionBidEvent` 타입
- `lib/utils` — `cn`
- `lucide-react` — `Gavel`/`Trophy` 등
- `framer-motion` — (선택) `AnimatePresence`/`motion`, `useReducedMotion`

## 목표
경매 탭 스테이지에 얹을 **컴팩트 최근 입찰 티커**(가로/흐름형, 최근 2~3건)를 작성한다. 세로 카드형 `BidLog`(최대 8건)와 달리 좁은 스테이지 오버레이용이다(P0-③). task-005가 스테이지 내부에 import해 렌더한다. `bid-log.tsx`는 무변경(별도 데스크톱 용도).

## 구현 상세

### 1) Props
```ts
interface Props {
  events: AuctionBidEvent[]   // 전체 목록 받고 내부에서 최근 N건 slice
  limit?: number              // 기본 3 (2~3건)
}
```
- 표시 대상: 최근 `kind==='bid'` 위주(낙찰 `kind==='sold'`도 표시 가능하나 스테이지 셀레브레이션과 중복될 수 있으니 입찰 위주 권장). `events.slice(-limit)` 최근순.

### 2) 시각 (컴팩트·오버워치 테마)
- 한 줄 컴팩트: `[닉네임] +N,NNNP` 형태, 입찰=시안(`text-ow-blue`), 아이콘 소형(`Gavel` w-3).
- 좁은 폭 대응: `truncate`, `tabular-nums`, 작은 폰트(`text-[10px]`~`text-xs`).
- 신규 항목 등장 연출: 기존 `pop-in` 클래스 재사용 또는 framer-motion `AnimatePresence`(진입 슬라이드/페이드). 새 `key`는 `event.id`.
- 배경: 반투명(`bg-black/40` 등 토큰 계열), 스테이지 위에 겹쳐도 가독.

### 3) 빈 상태 / reduced-motion
- 이벤트 0건: 최소 플레이스홀더 또는 렌더 없음(스테이지 레이아웃 안정 우선).
- `prefers-reduced-motion`: 등장 애니메이션 생략, 정적 목록 표시(`useReducedMotion()` 또는 globals.css `@media` 재사용, 신규 CSS 금지).

## 완료 기준 체크리스트 + 검증
- [ ] `events`/`limit` props, 최근 2~3건만 컴팩트 표시
- [ ] 신규 입찰 시 새 항목 등장(pop-in/AnimatePresence), `reduced-motion` 시 정적
- [ ] 좁은 폭(375px)에서 오버플로우/줄 깨짐 없음(`truncate`)
- [ ] `bid-log.tsx` 무변경(이 컴포넌트는 독립 신규)
- [ ] `any` 미사용, `cd frontend && npm run lint && npm run build` 통과

## 제약 재확인
- 오버워치 테마·디자인 토큰만·하드코딩 금지.
- `any` 금지 · Tailwind만 · 신규 CSS 파일 금지(globals.css `pop-in` 재사용) · 신규 npm 금지.
- `bid-log.tsx`/`ui/*`/`lib/utils.ts` 편집 금지 · `mobile-team-strip.tsx` 생성 금지.
