# Task 001: 경매 효과음 (입찰 / 낙찰 / 유찰 + 모바일 autoplay unlock)

## 메타데이터
- 우선순위: P0
- 복잡도: M
- 병렬그룹: A
- 의존: 없음
- 변경 파일 (충돌 방지용):
  - 신규: `frontend/src/modules/auction/hooks/use-auction-sound.ts`
  - 신규: `frontend/public/sounds/bid.mp3`, `frontend/public/sounds/sold.mp3`, `frontend/public/sounds/pass.mp3` (기본안 채택 시 / Web Audio 합성 폴백 채택 시 이 3개 파일은 생성하지 않음)
  - 수정: `frontend/src/modules/auction/hooks/use-auction-socket.ts` (신규 훅 호출 배선만 추가 — 소켓 리스너/이벤트 구조 변경 금지)
- 이 태스크 외 파일 수정 금지. `use-auction-socket.ts`는 이 태스크만 수정하며, 다른 태스크는 이 파일에서 타입 import만 한다.

## 목적
실시간 경매의 3대 순간(입찰 발생 / 낙찰 확정 / 유찰 확정)에 각각 구분되는 효과음을 1회 재생해 청각 피드백을 제공한다. 모바일 브라우저 autoplay 정책에 대응해 최초 사용자 제스처로 오디오를 unlock 한다.

## 배경 (조사 완료 — requirement.md P0-1)
- `use-auction-socket.ts`에는 이미 다음 상태가 존재한다:
  - `bidEvents: AuctionBidEvent[]` — `bidPlaced` 시 `pushBidEvent({ kind: 'bid', ... })`, `bidConfirmed` 시 `pushBidEvent({ kind: 'sold', ... })`로 push (라인 ~124-158). 각 이벤트는 고유 `id`를 가진다.
  - `stageEvent: AuctionStageEvent | null` — `bidConfirmed`에서 `{ kind: 'sold', seq++ }`, `playerPassed`에서 `{ kind: 'pass', seq++ }` (라인 ~147, ~161). seq 증가 = 1회성 연출 트리거.
- `current-player-card.tsx`가 이미 `stageEvent.seq` 변화를 구독해 낙찰/유찰 셀레브레이션을 재생하는 검증된 패턴이 있다. 효과음도 **동일 패턴을 재사용**한다.
- 오디오 관련 기존 코드/의존성은 전무하다. 신규 npm 라이브러리(howler 등) 도입 불필요.

## 구현 가이드
1. **신규 훅 `use-auction-sound.ts` 작성**
   - 시그니처 예: `useAuctionSound(bidEvents: AuctionBidEvent[], stageEvent: AuctionStageEvent | null): void`
   - 입찰음: `bidEvents`의 마지막 항목 `id`(또는 길이 증가)를 `useRef`로 추적해, 새 `kind: 'bid'` 이벤트가 들어올 때만 입찰음 1회 재생. `kind: 'sold'` bidEvent는 낙찰음과 중복되지 않게 무시(낙찰음은 stageEvent로 처리).
   - 낙찰/유찰음: `stageEvent.seq`를 `useRef`로 추적(`current-player-card.tsx`의 `seenSeq` 패턴 참조). seq가 증가하면 `kind === 'sold'`면 낙찰음, `'pass'`면 유찰음 1회 재생.
   - 최초 마운트 시점(seq 초기값, bidEvents 초기 seed)에서는 재생하지 않도록 초기 ref를 현재값으로 세팅(과거 이벤트 소급 재생 방지).
