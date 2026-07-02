# 모바일 레이아웃 스펙 — 3차 사이클 탭 네비게이션

375~430px 뷰포트 기준. 페이지 자체 스크롤 없음(`100dvh` 고정), 탭 콘텐츠 내부만 스크롤.
관전자(`auction-ongoing-spectator.tsx` `lg:hidden` 블록)와 팀장(`auction-ongoing-captain.tsx` `lg:hidden` 블록) 공통 구조. 신규 토큰 없음 — 기존 `game-panel`/`bg-background` 등만 사용.

## 뷰포트 높이 예산
`Header`(`h-16`=4rem) + `main`(`px-4 py-6`, 상하 padding=3rem) = 7rem은 이미 페이지 레벨에서 소비됨.
`lg:hidden` 루트 컨테이너는 다음으로 고정한다(기존 `min-h-[calc(100dvh-10rem)]` 대체):

```
h-[calc(100dvh-7rem)] flex flex-col overflow-hidden
```

내부는 flex column, 각 존은 `shrink-0` 또는 `flex-1 min-h-0`으로 예산을 나눠 갖는다(고정 rem 배분 금지 — 배너 가변 높이를 흡수하기 위해 나머지는 flex로 처리).

## 존 배치 (위→아래)

| 순서 | 존 | 클래스 힌트 | 비고 |
|---|---|---|---|
| 1 | 상단 상태 카드(타이틀+타이머) | `shrink-0` | 기존 그대로, 약 4rem |
| 2 | 조건부 배너(PAUSED/ASSIGNING) | `shrink-0` | 있을 때만 렌더, 레이아웃 시프트 허용(요구사항 §특이사항 권장안 1 채택) |
| 3 | 탭 콘텐츠 영역 | `flex-1 min-h-0 flex flex-col` | 경매/현황 패널 두 개를 **항상 함께 마운트**, 비활성 쪽에 `hidden`(display:none)만 토글 — 언마운트 금지(요구사항 §1) |
| 4 | 하단 탭바 | `shrink-0 h-14` | `mobile-tab-bar-spec.md` 참조 |

탭 콘텐츠 영역 내부 두 패널:
```tsx
<div className={cn('flex-1 min-h-0 flex flex-col', activeTab !== 'auction' && 'hidden')}>
  {/* 경매 패널 */}
</div>
<div className={cn('flex-1 min-h-0 overflow-y-auto', activeTab !== 'status' && 'hidden')}>
  {/* 현황 패널 — TeamSidebar */}
</div>
```
두 `div`는 형제로 같은 부모(`flex-1 min-h-0`)의 자식 — `hidden`이 아닌 쪽만 실제로 높이를 차지하므로 서로 겹치지 않는다.

## 경매 패널 내부 (관전자/팀장 공통 + 팀장 전용 1개 추가)

```
[스테이지 HUD]      shrink-0, h ≈ 38~42vh (mobile-stage-spec.md)
[입찰 컨트롤]        shrink-0, 팀장만 (기존 BidButtonsRow 카드, sticky 불필요 — 탭 자체가 스크롤 컨테이너 밖)
[채팅 ChatPanel]     flex-1 min-h-0 (남은 높이 전부, 세로 스크롤은 ChatPanel 내부가 담당)
```
- 스테이지 높이는 `vh` 단위 사용(고정 rem 대신) — 작은 기기에서도 채팅 영역이 완전히 사라지지 않게 함. 정확 수치는 Implementor가 375~430px + 낮은 높이 기기(iPhone SE 667px) 실측 후 38~42vh 범위 내 확정.
- 팀장 뷰의 기존 `sticky bottom-0 backdrop-blur-sm` 처리는 **제거**(요구사항 §5) — 탭 전환이 곧 화면 전환이라 페이지 스크롤 대응이 불필요해짐. 단순 `shrink-0` 블록으로.
- `ChatPanel`은 기존 `h-full flex flex-col` 구조 그대로, `flex-1 min-h-0` 부모 안에 그대로 배치.

## 현황 패널 내부

```
[TeamSidebar]  overflow-y-auto (부모 div에 부여), 내부 space-y-3 그대로
```
- `team-sidebar.tsx` 스타일 무변경. `p-3` 등 패딩만 래퍼 div(`px-1 py-2` 정도)로 감싸는 것은 허용.
- 관전자: 기존 props(`teams`/`startingPoints`/`rosterMode`/`highlightCaptainId`) 그대로.
- 팀장: 위 + `myCaptainId` 추가.

## 접근성/모션
- 탭 전환 자체는 순간 전환(트랜지션 없음, `hidden` 토글이므로 자연히 즉시) — 추가 애니메이션 불필요.
- `prefers-reduced-motion`은 하위 컴포넌트(BidTimer/MobileAuctionStage) 각자 처리, 레이아웃 자체엔 모션 없음.

## 구현 시 건드리는 파일
- `auction-ongoing-spectator.tsx` `lg:hidden` 블록(128-158행) 전면 교체
- `auction-ongoing-captain.tsx` `lg:hidden` 블록(261-325행) 전면 교체
- `hidden lg:grid` 데스크톱 블록은 무변경
