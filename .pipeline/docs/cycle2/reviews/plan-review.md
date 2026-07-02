# 계획 리뷰 — 2차 사이클 (경매 인터랙션 고도화)

## VERDICT: PASS

리뷰어: 시니어 리뷰어 (읽기 전용) · 일시: 2026-07-03
대상: `.pipeline/plan.md`, `.pipeline/tasks/task-001.md`~`task-005.md`
기준: `requirement.md`, `feedback-001.md`, `status.json` constraints, `rules/custom/review-criteria.md`

승인. P0 4종 전부 태스크에 온전히 매핑됐고, 사용자 명시 P0인 낙찰 flight-in이 생략/하향 없이 보존됐다. feedback-001(효과음 재설계)이 task-001에 구체적으로 반영됐고, 파일 충돌표의 "각 파일 정확히 1태스크 소유" 증명이 각 태스크 메타데이터와 실제 소스로 교차검증됐다. plan.md가 인용한 라인 번호/구조는 실제 파일과 일치한다. 아래 권고(P2)는 전부 비차단이며, 구현 단계에서 참고하면 된다.

---

## 1. P0 전부 포함 — PASS
| P0 항목 | 담당 태스크 | 상태 |
|---|---|---|
| 매물 공개 (팩 오프닝) | task-003 단계1 | 포함 |
| 입찰 임팩트/콤보 | task-003 단계2 (시각) + task-001 (사운드 피치) | 포함 |
| 도화선 타이머 | task-004 (시각) + task-001 (크래클) | 포함 |
| 낙찰 골든카드 + flight-in | task-003 단계3 (골드/소스 layoutId) + task-002 (LayoutGroup/타겟) | 포함 |

- 사용자 명시 P0 **flight-in**: task-002가 "생략/하향 금지"를 3회 명시. LayoutGroup 래핑(뷰3) + 사이드바 신규멤버 타겟 layoutId(task-002), 골든카드 소스 layoutId(task-003)로 온전히 유지. **하향 없음.**
- 참고: requirement.md 원문은 타이머/낙찰을 P1로 표기하나, status.json `user_emphasis`가 flight-in을 P0로 승격했고 리뷰 프레임(4개 P0)과 일치. 판정에 영향 없음.

## 2. feedback-001 (효과음 재설계) 반영 — PASS
- task-001에 Web Audio 레이어링 재설계가 구체적으로 포함: ADSR 엔벨로프 / 오실레이터 2~3개 레이어링+디튠 / BiquadFilter 스윕 / 노이즈 버스트 / ConvolverNode 임펄스 리버브 / 미세 랜덤 피치 변주 / 마스터 게인 정리. 입찰(탁·척 타격음, 200→80Hz 피치드롭)·낙찰(메이저 3음 아르페지오+shimmer+리버브)·유찰(마이너 하강+lowpass)·도화선 크래클 4종 모두 매핑.
- 성공기준 "삐- 계열 원시 톤 0개, 타격감/공간감" 태스크 완료 기준에 명시됨.
- **주의(비차단)**: feedback-001 원문은 "효과음 유틸을 확장하는 태스크(입찰 콤보 담당)에 사운드 재설계를 포함"이라 했으나, 계획은 사운드를 별도 SSOT 엔진(task-001)으로 분리했다. 이는 AD-1로 정당화된 **더 나은 아키텍처**(단일 AudioContext, 소켓 우회 명령형 export)이며 재설계 자체는 온전히 포함되므로 요구 충족. 의도 이탈 아님.

## 3. 태스크 분할 — PASS (권고 A1)
- **current-player-card 단일 태스크(task-003, AD-2)**: 공개/입찰/낙찰이 동일 파일의 겹치는 영역(카드 프론트·입찰가 패널·셀레브레이션 오버레이)을 수정 → 병렬 분할 시 머지 충돌 불가피. 한 태스크 배타 소유가 타당. 내부는 3단계 순차 구획.
- **사운드 SSOT 분리(task-001, AD-1)**: 3개 기능이 사운드를 공유하므로 "하나의 소유 파일 + 명령형 export"로 충돌 해소. 타당.
- **[권고 A1·P2] task-003 XL 리스크**: 3서브기능+유틸을 한 워크트리에 묶어 규모가 큼. 단일 파일 소유 제약상 재분할은 오히려 충돌을 재유발하므로 현 분할이 옳으나, 구현 시 단계(공개→입찰→낙찰)별 내부 커밋 체크포인트로 리스크를 낮출 것을 권고.

## 4. 의존성 그래프 — PASS
- Group A(001·002) → B(003·004) → C(005) 순서 정확.
- **import 의존(실선)**: 001→003(`playRevealLegendary`+콤보 상수), 001→004(`startFuseCrackle/stopFuseCrackle`), 003→005(카드 재수정). 모두 선행 머지 필수로 올바름.
- **문자열 규약 결합(점선)**: 002⋯003 layoutId(`flight-card-${id}`)는 코드 import가 아니라 순서만 A→B로 보장. 구분 정확.
- task-003이 002의 layoutId 규약 + 001의 엔진에 의존하는 매핑 정확. 002는 무의존이라 Group A 배치가 최적(최조기 실행). LayoutGroup은 뷰(002)에 있고 카드(003)는 런타임 자식으로 합성 — 코드 import 아님을 확인.

