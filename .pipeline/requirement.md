# POTG 모바일 경매 스테이지 재설계 — 3차 사이클

## 생성일시
2026-07-03 (조사 완료, 사용자 스코프 확정 반영 최종본 — v2)

## 목적
- 왜 만드는가: 1·2차에서 모바일 관전자/팀장 뷰를 만들었으나(`lg:hidden` 블록), 실제 구조는 데스크톱 세로 배치 컴포넌트(매물 카드 → 채팅)를 그대로 위아래로 쌓은 것에 불과하다. 사용자 평가: "그냥 위에서 아래로 뿌리는 거잖아" — 방송 시청 경험이 아니다. 하단 탭 네비게이션으로 "경매(방송+채팅)"와 "현황(팀 카드)"을 분리한 앱 스타일 구조로 재설계하되, **오늘 경매에 바로 쓸 수 있도록 P0를 최대한 얇게** 유지한다.
- 누가 사용하는가: 모바일 관전자(`AuctionOngoingSpectator`), 모바일 팀장(`AuctionOngoingCaptain`). 관리자(마스터) 뷰는 이번 스코프에서 **제외**(기존 그대로 유지, 모바일 대응 안 함). 데스크톱(`lg` 이상)은 무변경.
- 기대 효과: 메인 화면(경매 탭)에서 현재가·입찰 선두·마감 타이머·채팅에 집중하고, 필요할 때만 탭을 넘겨 팀 현황을 확인하는 구조 — 방송 시청 중 채팅 몰입도와 팀 정보 확인 니즈를 탭으로 분리해 둘 다 방해하지 않는다.

## 스코프

### 포함 (이번에 만드는 것) — P0
- [ ] **하단 고정 탭바(관전자/팀장 공통, 마스터 제외)**: 탭 1 "경매"(기본 선택) / 탭 2 "현황". 탭 전환은 **클라이언트 상태 기반**(Next.js 라우트 이동 금지 — 라우트 이동 시 소켓 연결이 끊겨 `roomState`를 다시 받아야 함).
- [ ] **탭 1 "경매"**: 상단 고정 스테이지(현재 매물 초상화+이름, 현재가 큰 숫자, 입찰 선두, 도화선 타이머 바, 컴팩트 최근 입찰 티커) + (팀장만) 입찰 버튼 + 하단 채팅(남은 높이 전부)
- [ ] **탭 2 "현황"**: 팀 카드들을 세로 스크롤로 계속 볼 수 있는 화면 — 기존 `TeamSidebar` 재사용(로스터/남은 포인트 그대로)
- [ ] 페이지 스크롤 제거(`100dvh` 고정) — 탭 콘텐츠 영역 내부 스크롤만 허용(경매 탭: 채팅만 세로 스크롤 / 현황 탭: 팀 카드 목록 전체가 세로 스크롤)
- [ ] 탭 전환 시에도 **소켓/채팅 상태 유지**(채팅 입력창 draft·스크롤 위치 유실 없음) — 언마운트가 아닌 CSS 토글 방식으로 구현(아래 "탭 구현 방식" 참조)
- [ ] 탭 전환 시에도 **경매 이벤트 사운드는 계속 재생**(입찰/낙찰/도화선 크래클/전설 공개음 등) — 위와 동일한 이유로 탭 비활성 상태에서도 관련 컴포넌트가 언마운트되지 않아야 자연히 만족됨
- [ ] 2차 연출(팩오프닝 플립/전설 플래시, 입찰 임팩트/콤보, 도화선 타이머, 낙찰 골든카드)이 경매 탭 스테이지 크기에 맞게 재생 유지
- [ ] 오버워치 테마 탭바(skewed/네온 스타일), 터치 타겟 44px 이상

### 포함 (P1 — 시간 되면)
- [ ] 탭 3 "매물"(매물 풀 현황) — 필요 판단 시 별도 탭, 아니면 현황 탭에 통합. 기존 `PlayerStatusGrid`(데스크톱 우측 컬럼에서 이미 사용 중) 재사용 검토

### 포함 (P2 — 낮은 우선순위)
- [ ] 낙찰 시 flight-in 모바일 축소판 — **P1→P2 하향**(메인 경매 탭에 팀 대상 UI가 더 이상 없으므로 flight 목적지가 불명확해짐). 구현 안 해도 무방, 낙찰 시 정적 갱신(현황 탭에 반영)이면 충분.

