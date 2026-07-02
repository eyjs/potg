# 구현 계획 — POTG 경매 인터랙션 고도화 (2차 사이클)

## 요약
매물 공개(팩 오프닝)·입찰 임팩트/콤보·도화선 타이머·낙찰 골든카드/팀보드 flight-in 4종을 **프론트 전용**으로 구현한다. 핵심 충돌 파일은 (1) 사운드 `use-auction-sound.ts` (3개 기능이 공유) (2) `current-player-card.tsx` (공개/입찰/낙찰 3개 기능이 공유) (3) `globals.css` (키프레임) 세 가지이며, **각 공유 파일을 정확히 1개 태스크가 배타 소유**하도록 분할해 병렬 워크트리 간 머지 충돌을 원천 제거한다.

## 코드베이스 검증 결과 (실제 소스 확인 완료)
requirement.md의 라인 번호를 실제 파일과 대조해 아래를 확정했다. 1차 머지 이후에도 구조는 유지되어 있었다.

- `current-player-card.tsx` (313줄): Props = `player, currentBid, biddingPhase, stageEvent` (**bidEvents 미수신**). 이미 `lastPlayer` state로 매물 전환 감지(64행), `seenSeq`/`celebrate`로 낙찰/유찰 셀레브레이션(66-76행), `BURST_PARTICLES`(36-44행), 아바타(136-158행), 입찰가 패널 `bid-pop`(210-216행), 낙찰 오버레이(231-310행) 보유. 카드 컨테이너는 `overflow-hidden`(108행) → **전체화면 플래시는 portal 필요**.
- `bid-timer.tsx` (128줄): 단독 파일. `isUrgent = value<=5 && value>0`(32행), `isEnded`(33행), 게이지 바(112-125행, `width: fraction*100%` + hue), `role=timer`/`aria-live`(63-64행). 다른 2차 태스크와 겹치지 않음.
- `team-sidebar.tsx` (222줄): `team.members.map`(140-167행)이 영입 멤버 렌더. member.id / player.id 동일 참가자 id 체계.
- `use-auction-sound.ts` (156줄): **Web Audio 오실레이터 합성**(HTMLAudioElement/mp3 미사용). `useAuctionSound(bidEvents, stageEvent)` 시그니처로 socket 329행에서 호출. pointerdown/touchstart unlock(115-134행), bid/sold/pass 트리거(137-155행).
- `use-auction-socket.ts` (340줄): `bidEvents`(id/timestamp/kind 포함)·`stageEvent`(seq) 노출 확인. **재수정 불필요** — 329행 `useAuctionSound(bidEvents, stageEvent)` 호출 시그니처 유지 시 무변경.
- 3개 뷰(`captain`/`master`/`spectator`): 모두 동일 `<div className="grid grid-cols-12 gap-4">` 안에 `TeamSidebar`(좌 aside) + `CurrentPlayerCard`(중앙 section)를 형제로 렌더 → **이 그리드(또는 뷰 루트)를 `LayoutGroup`으로 감싸면 flight-in 성립**. spectator는 데스크톱 그리드(73-117행)에만 사이드바 노출, 모바일 블록(125-155행)은 사이드바 없음(flight-in 자동 미노출).
- `globals.css` (492줄): `.flash-burst`/`.burst-particle`/`.ring-expand`/`.bid-pop` 등 재사용 가능, `@media (prefers-reduced-motion)` 블록(477-491행) 존재.
- `fx/starfield.tsx`: `window.matchMedia('(prefers-reduced-motion: reduce)')` 정적 대체 패턴 → 신규 연출의 참고 레퍼런스.

## 사용자 직접 피드백 반영 (feedback-001.md)
> "효과음 좀더 게임처럼 바꿔, 너무 소리가 별론데"

1차 오실레이터 단일 톤(삐- 계열)을 **task-001에서 전면 재설계**한다(신규 에셋/패키지 없이 Web Audio 레이어링: ADSR·오실레이터 디튠 다중·BiquadFilter·노이즈 버스트·ConvolverNode 리버브·미세 피치 변주). 이는 스코프에 정식 포함한다.

## 아키텍처 결정

- **[AD-1] 사운드 SSOT = 모듈 싱글턴 오디오 엔진(task-001 단독 소유).** `use-auction-sound.ts`의 `useAuctionSound(bidEvents, stageEvent)` 시그니처를 **그대로 유지**(socket 재수정 금지 준수)하되, 내부를 모듈 레벨 싱글턴 엔진(`auction-audio-engine.ts`, 단일 공유 `AudioContext`)으로 리팩터링한다. 훅은 unlock 리스너 + bid/sold/pass 트리거를 계속 담당하고, 엔진은 `playRevealLegendary()`·`startFuseCrackle()/stopFuseCrackle()` 등 명령형 함수를 export해 리프 컴포넌트(카드·타이머)가 **socket을 거치지 않고** 직접 호출한다. 단일 AudioContext라 unlock 중복/충돌 없음(성공기준 "1차 unlock 패턴과 충돌 없음" 충족). → 사운드를 공유하는 3개 기능의 충돌을 "하나의 소유 파일 + 명령형 export"로 해소.

