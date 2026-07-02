# ADR-002: 2차 사이클 파일 소유권 분할 — 사운드 엔진 SSOT, 카드 통합 소유, 콤보 로컬 계산, flight-in 문자열 규약, 코스메틱 등급

- 상태: 채택됨 (Accepted)
- 일시: 2026-07-03
- 관련 태스크: `.pipeline/tasks/task-001.md` ~ `.pipeline/tasks/task-004.md`
- 관련 계획: `.pipeline/plan.md` (AD-1 ~ AD-7)

## 컨텍스트

2차 사이클은 매물 공개(팩 오프닝) · 입찰 임팩트/콤보 · 도화선 타이머 · 낙찰 골든카드/팀보드 flight-in 4개 P0 기능을 구현해야 했다. 이 기능들은 공통적으로 3개의 파일을 공유한다.

- `use-auction-sound.ts` — 전설 공개 사운드, 콤보 피치 상승 입찰 사운드, 도화선 크래클 사운드 3개 기능이 모두 사운드를 필요로 한다.
- `current-player-card.tsx` — 매물 공개(플립/등급), 입찰(임팩트/콤보), 낙찰(골든카드/flight 소스) 3개 기능이 모두 이 카드의 겹치는 시각 영역(카드 프론트, 입찰가 패널, 셀레브레이션 오버레이)을 수정해야 한다.
- `globals.css` — 신규 키프레임과 그에 대응하는 `prefers-reduced-motion` 정지 규칙을 추가해야 한다.

Implementor는 worktree로 격리되어 병렬 실행되므로, 동일 파일을 서로 다른 태스크가 동시에 수정하면 머지 충돌이 발생한다. 또한 `use-auction-socket.ts`는 1차 사이클에서 이미 안정화된 소켓 배선 파일로, 재수정이 원칙적으로 금지되어 있었다(콤보 계산을 위해 `bidEvents`를 소켓 훅에 추가 노출하는 것도 금지 대상).

## 결정

### AD-1. 사운드를 모듈 싱글턴 오디오 엔진(`auction-audio-engine.ts`)으로 SSOT 분리하고, 훅 시그니처는 그대로 유지한다

`use-auction-sound.ts`의 공개 시그니처 `useAuctionSound(bidEvents, stageEvent)`를 **변경하지 않고**, 신규 파일 `auction-audio-engine.ts`에 모듈 레벨 단일 공유 `AudioContext`와 명령형 함수(`playBidSound`, `playSoldSound`, `playPassSound`, `playRevealLegendary`, `startFuseCrackle`/`stopFuseCrackle`, `unlockAudio`, 콤보 임계값 상수 `COMBO_WINDOW_MS`/`bidComboLevel`)를 export하는 방식으로 리팩터링했다. 훅은 unlock 리스너와 이벤트 트리거만 계속 담당하고, 실제 합성은 엔진이 수행한다. 카드(task-003)와 타이머(task-004) 같은 리프 컴포넌트는 소켓을 거치지 않고 엔진 함수를 직접 import해서 호출한다.

**맥락**: 1차 사이클의 사용자 직접 피드백(`feedback-001.md` "효과음 좀더 게임처럼 바꿔")에 따라 사운드 합성 로직 자체를 오실레이터 단일 톤에서 ADSR 엔벨로프 + 다중 오실레이터 디튠 + BiquadFilter + 노이즈 버스트 + ConvolverNode 리버브 조합으로 전면 교체해야 했고, 여기에 신규 사운드 3종(전설 공개/도화선 크래클, 콤보 피치)까지 추가되어 코드 규모가 크게 늘었다(`use-auction-sound.ts` 140줄 변경 + `auction-audio-engine.ts` 신규 513줄). 이를 하나의 파일에 몰아넣기보다 계산/합성 책임을 별도 엔진 모듈로 분리했다.

**대안**: (1) `use-auction-sound.ts` 한 파일 안에서 모든 합성 로직을 확장 — 파일이 지나치게 비대해지고, 카드/타이머가 사운드를 재생하려면 결국 소켓 훅을 거치거나 `use-auction-socket.ts`를 재수정해 이벤트를 추가로 노출해야 해 금지 제약과 충돌한다. 기각. (2) 카드/타이머 각자가 자체 Web Audio 로직을 갖는 방식 — `AudioContext`가 여러 개 생성되어 1차의 unlock(모바일 autoplay 정책 우회) 처리가 컨텍스트별로 중복/충돌할 위험이 있다. 기각.