### 제외 (이번에 만들지 않는 것)
- **팀 현황 가로 스트립 — 스코프에서 완전히 제거**(경매 탭 메인 화면에 팀 정보 노출 안 함, 현황 탭으로 이동)
- 매물 풀 현황의 경매 탭 노출(P1 별도 탭 또는 현황 탭 통합으로만 검토)
- 관리자(마스터) 뷰 모바일 대응 — 기존 상태 그대로 유지, 이번 스코프 아님
- 데스크톱(`lg` 이상) 레이아웃 변경 — `hidden lg:grid` 블록은 무변경
- 신규 소켓 이벤트/백엔드 API 변경 — 기존 `roomState`/`bidEvents`/`stageEvent`/`chatMessages` payload만 사용
- 2차 연출 로직 자체의 재구현(팩오프닝 상태머신, 콤보 판정, 등급 산정 등) — 재사용/재배치만 하며 판정 로직 변경 없음
- 신규 npm 패키지 도입
- 결과 화면(`auction-completed.tsx`) — 이번 스코프는 진행 중(ONGOING) 화면 2개(관전자/팀장)로 한정

## 기술스택
- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS(전용, 신규 CSS 파일 금지), framer-motion(기존 의존성)
- **탭 컴포넌트**: `frontend/src/common/components/ui/tabs.tsx`(Shadcn/Radix 기반)가 이미 존재한다. 재사용 검토 시 **주의**: Radix `Tabs.Content`는 기본적으로 비활성 탭을 **언마운트**하므로, 채팅 상태 유지 요구사항과 충돌한다 — 재사용하려면 `forceMount` prop + 수동 `hidden`/`data-state` 기반 CSS 토글 조합이 필요하다. 오버워치 스타일 하단 앱바(아이콘+라벨, skewed) 형태가 Radix Tabs 기본 스타일과 많이 달라 스타일링 오버헤드가 크므로, **커스텀 경량 탭바 컴포넌트를 새로 작성하는 것을 권장**(상태 관리만 `useState`로 직접, 접근성은 `role="tablist"`/`role="tab"`/`aria-selected` 수동 부여로 충분히 확보 가능, Radix 의존 없이 신규 패키지 추가도 아님).
- 대상 파일(조사 완료):
  - `frontend/src/modules/auction/components/auction-ongoing-spectator.tsx` (161줄) — `lg:hidden` 블록(128-158행) 전면 재작성 대상
  - `frontend/src/modules/auction/components/auction-ongoing-captain.tsx` (328줄) — `lg:hidden` 블록(261-325행) 전면 재작성 대상
  - `frontend/src/modules/auction/components/parts/current-player-card.tsx` (615줄) — 데스크톱 카드는 무변경, 상태 로직(플립/전설/콤보/셀레브레이션) 공유 대상
  - `frontend/src/modules/auction/components/parts/bid-timer.tsx` (218줄) — 스테이지 바 변형 추가 대상
  - `frontend/src/modules/auction/components/parts/team-sidebar.tsx` (297줄) — **무변경**, 현황 탭에서 그대로 재사용(스크롤 컨테이너로만 감싸면 됨)
  - `frontend/src/modules/auction/components/parts/chat-panel.tsx` (140줄) — `h-full flex flex-col` 구조 그대로 재사용, 탭 비활성 시 언마운트 금지(CSS 토글)
  - `frontend/src/app/auction/page.tsx` — `Header`(sticky h-16) + `main`(`px-4 py-6`)이 모바일 뷰포트 예산에 포함됨(특이사항 참조)
- Backend: NestJS 11 — **이번 스코프는 미접근**

## 핵심 기능

### P0 (필수)

