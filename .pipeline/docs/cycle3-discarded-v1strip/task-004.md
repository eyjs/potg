# Task 004: mobile-bid-ticker (최근 입찰 킬로그 티커)

## 메타데이터
- 복잡도: S
- 병렬그룹: A
- 의존: 없음
- 우선순위: P0-4 (AD-5)

## 배타 소유 파일 (병렬 충돌 방지 — 이 태스크만 편집)
- 신규: `/Users/eyjs/Desktop/WorkSpace/potg/potg/frontend/src/modules/auction/components/parts/fx/mobile-bid-ticker.tsx`

### import만 하는(수정 아님) 파일
- `hooks/use-auction-socket.ts` — `AuctionBidEvent` 타입 import (무변경)
- `lib/utils.ts` — `cn` import (무변경)

## 목적
스테이지 HUD 오버레이에 얹을 **최근 입찰 2~3건 축약 티커**를 신규 작성. `BidLog`(세로 8건 카드, `max-h-28` 스크롤)는 HUD에 부적합하므로 컴팩트 티커를 분리한다. 신규 소켓 리스너 없이 기존 `bidEvents`만 사용.

## 구현 상세 (P0-4)

### 1. 컴포넌트 시그니처
```ts
export function MobileBidTicker(props: {
  events: AuctionBidEvent[]   // 최근순, 내부에서 slice(-N)
  limit?: number              // 기본 3 (요구 2~3건)
}): JSX.Element
```

### 2. 표시/애니메이션
- 최근 `limit`건만 표시(`events.slice(-limit)`). 각 항목: `[bidderName] +{amount}P` 스타일(입찰=시안 `text-ow-blue`, 낙찰=골드 `text-ow-gold`, `kind`로 분기 — `BidLog`와 동일 토큰/아이콘 규칙 재사용).
- 신규 항목 진입: framer-motion `AnimatePresence`(신규 CSS 키프레임 불필요) 또는 기존 `pop-in` 클래스. HUD 폭 제약상 한 줄 축약(`truncate`)·가로 또는 세로 컴팩트 스택 중 택1(Designer 조정 여지).
- 항목 0개면 렌더 없음(빈 공간 최소) 또는 은은한 placeholder.

### 3. reduced-motion
- `useReducedMotion()` 시 진입 애니메이션 생략, 항목만 즉시 교체(정적).

## 성공 기준
- [ ] `MobileBidTicker` 신규 생성, 최근 2~3건 축약 표시(입찰/낙찰 색 분기)
- [ ] 새 입찰 수신 시 신규 항목이 흐르며 등장, reduced-motion 시 정적 교체
- [ ] 오버워치 토큰만 사용, HUD 오버레이에 얹기 적합한 컴팩트 크기
- [ ] 신규 소켓/npm 없음, 기존 `bidEvents`만 소비

## 검증 방법
- `cd frontend && npm run lint && npm run build` 통과
- task-005 스테이지에 마운트 후 연속 입찰 시 티커 갱신 확인(통합 단계)

## 제약 재확인
- 데스크톱 무변경(모바일 스테이지에서만 마운트), `any` 금지, Tailwind만·신규 CSS 파일 금지, `cn()` 사용, 오버워치 토큰 유지, reduced-motion 대응, `components/ui/*`/`lib/utils.ts` 수정 금지(import만), 신규 npm 금지, 백엔드 무변경(`bidEvents`만).
</content>