**결과**: `use-auction-socket.ts`는 diff 0줄로 완전히 무변경 상태를 유지했다(통합 로그 확인). 단일 `AudioContext`이므로 unlock 중복 문제가 없고, 코드 리뷰에서도 "단일 공유 AudioContext — 훅 unlock과 엔진 재생이 동일 컨텍스트 사용" 항목이 통과했다. 카드/타이머는 엔진 함수를 import만 하면 되므로 사운드 관련 파일 충돌이 발생하지 않았다.

### AD-2. `current-player-card.tsx`를 단일 태스크(task-003)가 배타 소유하고, 3개 기능을 하나의 태스크로 통합했다

공개·입찰·낙찰 3개 기능을 병렬 태스크로 쪼개는 대신, task-003 하나가 이 파일 전체를 소유하고 내부적으로 P0-1(공개)/P0-2(입찰·콤보)/P0-4(낙찰) 3단계로 순차 구현하도록 설계했다.

**맥락**: 3개 기능이 수정해야 하는 영역(카드 프론트, 입찰가 패널, 셀레브레이션 오버레이)이 서로 겹쳐서, 파일 단위로 병렬 분할하면 동일 라인대의 충돌이 사실상 확정적이었다.

**대안**: 기능별로 3개 태스크를 병렬 실행하고 통합 단계에서 수동 머지 — worktree 격리의 장점(자동 병렬화)을 잃고, 충돌 해결에 통합 단계 시간이 더 소요될 것으로 판단해 기각.

**결과**: `current-player-card.tsx`는 654줄 변경(단일 커밋 `11d480d`)으로 3개 기능이 한 번에 안정적으로 병합됐고, 다른 태스크와의 파일 교집합이 없어 병렬 충돌이 발생하지 않았다. 대가로 이 태스크의 복잡도는 계획상 XL로 가장 컸다.

### AD-3. 콤보는 카드가 `currentBid` 변경 시각을 로컬 링버퍼로 추적해 자체 계산하고, `bidEvents` prop을 추가하지 않는다

카드에 `bidEvents`를 새 prop으로 추가하면 이를 전달하는 3개 뷰 파일(`auction-ongoing-captain/master/spectator.tsx`)을 모두 수정해야 하는데, 이 파일들은 flight-in 태스크(task-002)가 이미 `LayoutGroup` 래핑을 위해 소유하고 있었다. 대신 카드는 `currentBid.amount`가 바뀌는 시각을 `useRef` 링버퍼에 쌓아 `COMBO_WINDOW_MS`(3000ms) 이내 개수로 콤보를 계산한다. 이 값은 사운드 엔진(task-001)이 `bidEvents` 기반으로 계산하는 콤보와 **동일한 상수**(`COMBO_WINDOW_MS=3000`, 단계 임계값 L0:1/L1:2-3/L2:4-5/L3:6+)를 공유해 두 계산이 어긋나지 않도록 했다.

**맥락**: 모든 유효 입찰은 `currentBid`를 상승시키므로, `currentBid` 변경 스트림과 `bidEvents`의 `kind==='bid'` 스트림은 이론상 동일한 이벤트를 가리킨다.

**대안**: `bidEvents`를 prop으로 전달 — 뷰 파일 3개를 추가로 수정해야 해 task-002와 파일 교집합이 생기고, task-003이 Group A(task-002)의 머지를 코드 의존으로 기다려야 하는 등 병렬 구조가 깨진다. 기각.

**결과**: 뷰 파일 수정 없이 카드가 완전 자기완결적으로 콤보를 계산해 파일 충돌이 제거됐다. 코드 리뷰에서 두 계산 로직이 "동일 import"로 정합성을 확인했고, 잔여 리스크로 P2-3(콤보 자연 만료 타이머가 `currentBid` 참조만 바뀌는 리렌더에서 재스케줄되지 않는 엣지케이스)이 비차단 권고로 남았다.

### AD-4. flight-in은 framer-motion `layoutId` 문자열 규약(`flight-card-${id}`)으로 결합하고, 코드 import로 연결하지 않는다

카드(task-003)의 낙찰 셀레브레이션 골든카드는 `layoutId={\`flight-card-${lastPlayer.id}\`}`를, 사이드바(task-002)의 신규 멤버 슬롯은 `layoutId={\`flight-card-${member.id}\`}`를 부여한다. 낙찰된 매물의 `player.id`와 팀에 새로 들어온 `member.id`가 항상 동일하므로 두 layoutId 문자열이 일치해 framer-motion이 자동으로 위치 보간(morph) 애니메이션을 수행한다. 두 컴포넌트는 서로를 코드 레벨로 import하지 않는다.