#### 1. 탭 구현 방식 — 클라이언트 상태 + CSS 토글(언마운트 금지)
- **왜 언마운트 금지인가**: 탭 2 "현황"으로 이동했다가 "경매"로 돌아왔을 때 `ChatPanel`이 언마운트→재마운트되면 (1) 입력 중이던 draft 텍스트 유실 (2) 스크롤 위치가 항상 맨 아래로 리셋됨(치지직류 채팅 UX와 어긋남) (3) 경매 사운드/도화선 크래클을 트리거하는 `use-player-card-stage`/`BidTimer` 내부 `useEffect`가 매번 재시작되어 중복 사운드나 상태 오염 가능성이 생긴다.
- **채택 방식**: 탭 콘텐츠 2개(경매/현황)를 **항상 함께 마운트**하고, 비활성 탭은 `className={cn(..., activeTab !== 'auction' && 'hidden')}`처럼 Tailwind `hidden`(`display:none`)으로만 감춘다. `display:none` 상태에서도 React 컴포넌트의 상태·타이머·이벤트 리스너는 그대로 유지되므로 채팅 draft·스크롤·사운드 타이머 모두 보존된다. 시각적 애니메이션(예: 콤보 흔들림)이 숨겨진 동안 재생되지 않는 것은 허용 가능한 트레이드오프(탭이 안 보이는데 화면 흔들림이 의미 없음).
- **위 이유로 탭 전환 시 사운드/소켓 유지 요구사항은 "탭 밖 공통 위치로 훅 이동" 없이도 CSS 토글만으로 자연히 만족된다** — 별도의 전역 오디오 훅 재배치 작업 불필요.
- **상태 위치**: `activeTab` state는 `auction-ongoing-spectator.tsx`/`auction-ongoing-captain.tsx`의 `lg:hidden` 블록 최상단에서 각자 관리(두 파일이 공유할 상위 상태 저장소 불필요 — 관전자와 팀장은 애초에 다른 컴포넌트 트리).

#### 2. 하단 탭바
- **신규 컴포넌트**: `frontend/src/modules/auction/components/parts/mobile-tab-bar.tsx` — 아이콘(예: `Gavel`/`Radio` = 경매, `Users` = 현황) + 라벨, 2개(P1 채택 시 3개) 탭 버튼. `role="tablist"`, 각 버튼 `role="tab"` + `aria-selected`, 터치 타겟 최소 44px(예: `h-14`). 활성 탭은 오버워치 네온(`text-primary`/`border-primary` 등 기존 토큰) 강조, skewed 버튼 스타일은 기존 `game-btn` 클래스 패턴 참고.
- **배치**: `lg:hidden` 컨테이너 내부 최하단 `shrink-0` 요소로 배치(별도 `fixed` 불필요 — 컨테이너 자체가 이미 뷰포트 높이에 고정되어 있으므로 flex 마지막 자식으로 충분).

#### 3. 경매 탭 — 상단 고정 스테이지
- **구현 방식 결정: 기존 `CurrentPlayerCard`의 prop 분기가 아니라 신규 컴포넌트를 만든다.** `current-player-card.tsx`는 이미 615줄이며 데스크톱 레이아웃(세로 중앙 정렬, 아바타 176px + 하단 입찰가 패널)과 모바일 HUD(초상화 중심 + 오버레이 텍스트)는 DOM 트리 자체가 다르다. `compact` boolean 분기는 파일을 800줄 제한에 근접시키고 유지보수성을 떨어뜨린다.
- **상태 로직 공유**: 매물 전환 감지, 등급 판정(`getCardRarity`), 팩오프닝 플립 타이밍, 전설 버스트 트리거, 콤보 카운트(`bidComboLevel`), 낙찰/유찰 셀레브레이션 상태(`celebrate`)를 신규 훅 `frontend/src/modules/auction/hooks/use-player-card-stage.ts`로 추출해 `CurrentPlayerCard`(데스크톱)와 신규 `MobileAuctionStage`가 함께 구독한다 — 사운드 중복 발화 방지, 두 뷰 간 판정 로직 불일치 방지.
- **신규 컴포넌트**: `frontend/src/modules/auction/components/parts/mobile-auction-stage.tsx` — 초상화(아바타) 중심 + 오버레이(현재가 펀치 애니메이션, 입찰 선두, 도화선 타이머 바, 최근 입찰 2~3건 컴팩트 티커). 팩오프닝 플립/등급 프레임/전설급 플래시·파티클·사운드는 공유 훅 상태 그대로 반영(모바일 축소 강도 기준은 기존 `current-player-card.tsx`의 `isDesktop` 분기 값 재사용 — 파티클 12개, 콤보 흔들림 진폭 50%).
- **티커**: `bidEvents`(`AuctionBidEvent[]`) 최근 2~3건만 컴팩트 표시 — `BidLog`(세로 카드형, 최대 8건)를 그대로 얹기엔 부적합하므로 `mobile-auction-stage.tsx` 내부 서브파트 또는 `parts/fx/mobile-bid-ticker.tsx`로 분리(파일 길이에 따라 Implementor 판단).

