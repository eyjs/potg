# 코드 리뷰 — 3차 사이클 (하단 탭 네비게이션)

VERDICT: FAIL

리뷰 범위: `git diff origin/master..HEAD -- frontend/` (355999a → 75c02ea)
검증: `npx tsc --noEmit` 통과(0 errors) · `eslint`(변경 8파일) 통과(0 errors) · `any` 0건 · 스코프 밖 파일(shadcn/utils.ts/globals.css/backend) 무변경 확인.

결론: P0 핵심(탭 CSS 토글·상태 보존·라우트 미이동·사운드/크래클 배선·데스크톱 무회귀·페이지 스크롤 0)은 대부분 정확하게 구현됨. 단, **전설 공개 portal 이중 렌더 방어가 데스크톱 카드 쪽에서 누락**되어 모바일 뷰포트에서 전설 플래시가 2중으로 발화한다. 리뷰 항목 #3("portal 1회만 발화")을 위반하므로 FAIL. 수정은 2줄, 저위험.

---

## [BLOCKER] 전설 공개 portal이 모바일 뷰포트에서 이중 발화

- 파일: `frontend/src/modules/auction/components/parts/current-player-card.tsx:411`
- 관련: 동일 파일 훅 구조분해(약 55-72행) — `isActiveViewport` 미포함.

### 증상
데스크톱 `CurrentPlayerCard`의 전설 전체화면 플래시 portal 게이트가
`legendaryBurst && !reducedMotion && typeof document !== 'undefined'` 뿐이고
`isActiveViewport`로 게이트되지 않는다.

`CurrentPlayerCard`는 `hidden lg:grid` 블록 안에서 **모바일 뷰포트에도 항상 마운트**된다
(`hidden`=display:none이지만 React 서브트리는 살아 있음). 그런데 이 전설 연출은
`createPortal(..., document.body)`로 렌더되어 **display:none 조상을 탈출**한다.
따라서 모바일 뷰포트에서 전설 매물 공개 시:

- `CurrentPlayerCard`(ownerViewport=`desktop`, isActiveViewport=false): 사운드는 게이트로 억제되지만
  `setLegendaryBurst(true)`는 `isActiveViewport`와 무관하게 실행되므로 portal이 그대로 body에 렌더 → **화면에 보임**.
- `MobileAuctionStage`(ownerViewport=`mobile`, isActiveViewport=true): portal 정상 렌더.
- 결과: 전체화면 flash-burst 2겹 + 파티클 24개(12×2) → **전설 플래시 이중 발화**.

사운드는 1회로 정상(`use-player-card-stage.ts:184` 게이트 정상 동작)이지만,
`MobileAuctionStage`는 portal을 `isActiveViewport`로 올바르게 게이트한 반면
(`mobile-auction-stage.tsx:344`) 데스크톱 카드만 게이트가 빠졌다. 게이트 설계 자체가
"동시 마운트 시 시각/사운드 1회 발화"인데 시각 채널이 미완성이다. 리뷰 항목 #3 위반.

데스크톱 뷰포트에서는 정상(desktop 인스턴스만 isActiveViewport=true → portal 1회). 즉
**결함은 모바일(이번 사이클의 주 대상)에서만, 그리고 하이라이트 순간(전설 공개)에** 발생한다.

### 수정 지시 (2줄)
1. 훅 구조분해에 `isActiveViewport` 추가:
   `const { displayPlayer, ..., flightLayoutId } = stage` → `isActiveViewport`도 함께 구조분해.
2. portal 게이트에 `isActiveViewport &&` 추가:
   `frontend/src/modules/auction/components/parts/current-player-card.tsx:411`
   ```tsx
   {legendaryBurst &&
     isActiveViewport &&   // ← 추가: 현재 뷰포트가 desktop일 때만 발화(MobileAuctionStage와 동일 게이트)
     !reducedMotion &&
     typeof document !== 'undefined' &&
     createPortal( ... )}
   ```
   `MobileAuctionStage`(`mobile-auction-stage.tsx:343-344`)와 동일한 패턴으로 맞추면 된다.