**맥락**: task-002(뷰 3개 + 사이드바)와 task-003(카드)은 Group A/B로 실행 순서가 나뉘어 있었지만, 병렬 실행 그룹 내에서 서로 다른 파일을 소유해야 했기 때문에 파일 의존 없이 결합할 방법이 필요했다.

**대안**: 카드와 사이드바를 하나의 공용 훅/컨텍스트로 묶어 명시적으로 좌표를 주고받는 방식 — 신규 공유 파일이 생겨 결국 또 다른 소유권 충돌 지점을 만든다. 기각.

**결과**: 두 태스크는 파일 교집합 없이 병렬(Group B) 개발이 가능했고, 통합 로그에서 "flight-in layoutId 규약: 소스 `flight-card-${lastPlayer.id}` ≡ 타겟 `flight-card-${m.id}`, 일치"로 검증됐다. 다만 코드 리뷰에서 사이드바의 신규 멤버 판정이 `useEffect` 기반이라 마운트 렌더보다 한 프레임 늦게 `layoutId`/`initial`이 적용되는 P1 결함이 발견되어 별도 수정 커밋(`a51da01`)으로 렌더 단계 판정으로 전환했다(자세한 내용은 `insights-cycle2.md` 참조). 또한 sold 셀레브레이션 진행 중(0~1700ms) 소스와 타겟이 동일 `layoutId`를 동시에 보유하는 구간(P2-2)이 비차단 권고로 남아 있어, 실제 브라우저에서의 morph 품질은 후속 관찰이 필요하다.

### AD-5. 등급은 매물 id 기반 결정적 해시로 산정하는 순수 코스메틱 값이며, 백엔드 데이터와 연동하지 않는다

`card-rarity.ts`(신규, task-003 단독 소유)의 `getCardRarity(id: string)`가 매물 id 문자열을 해시해 일반/레어/레전더리(약 70/25/5 배분)로 결정적으로 매핑한다. 동일한 매물 id는 새로고침해도 항상 같은 등급을 갖는다.

**맥락**: 조사 결과 실제 티어/MMR 데이터가 백엔드에서 프론트로 전달되지 않는다(`RoomStatePlayer` 타입에 관련 필드 없음, `user.entity.ts`의 `rating` 컬럼도 대부분 비어있을 가능성이 높고 미사용). 2차 사이클은 "백엔드 신규 API/이벤트 추가 금지" 원칙을 따르므로 실데이터 기반 등급은 스코프 밖이다.

**대안**: 백엔드에 `user.rating`을 노출하는 최소 필드 확장 후 실제 데이터 기반 등급 산정 — 백엔드 무변경 원칙 위반이며 `rating` 값의 실채움 여부도 불확실해 3차 이후 별도 검토 대상으로 명시적으로 미룬다.

**결과**: 순수 함수로 백엔드 의존 없이 구현되어 테스트(`card-rarity.test.ts`, 결정성 + 분포 근사)로 검증 가능했고, UI 문구도 "레전더리 카드" 등 게임적 표현으로 실력 지표 오인을 방지했다. 사용자가 실제 실력 기반 등급을 원할 경우 3차 사이클에서 `rating` 필드의 실채움 여부를 먼저 확인한 뒤 별도 요구사항으로 재상정해야 한다.

## 결과 요약

이 5가지 결정으로 4개 P0 태스크(001~004)가 3개 공유 파일(`use-auction-sound.ts`, `current-player-card.tsx`, `globals.css`) 각각을 정확히 하나의 태스크가 소유하도록 분할됐고, 계획서(`plan.md`)의 "파일 충돌표"가 실제 구현(`git diff --stat 0d5b3ad HEAD -- frontend/`, 12개 파일 변경)과 일치했다. Group A(task-001, task-002)와 Group B(task-003, task-004)가 각각 병렬 worktree로 실행되었고, 머지 과정에서 소유권 분할로 인한 구조적 충돌은 발생하지 않았다. 코드 리뷰에서 발견된 문제(P1-1 flight-in 지연 발화)는 파일 소유권 자체의 문제가 아니라 컴포넌트 내부의 파생 state 처리 방식 문제였으며, 별도 수정 커밋으로 해소됐다.

## 관련 파일
- `.pipeline/plan.md` (AD-1~AD-7 원안)
- `.pipeline/tasks/task-001.md` ~ `task-004.md`
- `.pipeline/reviews/code-review.md` (P1-1 발견 및 해결 검증)
- `.pipeline/logs/integration.md`
- `frontend/src/modules/auction/hooks/auction-audio-engine.ts` (신규)
- `frontend/src/modules/auction/components/parts/card-rarity.ts` (신규)