#### 4. 도화선 타이머 — 스테이지 바 변형
- `bid-timer.tsx`(218줄, 단일 소유 파일)를 재작성 없이 확장 — 신규 `variant`(예: `'bar'`) 또는 `showNumber={false}` prop 추가, 기존 `isUrgent` 불꽃/스파크/연소 텍스처/`startFuseCrackle`/`aria-live`/`role=timer` 로직은 그대로 두고 시각 배치만 스테이지에 맞게 전폭 바 형태로 조정. **`bid-timer.tsx`가 타이머 시각 로직의 단일 소유자로 유지**(별도 모바일 전용 타이머 컴포넌트 신규 작성 금지).

#### 5. 경매 탭 — 입찰 컨트롤(팀장 전용)
- 기존 `auction-ongoing-captain.tsx:272-312`의 `sticky bottom-0` 입찰 컨트롤 바(2차 task-006, `BidButtonsRow`)를 새 탭 구조 안에서 스테이지와 채팅 사이 `shrink-0` 요소로 재배치. 탭 전환이 곧 "다른 화면"이므로 페이지 스크롤에 대응하던 `sticky`/`backdrop-blur` 처리는 불필요해져 단순화된다. 버튼 로직(`bidDisabled` 판정 등)은 변경 없음.

#### 6. 경매 탭 — 채팅
- 기존 `ChatPanel` 그대로 재사용, `flex-1 min-h-0`으로 남은 높이 전부 채움. 탭 비활성화 시에도 언마운트되지 않도록 위 "탭 구현 방식"(CSS `hidden` 토글)을 반드시 지킨다.

#### 7. 현황 탭 — 팀 카드
- 기존 `TeamSidebar`(297줄, **무변경**)를 현황 탭 콘텐츠로 그대로 렌더링, 상위를 `overflow-y-auto` 스크롤 컨테이너로 감싸기만 하면 된다. 관전자는 기존 props 그대로(`teams`/`startingPoints`/`rosterMode`/`highlightCaptainId`), 팀장은 `myCaptainId`까지 추가 전달(데스크톱 팀장 뷰와 동일 props).

### P1 (시간 되면)

#### 8. 탭 3 "매물"(매물 풀 현황)
- 기존 `PlayerStatusGrid`(데스크톱 우측 컬럼에서 이미 사용 중, `roomState` 전체를 받는 구조로 추정 — Implementor는 착수 전 `parts/player-status-grid.tsx` 확인) 재사용 검토. 별도 탭이 부담되면 현황 탭 하단에 이어붙이는 것도 허용.

### P2 (낮은 우선순위)

#### 9. flight-in 모바일 축소판
- 메인 경매 탭에 더 이상 팀 UI가 없어 flight 목적지가 불명확해졌으므로 P1→P2 하향. 낙찰 시 현황 탭의 `TeamSidebar`가 다음 재렌더에서 정적으로 갱신되는 것으로 충분(데스크톱과 달리 모바일은 애초에 그 순간 다른 탭을 보고 있을 수도 있어 flight 애니메이션의 체감 가치가 낮음).