---

## 통과 항목 (참고)

- **데스크톱 회귀 없음(항목 #1)**: `hidden lg:grid` 블록 diff상 콘텐츠 무변경. 루트 div에 추가된
  `flex flex-col h-[calc(100dvh-7rem)] overflow-hidden`은 `lg:block lg:h-auto lg:overflow-visible`로
  데스크톱에서 전부 상쇄됨. header/PAUSED 카드에 붙은 `shrink-0`은 lg:block(비-flex) 하위에서 무효라 무영향.
  `bid-timer` 신규 prop 기본값(`variant='default'`, `showNumber=true`, `soundEnabled=true`)이 기존 마크업/사운드와 동일.
  컨테이너 className `flex ... inline-flex`는 tailwind-merge가 후자로 정리(=기존과 동일 `inline-flex`).
  훅 추출 후 데스크톱 인스턴스 isActiveViewport=true라 전설 사운드/파티클 판정 동일.
- **탭 구현(항목 #2)**: 두 패널 항상 동시 마운트 + 비활성 쪽 `cn(..., activeTab !== x && 'hidden')` display:none 토글.
  조건부 언마운트 없음, `router` 사용 없음(순수 `useState`). ChatPanel/입찰버튼/스테이지 타이머 상태 보존됨.
- **크래클 배선(항목 #3)**: 스테이지 바 `BidTimer soundEnabled={false}`(무음), 헤더 상태카드 `BidTimer`(기본 true)가
  단독 소유. 헤더는 항상 1개 마운트/가시라 크래클 중복 없음. 사운드 게이트(`use-player-card-stage.ts:184`) 정상.
- **페이지 스크롤 0(항목 #4)**: 루트 `overflow-hidden` + 존별 `shrink-0`/`flex-1 min-h-0`으로 document 스크롤 미발생.
- **컨벤션/안전(항목 #5,6)**: `any` 0건, Tailwind 전용, 신규 npm 없음, 스코프 밖 파일 무변경, tsc/eslint 통과.
  `AuctionBidEvent`(id/kind/bidderName/amount)·`RarityFrame.pulse`·`--stage-navy-deep` 모두 실존. 널 가드 적절
  (`MobileAuctionStage` displayPlayer 가드, ticker 빈 배열 → null 반환, key=e.id). 탭 union 타입/제네릭 정상.

---

## [NIT] (블로커 아님 — 시간 되면)

1. `auction-ongoing-spectator.tsx:56` / `auction-ongoing-captain.tsx:134` — 루트에 `space-y-4` 잔존.
   모바일에서 `flex flex-col` 자식 간 `margin-top:1rem`가 남아 탭 블록 위에 ~1rem 데드스페이스가 생기고
   탭 콘텐츠 높이가 그만큼 줄어든다(`hidden lg:grid`는 클래스이지 `[hidden]` 속성이 아니라 space-y 셀렉터가 계속 카운트함).
   `overflow-hidden`+`flex-1`이 흡수하므로 **페이지 스크롤은 없음**(그래서 NIT). `lg:space-y-4`로 바꾸면 깔끔.

2. `bid-timer.tsx` `showNumber=false` 경로가 sr-only `role="timer" aria-live` div를 렌더 → 모바일에서
   헤더 타이머와 합쳐 `role="timer"` live 영역이 2개가 되어 스크린리더가 카운트다운을 이중 낭독.
   스테이지 바 타이머는 `aria-hidden` 처리하거나 live를 비우는 편이 나음(헤더가 이미 안내 소유).

3. `mobile-auction-stage.tsx:286`(팀장) — 스테이지 `h-[40vh]`(vh)와 루트 `100dvh` 단위 혼용.
   iPhone SE(667px)급 + 팀장 입찰 카드 동시 노출 시 채팅 flex-1이 매우 얇아질 수 있음
   (overflow-hidden으로 페이지 스크롤은 없음). 스펙 허용 범위(38~42vh)이므로 실측 후 필요 시 축소 검토.