2. **오디오 재생 방식 — 아래 두 경로 중 하나 선택 (둘 다 성공기준 충족, 어느 쪽이든 진행 가능)**
   - **[기본안·권장] 네이티브 HTMLAudioElement + CC0 mp3**:
     - `frontend/public/sounds/`에 `bid.mp3` / `sold.mp3` / `pass.mp3` (각 0.3~1.0s 짧은 SFX) 배치.
     - **라이선스 필수: CC0/퍼블릭도메인만.** 출처 예: freesound.org(CC0 필터), mixkit, kenney.nl 등 CC0 SFX. 출처·라이선스를 커밋 메시지 또는 태스크 핸드오프에 기록.
     - 재생: `new Audio('/sounds/bid.mp3')` 인스턴스를 모듈/ref로 준비해 `.currentTime = 0; .play()`. `.play()`가 반환하는 Promise의 rejection은 `.catch(() => {})`로 삼켜 콘솔 에러 방지(autoplay 차단은 정상 케이스).
     - 톤 가이드: 입찰=짧은 클릭/틱, 낙찰=상승하는 골드톤(긍정), 유찰=하강 저음(부정). 오버워치 테마에 맞는 절제된 UI SFX.
   - **[폴백] Web Audio API 오실레이터 합성** (CC0 에셋 확보 실패 시):
     - `public/sounds/` 파일을 생성하지 말고, 훅 내부에서 `AudioContext` + `OscillatorNode` + `GainNode`로 3종 톤을 합성.
     - 예: 입찰 = 880Hz square 40ms, 낙찰 = 523→784Hz sine 상승 200ms, 유찰 = 330→160Hz sawtooth 하강 250ms (짧은 gain envelope로 클릭 노이즈 방지).
3. **모바일 autoplay unlock**
   - 훅 내부 `useEffect`에서 최초 1회 `pointerdown`(또는 `touchstart`/`click`) 리스너를 `window`/`document`에 `{ once: true }`로 등록.
   - 제스처 발생 시: (기본안) 각 Audio를 `muted` 상태로 `.play()` 후 즉시 `.pause()`/`.currentTime=0`로 unlock, 또는 (폴백) `AudioContext.resume()` 호출. unlock 완료 플래그를 ref로 관리.
   - unlock 전 재생 시도는 조용히 무시(무음이 정상, 에러로 처리하지 않음).
4. **훅 배선 — `use-auction-socket.ts` 최소 수정**
   - `import { useAuctionSound } from './use-auction-sound'` 추가.
   - `return { ... }` 직전에 `useAuctionSound(bidEvents, stageEvent)` 호출 1줄 추가.
   - 소켓 리스너 등록/해제, 이벤트명, 기존 상태 로직은 **일절 변경 금지** (신규 소켓 이벤트 추가 금지).

## 제약사항 (requirement.md + CLAUDE.md)
- `any` 타입 사용 금지 (오디오 관련 타입 명시: `HTMLAudioElement`, `AudioContext` 등).
- Tailwind CSS만 사용, 별도 CSS 파일 생성 금지 (이 태스크는 로직만 — 시각 변경 없음).
- `frontend/src/components/ui/*`, `frontend/src/lib/utils.ts` 수정 금지.
- 기존 `useAuctionSocket` 이벤트 리스너 구조 재사용 — **신규 소켓 연결/이벤트 추가 금지**.
- 신규 오디오 에셋 사용 시 **CC0/무료 라이선스만** — 출처 기록 필수.
- 오버워치 테마(절제된 futuristic UI SFX) 유지.
- 백엔드 변경 없음 (프론트 전용).

## 성공 기준
- [ ] 입찰 발생 시 입찰음이, 낙찰 확정 시 낙찰음이, 유찰 확정 시 유찰음이 각각 구분되어 1회씩 재생된다 (수동/자동 낙찰·유찰 공통).
- [ ] 최초 마운트/재접속 시 과거 이벤트가 소급 재생되지 않는다.
- [ ] 모바일에서 최초 탭 이후 정상 재생된다(그 전에는 무음이 정상, 콘솔 에러 없음).
- [ ] 낙찰음/유찰음이 `current-player-card.tsx`의 시각 셀레브레이션과 동시에 1회 발화한다(중복·이중 재생 없음).
- [ ] `cd frontend && npm run lint && npm run build` 통과.
- [ ] (기본안 채택 시) `public/sounds/` 에셋의 CC0 출처가 기록되어 있다.

## 테스트 요구사항
- 단위 테스트: 프론트 훅은 오디오/타이머 의존이 커 자동 테스트 비용이 높음 — 필수 아님. 대신 다음 수동 검증 시나리오를 핸드오프에 기록: (1) 데스크톱에서 입찰→낙찰, 입찰→유찰 각 사운드 확인, (2) 모바일(또는 DevTools 모바일 에뮬레이션)에서 탭 전후 재생 차이 확인, (3) 재접속 시 소급 재생 없음 확인.