- **[AD-2] `current-player-card.tsx`는 단일 태스크(task-003)가 배타 소유.** 공개(플립/등급/전설)·입찰(임팩트/콤보)·낙찰(골든/flight 소스)이 모두 이 파일의 **겹치는 영역**(카드 프론트·입찰가 패널·셀레브레이션 오버레이)을 수정하므로, 병렬 분할 시 동일 파일 머지 충돌이 불가피하다. 따라서 3개 기능을 **한 태스크로 묶어** 파일 소유권을 명확히 한다(요구사항 제시안 중 "한 태스크로 묶기" 채택). 태스크 내부는 P0-1/P0-2/P0-4 3단계로 구획해 순차 구현.

- **[AD-3] 콤보는 카드가 로컬 자체 계산(bidEvents prop 미추가).** 카드에 `bidEvents` prop을 추가하면 3개 뷰 파일을 수정해야 해 flight-in 태스크(task-002)의 뷰 수정과 충돌한다. 이를 피하기 위해 카드는 `currentBid.amount` 변경 타임스탬프를 **로컬 링버퍼**로 추적해 콤보를 계산한다(모든 유효 입찰은 currentBid를 상승시키므로 bidPlaced 스트림과 동일). 사운드 콤보(task-001, bidEvents 기반)와 **동일 상수**(`COMBO_WINDOW_MS=3000`, 단계 임계값)를 공유해 두 계산이 어긋나지 않게 한다. → 카드를 완전 자기완결(뷰 무수정)로 만들어 뷰 파일 충돌 제거.

- **[AD-4] flight-in = framer-motion `layoutId` 공유 + `LayoutGroup`(task-002 단독 소유의 뷰 3개).** 뷰 파일(captain/master/spectator)은 **오직 task-002만** 수정한다(LayoutGroup 래핑 + 사이드바 신규 멤버 타겟 layoutId). 카드(task-003)는 낙찰 셀레브레이션의 골든 카드에 소스 layoutId를 부여한다. 두 반쪽은 코드 import가 아니라 **문자열 규약** `flight-card-${player.id}`(카드) ≡ `flight-card-${member.id}`(사이드바, sold player.id == member.id)로만 결합 → 파일 의존 없음. task-002(Group A)가 먼저 머지되어 LayoutGroup+타겟이 준비된 뒤 task-003(Group B)이 소스를 얹는 순서.

- **[AD-5] `globals.css`는 타이머 태스크(task-004)가 단독 소유.** 신규 키프레임(불꽃 flicker/spark, 연소 텍스처)과 그 `prefers-reduced-motion` 정지 항목은 전부 여기서 추가한다. 카드(task-003)·사이드바(task-002)는 **framer-motion + 기존 CSS 클래스 재사용 + portal**만 쓰고 globals.css를 건드리지 않는다 → globals.css 단일 소유로 충돌 제거.

- **[AD-6] 등급은 순수 코스메틱(매물 id 결정적 해시).** 실데이터 tier/MMR 미연동(백엔드 무변경 원칙). `card-rarity.ts` 순수 유틸(task-003 소유)로 `player.id` → 일반/레어/전설(70/25/5) 결정적 매핑. 문구는 "레전더리 카드" 등 게임적 표현(실력 지표로 오인 방지).

- **[AD-7] P2 스킬 영상은 분리·선택 태스크(task-005, Group C).** 카드에 배경 mount가 필요해 `current-player-card.tsx`를 재수정하므로 task-003 머지 후 순차 실행. 데스크톱 한정·feature flag·실패 시 골드 카드로 조용히 폴백. P0 완료에 지장 없을 때만 착수(생략 가능).

