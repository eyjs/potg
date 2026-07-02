# Task 001: 오디오 엔진 재설계 + 신규 사운드 (사운드 SSOT)

## 메타데이터
- 복잡도: L
- 병렬그룹: A (선행 없음, 즉시 실행)
- 의존: 없음
- 변경 파일 (충돌 방지용):
  - 수정(배타 소유): `frontend/src/modules/auction/hooks/use-auction-sound.ts`
  - 신규(배타 소유): `frontend/src/modules/auction/hooks/auction-audio-engine.ts`
  - 읽기전용(수정 금지): `frontend/src/modules/auction/hooks/use-auction-socket.ts` (329행 `useAuctionSound(bidEvents, stageEvent)` 호출 시그니처를 **절대 변경하지 말 것**)

## 목적
2차 모든 연출이 공유하는 **사운드 단일 소유처(SSOT)**를 만든다. (1) 사용자 직접 피드백(feedback-001)에 따라 1차 오실레이터 단일 톤을 게임급으로 전면 재설계 (2) 신규 사운드 3종(전설 공개·콤보 피치 상승 입찰·도화선 크래클)을 추가한다. 리프 컴포넌트(카드·타이머)가 socket을 거치지 않고 직접 호출할 수 있도록 명령형 엔진 함수를 export한다.

## 배경 / 현재 구조 (검증 완료)
- `use-auction-sound.ts`는 Web Audio 오실레이터 합성(mp3/HTMLAudioElement 미사용). `TONE_CONFIGS`(bid/sold/pass), `playTone`, unlock 리스너(pointerdown/touchstart, 115-134행), bid 트리거(137-146행), sold/pass 트리거(149-155행).
- `use-auction-socket.ts` 329행에서 `useAuctionSound(bidEvents, stageEvent)` 호출. **이 파일은 재수정 금지** → 훅 시그니처 유지 필수.
- feedback-001.md 원문: "효과음 좀더 게임처럼 바꿔, 너무 소리가 별론데".

## 구현 방식

### 1. 모듈 싱글턴 오디오 엔진 (`auction-audio-engine.ts` 신규)
- 모듈 레벨 단일 공유 `AudioContext`(lazy 생성, `webkitAudioContext` 폴백 — 기존 `resolveAudioContextCtor` 패턴 이식). `any` 금지.
- 공통 합성 헬퍼(신규 라이브러리 없이 Web Audio만):
  - **ADSR 게인 엔벨로프** 유틸(attack/decay/sustain/release 명시).
  - **오실레이터 2~3개 레이어링 + 디튠**(두께감).
  - **BiquadFilter** lowpass/highpass 스윕(톤 정리).
  - **노이즈 버스트**: `AudioBuffer`에 화이트노이즈 채워 짧게 재생(타격감).
  - **ConvolverNode** + 프로그램 생성 임펄스 응답(짧은 리버브 테일, 공간감).
  - **미세 랜덤 피치 변주**(반복 피로 방지).
  - **마스터 게인** 정리(클리핑 방지) — 모든 노드는 마스터 게인 → destination.
- export 함수(명령형):
  - `unlockAudio(): void` — suspended AudioContext resume (엔진 내부에서도 사용).
  - `playBidSound(comboLevel: number): void` — 묵직한 "탁/척" 타격음(필터드 노이즈 트랜지언트 + 사인 피치 드롭 200→80Hz). `comboLevel` 단계에 따라 피치/밝기 상승.
  - `playSoldSound(): void` — 승리 팡파레(메이저 3음 아르페지오 + 상단 shimmer + 긴 리버브 테일). 낙찰 골든카드와 타이밍 동조되도록 총 길이 문서화.
  - `playPassSound(): void` — 낙담(마이너 하강 2음 + lowpass 닫힘 + 짧은 리버브), 음량 절제.
  - `playRevealLegendary(): void` — 전설 공개 전용(상승 shimmer + 임팩트 + 리버브). 카드가 직접 호출.
  - `startFuseCrackle(): void` / `stopFuseCrackle(): void` — 도화선 지지직 크래클(노이즈 + highpass + 랜덤 게인 모듈레이션 루프). 타이머가 isUrgent 진입/이탈 시 호출. 중복 시작 방지(내부 running 플래그).
- **콤보 상수(공유 규약)**: `export const COMBO_WINDOW_MS = 3000` 및 단계 임계값을 엔진(또는 인접 상수)에서 정의·export. 임계값 규약(task-003과 **동일**하게):
  - L0: 콤보 1 (기본)
  - L1: 콤보 2~3
  - L2: 콤보 4~5
  - L3: 콤보 6+
  - `export function bidComboLevel(count: number): 0|1|2|3` 형태로 제공(카드가 동일 함수 import 가능하도록 순수 함수 권장).

### 2. `use-auction-sound.ts` 리팩터링 (시그니처 유지)
- `useAuctionSound(bidEvents, stageEvent)` 시그니처 **그대로 유지**.
- 내부 `playTone`/`TONE_CONFIGS` 제거 → 엔진 함수 호출로 교체.
- unlock 리스너(pointerdown/touchstart, once)는 유지하되 엔진 `unlockAudio()` 호출.
- bid 트리거: 새 `kind:'bid'` 이벤트 감지 시(기존 137-146행 로직 유지) `bidEvents`에서 **콤보 계산**(newest 기준 `COMBO_WINDOW_MS` 내 `kind==='bid'` 개수) → `playBidSound(bidComboLevel(count))`.
- sold/pass 트리거: `stageEvent.seq` 증가 시(기존 149-155행) `playSoldSound()` / `playPassSound()`.
- 과거 이벤트 소급 재생 방지 시드(`lastBidEventIdRef`, `lastStageSeqRef`) 유지.

## 성공 기준
- [ ] "삐-" 계열 원시 단일 톤이 하나도 없다. bid/sold/pass 각각 타격감·공간감(리버브 테일)을 가진다 (feedback-001 충족).
- [ ] `useAuctionSound(bidEvents, stageEvent)` 시그니처 무변경 → `use-auction-socket.ts` 수정 0줄.
- [ ] 입찰 사운드가 콤보 단계(0~3)에 따라 피치/밝기 상승.
- [ ] `playRevealLegendary`·`startFuseCrackle`/`stopFuseCrackle`가 export되어 리프 컴포넌트가 import 가능(엔진 함수 시그니처 확정).
- [ ] 단일 공유 AudioContext — 훅 unlock과 엔진 재생이 동일 컨텍스트를 사용(중복 unlock/컨텍스트 없음).
- [ ] 크래클은 `start` 중복 호출에도 하나만 루프, `stop`에서 완전 정지.
- [ ] `any` 미사용. `cd frontend && npm run lint && npm run build` 통과.

## 테스트 요구사항
- 단위 테스트: `bidComboLevel(count)` 경계값(1→0, 3→1, 5→2, 6→3) 순수 함수 테스트. (오디오 노드 자체는 jsdom에서 검증 어려우므로 순수 로직만 대상.)
- 수동 검증: 데스크톱/모바일에서 최초 제스처 후 4종 재생 확인, 연속 입찰 시 피치 상승, 크래클 시작/정지.

## 제약사항
- 신규 npm 패키지 금지(Web Audio API만). 신규 mp3 에셋 금지(합성 유지).
- `use-auction-socket.ts` 재수정 금지. `any` 금지.
- reduced-motion은 시각 개념 → 사운드는 정지 대상 아님(단, 볼륨 절제로 불쾌감 방지).
- 트리거 배선(stageEvent.seq / bidEvents / 모바일 unlock)은 변경 없이 생성부만 교체.
</content>
