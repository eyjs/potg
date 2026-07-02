## [Unreleased] - 2026-07-03

### Added
- 매물 공개 팩 오프닝 연출 추가 (`current-player-card.tsx`, `card-rarity.ts` 신규): 새 매물 등장 시 카드 뒷면→3D 플립→정면 공개, 매물 id 기반 결정적 등급(일반/레어/레전더리, 순수 코스메틱) 프레임 표시. 레전더리 등급 공개 시 전체화면 플래시(portal) + 파티클 + 전용 사운드가 1회 발화.
- 입찰 카드 임팩트 + 콤보 연출 추가 (`current-player-card.tsx`): 입찰가 변경 시 금액 임팩트 애니메이션 + 미세 화면 흔들림. `currentBid` 변경 시각 기반 로컬 콤보 계산으로 연속 입찰 시 콤보 배지 및 강도 상승, 매물 전환/무입찰 시 리셋.
- 도화선 타이머 연출 추가 (`bid-timer.tsx`, `globals.css` 신규 키프레임): 마감 5초 전(`isUrgent`)부터 게이지 끝단 불꽃/스파크 + 연소 텍스처 오버레이, 도화선 크래클 사운드 진입/이탈 연동. 기존 `role=timer`/`aria-live`/`isUrgent`/`isEnded` 구조 무변경.
- 낙찰 골든카드 + 팀보드 flight-in 추가 (`current-player-card.tsx`, `team-sidebar.tsx`, `auction-ongoing-{captain,master,spectator}.tsx`): 낙찰 시 카드 골드 변신, 낙찰 팀 `TeamSidebar`의 신규 멤버 슬롯에 진입 애니메이션 + framer-motion `layoutId` 공유(`flight-card-${id}` 규약)를 통한 flight morph. 3개 뷰를 `LayoutGroup`으로 래핑.
- 팀장(captain) 화면 모바일 레이아웃 대응 (`auction-ongoing-captain.tsx`, 사용자 피드백 feedback-002 반영): 관전자 뷰와 동일한 `hidden lg:grid`/`lg:hidden` 분기로 데스크톱 JSX 무변경 유지한 채 모바일 세로 스택(매물 카드 → sticky 하단 입찰 컨트롤 → 채팅 flex-1) 추가. 입찰 버튼 80px 터치 타겟, 채팅 스크롤 중에도 입찰 컨트롤 상시 접근. 팀 현황/입찰 로그는 모바일에서 생략.
- Web Audio 오디오 엔진 SSOT 신설 (`auction-audio-engine.ts` 신규): 모듈 싱글턴 `AudioContext` 기반 ADSR 엔벨로프·다중 오실레이터 디튠·BiquadFilter 스윕·노이즈 버스트·ConvolverNode 리버브 합성. `playRevealLegendary`/`startFuseCrackle`/`stopFuseCrackle` 등 명령형 함수 export로 카드·타이머가 소켓을 거치지 않고 직접 사운드 재생.

### Changed
- 경매 입찰/낙찰/유찰 효과음 전면 재설계 (`use-auction-sound.ts`): 1차 사이클의 단일 오실레이터 삐- 톤을 게임급 레이어드 합성으로 교체(사용자 피드백 반영). 입찰음은 콤보 단계에 따라 피치/밝기 상승, 낙찰음은 아르페지오 팡파레 + 리버브 테일, 유찰음은 절제된 낙담 톤. `useAuctionSound(bidEvents, stageEvent)` 훅 시그니처 및 `use-auction-socket.ts` 무변경, 신규 npm 패키지/오디오 에셋 추가 없음.

### Deferred
- 낙찰 순간 OverFast 스킬 영상 배경 재생(P2, task-005)은 파일 용량/모바일 성능 리스크로 이번 사이클에서 보류.