## 태스크 목록
| # | 태스크 | 복잡도 | 의존 | 병렬그룹 | 소유 파일 | 파일 |
|---|--------|--------|------|----------|-----------|------|
| 001 | 오디오 엔진 재설계 + 신규 사운드(SSOT) | L | 없음 | A | `use-auction-sound.ts`(수정), `auction-audio-engine.ts`(신규) | task-001.md |
| 002 | 낙찰 팀보드 flight-in (사이드바+뷰 3개+LayoutGroup) | L | 없음 | A | `team-sidebar.tsx`, `auction-ongoing-{captain,master,spectator}.tsx` | task-002.md |
| 003 | current-player-card 통합 연출 (공개+입찰/콤보+골든/flight소스) | XL | 001, (규약)002 | B | `current-player-card.tsx`, `card-rarity.ts`(신규) | task-003.md |
| 004 | bid-timer 불타는 도화선 + globals.css 키프레임 | M | 001 | B | `bid-timer.tsx`, `globals.css` | task-004.md |
| 005 | (P2·선택) 낙찰 스킬 영상 배경 재생 | M | 003 | C | `fx/skill-video-backdrop.tsx`(신규), `current-player-card.tsx`(재수정) | task-005.md |

## 파일 충돌표 (각 파일이 정확히 하나의 태스크에만 속함 — 증명)
| 파일 | 소유 태스크 | 다른 태스크의 접근 |
|------|-----------|--------------------|
| `hooks/use-auction-sound.ts` | 001 | 없음 |
| `hooks/auction-audio-engine.ts` (신규) | 001 | 003(리프: `playRevealLegendary` import), 004(리프: `startFuseCrackle/stopFuseCrackle` import) — **import만** |
| `hooks/use-auction-socket.ts` | (무변경) | 001은 329행 호출 시그니처 유지, 전 태스크 수정 금지 |
| `components/parts/team-sidebar.tsx` | 002 | 없음 |
| `components/auction-ongoing-captain.tsx` | 002 | 없음 |
| `components/auction-ongoing-master.tsx` | 002 | 없음 |
| `components/auction-ongoing-spectator.tsx` | 002 | 없음 |
| `components/parts/current-player-card.tsx` | 003 | 005가 Group C에서 **재수정**(순차, 배경 mount 1지점) |
| `components/parts/card-rarity.ts` (신규) | 003 | 없음 |
| `components/parts/bid-timer.tsx` | 004 | 없음 |
| `app/globals.css` | 004 | 003/002는 **기존 클래스 재사용만**(수정 없음) |
| `components/parts/fx/skill-video-backdrop.tsx` (신규) | 005 | 없음 |

**증명**: "소유 태스크" 열에 중복 파일이 없다. 유일한 동일-파일 재수정은 `current-player-card.tsx`(003→005)이며, 이는 **다른 그룹(B→C) 순차 실행**으로 병렬 충돌이 아니다. `auction-audio-engine.ts`/`globals.css`는 소유 태스크만 수정하고 나머지는 import/클래스 재사용(파일 편집 아님)이라 워크트리 머지 충돌을 일으키지 않는다.

## 병렬 실행 그룹
```
[Group A] — 선행 없음, 즉시 병렬 (2개 워크트리)
  ├─ task-001 (오디오 엔진 SSOT)          파일: use-auction-sound.ts, auction-audio-engine.ts(신규)
  └─ task-002 (flight-in: 사이드바+뷰3+LayoutGroup)  파일: team-sidebar.tsx, 뷰 3개
        │  (두 태스크 파일 교집합 = ∅, 상호 import 없음)
        ▼
[Group B] — Group A 머지 후 병렬 (2개 워크트리)
  ├─ task-003 (current-player-card 통합)   depends 001(엔진 import) + 002(layoutId 규약)
  └─ task-004 (bid-timer 도화선 + globals.css)  depends 001(fuse 사운드 import)
        │  (두 태스크 파일 교집합 = ∅)
        ▼
[Group C] — (선택) task-003 머지 후 실행
  └─ task-005 (P2 스킬 영상 배경)  depends 003 — P0 지장 없을 때만, 생략 가능
```
- **Group A**: 001·002는 파일 교집합 없음·상호 의존 없음 → 완전 병렬.
- **Group B**: 003·004는 파일 교집합 없음, 둘 다 001(엔진)에만 import 의존, 003은 002의 layoutId 규약을 소비(002는 이미 머지됨) → 병렬.
- **Group C**: 005는 003의 카드 파일을 재수정 → 순차. P2·선택.

## 의존성 그래프
```
task-001 (audio SSOT) ──┬──▶ task-003 (card: playRevealLegendary import, 콤보 상수 공유)
                        └──▶ task-004 (timer: startFuseCrackle/stopFuseCrackle import)

task-002 (views+sidebar) ····(layoutId 문자열 규약, 코드 import 아님)····▶ task-003 (card: flight 소스)

task-003 (card) ──▶ task-005 (P2 video, 카드 재수정)
```
- 실선 = 코드 import 의존(선행 태스크 머지 필수). 점선 = 문자열 규약 결합(파일 의존 아님, 순서만 A→B로 보장).