## 제약사항
- 데스크톱(`lg` 이상) 레이아웃 무변경 — 기존 `hidden lg:grid` 블록 및 그 안의 `CurrentPlayerCard`/`TeamSidebar`/`BidTimer`(기본 `size='lg'`) 사용은 그대로 유지, 신규 prop/variant의 기본값은 기존 데스크톱 동작과 100% 동일해야 한다.
- 관리자(마스터) 뷰는 이번 스코프 제외 — `auction-master-view.tsx` 등 관련 파일 수정 금지.
- 탭 전환은 **클라이언트 상태 기반 조건부 렌더링만 허용, Next.js 라우트 이동 금지**(소켓 연결 유지 필수).
- 탭 콘텐츠는 **언마운트 금지, CSS `hidden` 토글만 사용**(채팅 draft/스크롤 보존, 사운드 타이머 보존).
- 신규 npm 패키지 도입 금지 — framer-motion 등 기존 의존성만 사용. `ui/tabs.tsx`(Radix) 재사용은 선택 사항이며 강제하지 않음(위 기술스택 항목 참조).
- 백엔드 무변경 — 기존 `roomState`/`bidEvents`/`stageEvent`/`chatMessages` payload 필드만 사용.
- `frontend/src/components/ui/*`(Shadcn), `frontend/src/lib/utils.ts` 수정 금지 — `cn()` 유틸로 클래스 병합.
- `any` 타입 사용 금지.
- Tailwind CSS만 사용, 신규 CSS 파일 생성 금지(기존 `globals.css` keyframe 확장은 허용 범위).
- 오버워치 테마(futuristic, skewed buttons, 고대비 네온) 및 기존 디자인 토큰(`--ow-gold`, `--ow-blue`, `--ow-red` 등) 유지 — 하드코딩 색상/폰트/간격 금지. 탭바도 동일 테마, 터치 타겟 44px 이상.
- `prefers-reduced-motion: reduce` 대응 필수 — 스테이지 플립/흔들림/파티클/티커 등장 애니메이션 전부 기존 원칙(정지 또는 정적 대체) 동일 적용.
- 파일 크기 — 신규 컴포넌트도 200~400줄 권장, 최대 800줄. `current-player-card.tsx`(현재 615줄)는 상태 로직 추출로 오히려 줄어드는 방향을 지향(신규 마크업 추가 없음).
- `no_push`: 사용자 확인 후 직접 push(Vercel 배포 트리거) — Integrator/Orchestrator가 임의로 push하지 않는다.
- **속도 우선**: 오늘 경매에 바로 쓸 수 있어야 하므로 P0 범위를 넘어서는 리팩터링(예: 데스크톱 컴포넌트 대규모 정리)은 하지 않는다.

## 성공 기준
- [ ] 375px~430px 폭 모바일 화면에서 관전자/팀장 뷰 모두 **페이지 자체 스크롤이 발생하지 않는다**.
- [ ] 하단 탭바에서 "경매"↔"현황" 전환이 라우트 이동 없이 즉시 이루어지고, 전환 중에도 채팅 연결·타이머·roomState 갱신이 끊기지 않는다.
- [ ] "현황" 탭에 머무는 동안 입찰/낙찰이 발생하면 해당 사운드가 정상 재생된다(탭이 안 보여도 소켓/오디오 로직은 계속 동작).
- [ ] "경매" 탭으로 돌아왔을 때 채팅 입력 중이던 draft 텍스트와 스크롤 위치가 유지된다(언마운트로 인한 초기화 없음).
- [ ] 경매 탭 스테이지에서 입찰 발생 시 현재가 숫자가 펀치 애니메이션과 함께 갱신되고, 최근 입찰 티커에 새 항목이 흐른다.
- [ ] 마감 5초 전부터 스테이지 타이머 바에 도화선(불꽃/스파크) 연출과 지지직 사운드가 발화한다(기존 `isUrgent` 판정·`aria-live` 접근성 유지).
- [ ] 새 매물 공개 시 스테이지에서 팩오프닝(플립→정면 공개) 및 전설급 매물의 화면 플래시/파티클/사운드가 데스크톱과 동일한 판정 기준으로 발화한다(모바일 축소 강도 유지).
- [ ] "현황" 탭에서 팀별 로스터/잔여 포인트가 세로 스크롤로 전부 확인 가능하다(기존 `TeamSidebar` 표시 항목 그대로).
- [ ] 팀장 모바일 "경매" 탭에서 입찰 버튼(4종 증액)이 정상 동작하고, 팀 정원 마감/최고 입찰자 등 기존 상태 메시지가 그대로 노출된다.
- [ ] `prefers-reduced-motion: reduce` 환경에서 스테이지의 모든 동적 연출이 생략되거나 정적 버전으로 대체된다.
- [ ] 데스크톱(`lg` 이상) 관전자/팀장 뷰가 기존과 동일하게 동작한다(회귀 없음).
- [ ] 관리자(마스터) 뷰는 이번 변경의 영향을 받지 않는다.
- [ ] `cd frontend && npm run lint && npm run build` 통과.

## 특이사항