## 5. 병렬 그룹 파일 충돌 — PASS (교차검증 완료)
파일 충돌표를 각 태스크 메타데이터 + 실제 소스로 교차검증한 결과, 각 파일이 정확히 하나의 태스크에 소유됨을 확인:
- `use-auction-sound.ts` / `auction-audio-engine.ts` → **001 단독 소유**. 003·004 메타데이터의 "읽기전용: auction-audio-engine.ts (import만)" 항목과 일치 → **import만, 편집 없음** 확인.
- `team-sidebar.tsx` + 뷰 3개 → **002 단독**. 003/004는 미접근.
- `current-player-card.tsx` → **003 소유**, 005가 Group C에서 **순차 재수정**(배경 mount 1지점). B→C 순차라 병렬 충돌 아님.
- `globals.css` → **004 단독 소유**. task-002는 미접근, task-003 메타데이터는 "globals.css (task-004, 기존 클래스 재사용만)" 읽기전용 → 편집 없음 확인. 003이 신규 모션을 framer-motion/portal로만 처리(AD-5)해 globals.css 미수정을 설계로 보장.
- Group A 교집합: {sound 2파일} ∩ {sidebar+뷰3} = ∅. Group B 교집합: {card, card-rarity} ∩ {bid-timer, globals.css} = ∅. **워크트리 병렬 충돌 없음.**

## 6. 제약 위반 소지 — PASS
- `any` 금지: 전 태스크 "any 미사용" 명시. ✔
- 신규 패키지 금지: framer-motion / Web Audio 재사용만. ✔
- `use-auction-socket.ts` 재수정 금지: task-001 읽기전용 명시. **실제 소스 329행 `useAuctionSound(bidEvents, stageEvent)` 호출 + bidEvents/stageEvent 노출 확인** → 시그니처 유지 시 0줄 수정 성립. ✔
- 백엔드 무변경: task-005도 단순 `<video>` 직재생(프록시/CORS 불필요), 백엔드 미접근. ✔
- shadcn `components/ui/*` / `lib/utils.ts` 금지: task-003 명시, 타 태스크 미접근. ✔
- reduced-motion: 002/003/004 처리. task-001은 "사운드는 모션 아님 → 정지 대상 아님, 볼륨 절제"로 처리 — 전정 자극(모션) 관점상 방어 가능한 해석. ✔
- 모바일: 002(사이드바 숨김), 003(fx 축소), 005(데스크톱 한정). ✔

## 7. 실제 소스 정합성 — PASS (직접 열람 검증)
plan.md 인용 라인/구조를 실제 파일과 대조한 결과 **전부 일치**:
- `current-player-card.tsx`: Props `player/currentBid/biddingPhase/stageEvent` **bidEvents 미수신 확인**(14-20행), `overflow-hidden`(108행), `lastPlayer`(63-64행), `seenSeq`/`celebrate`/1700ms(66-76행), `BURST_PARTICLES`(36-44행), 입찰가 패널·`bid-pop`(203-227/210-216행), 낙찰 오버레이 `.flash-burst`/`.ring-expand`/`.burst-particle`(231-310행) — 모두 일치.
- `use-auction-sound.ts`: 시그니처 `useAuctionSound(bidEvents, stageEvent)`(61-64행), Web Audio 오실레이터(mp3 아님), **bid=880Hz square**(feedback가 지적한 삐- 톤 확인), `resolveAudioContextCtor` 폴백, unlock(115-134), bid(137-146)/sold·pass(149-155) — 일치.
- 뷰(captain): `grid grid-cols-12`(170행), `TeamSidebar`(173행), `CurrentPlayerCard`(184행) 형제 렌더 + **stageEvent만 전달·bidEvents 미전달** 확인 → AD-3 근거 성립.
- `bid-timer.tsx`: `isUrgent`(32행), `isEnded`(33행), `role=timer`/`aria-live`(63-64행) — 일치.
- **[가점] flight-in id 규약 백엔드 검증**: `auctions-room-state.service.ts`에서 `currentPlayer.id = player.userId`(181행), `member.id = m.userId`(138행). 낙찰 매물과 신규 팀멤버가 **동일 참가자 userId**를 공유하므로 `sold player.id == member.id` 규약이 백엔드 레벨에서 실제 성립. 사용자 명시 P0 flight-in의 layoutId 매칭(`flight-card-${id}`)이 엔드투엔드로 검증됨.

---

## 권고 사항 (전부 P2·비차단)
- **A1 [P2]** task-003(XL): 단계별(공개→입찰→낙찰) 내부 커밋 체크포인트로 규모 리스크 완화.
- **A2 [P2]** task-003은 신규 시각 모션을 전부 framer-motion/inline으로 처리해 globals.css 단일소유(004)를 지켜야 한다. 구현 중 신규 CSS 키프레임이 필요해지면 globals.css 소유 규칙과 충돌하므로, 애초에 JS 애니메이션/inline-style로 해결할 것을 재확인.
- **A3 [P2]** 콤보 이중 계산(AD-3/R4): 사운드(bidEvents 기반, task-001)와 카드(currentBid.amount 링버퍼, task-003)가 이론상 ±1 어긋날 수 있음. 공유 상수(`COMBO_WINDOW_MS=3000`, L0~L3 임계값)로 완화되나, 카드가 매물 전환 시 반드시 리셋하도록 하고 테스트에서 가시적 divergence가 관찰되면 단일 소스로 통합 검토.
- **A4 [P2]** task-004 타이머 불꽃/스파크는 모바일 동작 언급이 없음. requirement 모바일 축소 대상(흔들림/전설플래시/파티클/영상)에 타이머 불꽃은 미포함이라 현 상태 허용되나, "불꽃은 경량이라 모바일 유지" 한 줄 명시하면 완결성↑.

## 승인 결론
2차 계획은 병렬 충돌 무해성·소스 정합성·P0 커버리지·사용자 피드백 반영이 모두 충족됐다. **PASS.** design/implementation 단계로 진행 가능. 위 A1~A4는 구현 단계 참고 권고이며 재계획을 요하지 않는다.