## 성공 기준 → 태스크 매핑
| requirement.md 성공 기준 | 담당 태스크 |
|---|---|
| 새 매물 플립 후 정면 공개 + id 결정적 등급 프레임 | 003 |
| 전설급 화면 플래시+파티클+전용 사운드(중복 없음, unlock 무충돌) | 003(시각) + 001(사운드) |
| 입찰 시 금액 임팩트 + 미세 화면 흔들림 | 003 |
| N초 연속 입찰 콤보 증가 + 단계별 강도/피치 상승 + 리셋 | 003(시각) + 001(피치) |
| 마감 5초 전 연소 연출 + 지지직 사운드, isUrgent/isEnded/aria 무회귀 | 004(시각) + 001(크래클) |
| 낙찰 시 골드 변신 + 사이드바 신규 멤버 진입 애니메이션 | 003(골드/flight소스) + 002(사이드바 진입/타겟) |
| prefers-reduced-motion 시 전 동적 연출 생략/정적 대체 | 002·003·004 공통 |
| 모바일 관전자: 팀보드 flight-in 미노출 + 나머지 축소 강도 | 002(사이드바 모바일 숨김) + 003(모바일 fx 축소) |
| 데스크톱 캡틴/마스터/관전자 3뷰 무회귀 | 002·003·004 공통(통합 검증) |
| `cd frontend && npm run lint && npm run build` 통과 | 전 태스크 + Integrator |
| (P2) 스킬 영상 실패/지연 시 골드 폴백, 모바일 미재생 | 005 |

## 리스크
- **R1 (사운드 재설계 품질, task-001)**: Web Audio 레이어링 과다 시 CPU/클리핑. 완화 = 마스터 게인 정리·짧은 임펄스 리버브·이벤트 스로틀(연속 입찰 시 중첩 제한). feedback-001 성공기준("삐- 톤 0개, 타격감/공간감")을 태스크 완료 기준에 명시.
- **R2 (flight-in 타이밍/좌표, task-002+003)**: layoutId 공유 morph는 소스(카드) 언마운트 ↔ 타겟(사이드바 신규 멤버) 마운트 타이밍과 두 요소가 동일 `LayoutGroup` 내에 있어야 성립. 완화 = 뷰 그리드를 `LayoutGroup`으로 래핑(task-002), 소스 layoutId를 셀레브레이션 골드 카드에 부여(task-003), `sold player.id == member.id` 규약 문서화. 통합 단계에서 3뷰 실동작 검증. 사용자 명시 P0이므로 **생략/하향 금지**.
- **R3 (동일 파일 003→005 재수정, task-005)**: Group C가 카드를 재수정하며 리베이스. 완화 = 005는 배경 mount 1지점만 추가(최소 침습), P2·선택이라 P0 지장 시 스킵.
- **R4 (콤보 이중 계산 divergence, AD-3)**: 카드(currentBid 기반)와 사운드(bidEvents 기반)가 이론상 어긋날 수 있음. 완화 = 모든 유효 입찰이 currentBid를 상승 → 동일 스트림. 공유 상수(`COMBO_WINDOW_MS=3000`, 단계 임계값)를 양 태스크에 동일 기재.
- **R5 (reduced-motion/모바일 누락)**: 신규 연출 각각에 감소모션·모바일 축소 분기 필수. 완화 = 카드/사이드바는 framer-motion `useReducedMotion()` + 뷰포트 폭 체크, 타이머는 globals.css `@media (prefers-reduced-motion)` 블록에 신규 키프레임 정지 항목 추가.
- **R6 (전설 플래시 clip, task-003)**: 카드 `overflow-hidden`/clip-path가 전체화면 플래시를 자름. 완화 = `createPortal(document.body)`로 뷰포트 오버레이 렌더(카드 파일 내부 유지, 뷰 무수정).
- **R7 (P2 영상 성능/지연, task-005)**: 원본 1080p 수 MB~수십 MB. 완화 = 데스크톱 한정·`muted autoplay`·로드 실패/지연 시 폴백·`prefers-reduced-motion` 미재생.
- **R8 (lint/build 게이트)**: `any` 금지·기존 토큰 준수. Integrator가 `npm run lint && npm run build` 최종 확인.

## 제약사항 (status.json constraints 준수 요약)
- shadcn(`components/ui/*`)·`lib/utils.ts` 수정 금지, `any` 금지, 신규 npm 패키지 금지(framer-motion 재사용), 백엔드 무변경, Tailwind + 기존 globals.css keyframe 확장만(신규 CSS 파일 금지), 오버워치 테마/토큰 유지, `prefers-reduced-motion` 대응, 모바일 fx 축소, `use-auction-socket.ts` 재수정 금지, 등급은 코스메틱 해시, push는 사용자 확인 후.