### 뷰포트 높이 예산 — Planner 단계에서 결정 필요
페이지 스크롤 제거를 위한 `calc(100dvh - Nrem)` 값은 다음 요소를 모두 포함해야 정확하다:
- `Header`(sticky, `h-16`=4rem, `frontend/src/common/layouts/header.tsx:27`)
- `main`의 `px-4 py-6`(상하 padding 합 3rem, `frontend/src/app/auction/page.tsx:29`)
- 상단 상태 카드(타이틀+타이머, 관전자/팀장 공통, 약 4rem)
- 조건부 배너(관전자: `PAUSED` 1종 / 팀장: `PAUSED`, `ASSIGNING` 2종) — **가변 높이**
- **신규: 하단 탭바 높이**(예: `h-14`=3.5rem) — 탭 콘텐츠 영역이 이만큼 줄어듦

권장안(배너 처리) 두 가지 중 Planner가 택일:
1. 배너를 `flex` 존 구조 안의 `shrink-0` 요소로 포함시켜, 배너가 뜨면 스테이지/채팅 영역이 그만큼 줄어들도록 설계(레이아웃 시프트는 있지만 페이지 스크롤은 없음)
2. 배너를 레이아웃을 밀지 않는 오버레이/토스트로 전환

기존 주석(`auction-ongoing-spectator.tsx:122-127`, `auction-ongoing-captain.tsx:256-260`)이 이미 이 계산 근거를 일부 문서화해 두었으니 갱신해 이어가면 된다.

### 컴포넌트 구성안 (조사 결론, 최종)
| 파일 | 상태 | 비고 |
|---|---|---|
| `hooks/use-player-card-stage.ts` | 신규 | 플립/등급/전설버스트/콤보/셀레브레이션 상태 — `CurrentPlayerCard`와 `MobileAuctionStage` 공유 |
| `parts/mobile-auction-stage.tsx` | 신규 | 경매 탭 상단 스테이지 HUD(초상화+현재가+선두+타이머+티커) |
| `parts/mobile-tab-bar.tsx` | 신규 | 하단 탭바(경매/현황, P1 채택 시 매물) |
| `parts/fx/mobile-bid-ticker.tsx` | 신규(또는 stage 내부 서브파트) | 최근 입찰 2~3건 티커 |
| `parts/bid-timer.tsx` | 확장 | `variant`/`showNumber` prop 추가, 기존 동작은 기본값으로 보존 |
| `parts/current-player-card.tsx` | 리팩터(축소) | 상태 로직을 공유 훅으로 이전, 데스크톱 마크업/동작 변경 없음 |
| `parts/team-sidebar.tsx` | **무변경** | 현황 탭에서 스크롤 컨테이너로만 감싸 그대로 재사용 |
| `parts/chat-panel.tsx` | 무변경 | 경매 탭 `flex-1` 존에 재사용, 탭 비활성 시 언마운트 금지 |
| `parts/player-status-grid.tsx` | 무변경(P1 채택 시 재사용 검토) | 매물 탭 후보 |
| `auction-ongoing-spectator.tsx` | 수정 | `lg:hidden` 블록만(128-158행) 탭 구조로 전면 재작성, `hidden lg:grid` 블록 무변경 |
| `auction-ongoing-captain.tsx` | 수정 | `lg:hidden` 블록만(261-325행) 탭 구조로 전면 재작성, `hidden lg:grid` 블록 무변경 |
| `auction-master-view.tsx` | **무변경(스코프 제외)** | |

### 이전 지시와의 차이(참고용, 최종 버전 = 이 문서)
사용자 스코프가 두 차례 조정되었다: (1) 최초 "팀 현황 가로 스트립" 컨셉 → (2) "팀 스트립 제거, 하단 메뉴 버튼으로 팀 카드 바텀시트" → (3) **최종: 바텀시트 대신 하단 탭 네비게이션으로 화면 자체를 전환**(이 문서에 반영된 버전). Implementor는 이 문서만을 기준으로 작업하며, 팀 스트립/바텀시트 관련 과거 논의는 참고하지 않는다.

### flight-in P2 하향 근거
경매 탭 메인 화면에 팀 UI가 없어졌으므로(팀 카드는 별도 탭), 낙찰 순간 카드가 "날아갈" 시각적 목적지가 현재 화면에 존재하지 않을 수 있다(사용자가 경매 탭을 보고 있어도 목적지인 팀 카드는 현황 탭에 있어 안 보임). 데스크톱은 기존 flight-in(`layoutId` 공유, `LayoutGroup`)을 그대로 유지하며 영향 없음.
