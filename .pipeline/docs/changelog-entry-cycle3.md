## [Unreleased] - 2026-07-03 (cycle3)

### Added
- 모바일 하단 탭 네비게이션 추가 (`mobile-tab-bar.tsx` 신규): "경매"/"현황" 2개 탭, `role=tablist`/`role=tab`/`aria-selected` 수동 부여, 터치 타겟 `h-14`(≥44px), 오버워치 네온 스타일. Radix `ui/tabs.tsx` 대신 경량 커스텀 컴포넌트로 신규 패키지 없이 구현.
- 모바일 경매 탭 스테이지 HUD 추가 (`mobile-auction-stage.tsx` 신규, 375줄): 초상화 중심 HUD(현재가 펀치 애니메이션, 입찰 선두, 도화선 타이머 바, 최근 입찰 티커). 팩오프닝/전설 버스트/콤보 판정은 공유 훅에서 그대로 반영.
- 최근 입찰 컴팩트 티커 추가 (`fx/mobile-bid-ticker.tsx` 신규, 78줄): `bidEvents` 최근 2~3건만 표시.
- 매물 카드 상태 로직 공유 훅 추출 (`hooks/use-player-card-stage.ts` 신규, 276줄): 매물 전환 감지, 등급 판정, 팩오프닝 플립, 전설 버스트, 콤보 카운트, 셀레브레이션 상태를 데스크톱 `CurrentPlayerCard`와 신규 `MobileAuctionStage`가 공유 구독. `ownerViewport`/`isActiveViewport` 게이트로 데스크톱·모바일 동시 마운트 시 사운드/시각 이중 발화를 방지.
- `bid-timer.tsx`에 스테이지 바 variant 확장: `variant`, `showNumber`, `soundEnabled` prop 추가(기본값은 기존 동작과 100% 동일). 크래클 사운드는 상단 상태카드의 헤더 타이머가 단독 소유(`soundEnabled` 기본 true), 스테이지 바 타이머는 무음(`soundEnabled={false}`)으로 이중 크래클 방지.

### Changed
- `auction-ongoing-spectator.tsx`, `auction-ongoing-captain.tsx`: 모바일(`lg:hidden`) 블록을 세로 스택 나열 방식에서 탭 구조(경매/현황)로 전면 재작성. `activeTab` 클라이언트 상태 + CSS `hidden` 토글로 탭을 전환하며, 두 탭 콘텐츠는 항상 동시 마운트(언마운트 금지)해 채팅 draft/스크롤/사운드 타이머를 보존. 뷰 루트를 모바일에서만 `flex flex-col h-[calc(100dvh-7rem)] overflow-hidden`으로 전환(데스크톱은 `lg:block lg:h-auto lg:overflow-visible`로 100% 리셋)해 페이지 자체 스크롤을 제거.
- `current-player-card.tsx`: 상태 로직을 `use-player-card-stage.ts`로 추출한 순수 리팩터(-212줄). 데스크톱 마크업/동작은 변경 없음.
- `current-player-card.tsx`: 전설 공개 전체화면 플래시 portal에 `isActiveViewport` 게이트 추가(코드 리뷰 블로커 수정, 12a8ad7). 모바일 뷰포트에서 데스크톱 인스턴스가 함께 마운트되어 있어도 portal이 1회만 발화하도록 수정.

### Deferred
- P1 탭 3 "매물"(매물 풀 현황, `PlayerStatusGrid` 재사용 검토): 시간 관계상 이번 사이클에서 미착수.
- P2 낙찰 시 flight-in 모바일 축소판: 경매 탭에 팀 UI가 없어 flight 목적지가 불명확해져 P1→P2 하향, 구현 안 함(현황 탭 `TeamSidebar` 정적 갱신으로 대체).

### Notes
- 변경 파일: `frontend/src/modules/auction/` 8개(신규 4 + 수정 4), 총 +1113/-343줄. 백엔드/docker-compose/.github 무변경.
- 검증: `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors(기존 무관 경고 2건 제외), `npm run build` 성공(16 라우트).
