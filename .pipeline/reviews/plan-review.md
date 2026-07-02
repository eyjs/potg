VERDICT: PASS

# 계획 리뷰 — POTG 3차 사이클 (하단 탭 네비게이션 재설계)

- 리뷰 대상: `.pipeline/plan.md` + `.pipeline/tasks/task-001.md`~`task-008.md`
- 기준: `.pipeline/requirement.md` 최종본(하단 탭 네비게이션, v2)
- 리뷰 일자: 2026-07-03 (경매 당일 · 속도 우선 게이트)
- 소스 실측 대조: 완료 (spectator/captain/current-player-card/bid-timer/audio-engine/card-rarity/socket 타입)

## 결론
**PASS. BLOCKER 없음.** 폐기된 v1(팀 가로 스트립) 흔적 없음, P0 6개 전부 매핑, 병렬 그룹 파일 교집합 실측 ∅, 데스크톱 무변경 보장 논리 성립, 백엔드/신규패키지 무변경, 이중 마운트 사운드 방어 반영, CSS hidden 토글 + 크래클 단일 소유자 항상 마운트 성립. 소스 라인 참조·prop명·export 모두 실제 파일과 1:1 일치. 오늘 경매 착수 승인.

---

## 기준별 판정

### 1. requirement P0 ①~⑥ 전부 태스크 매핑 — PASS
| P0 | 항목 | 매핑 | 검증 |
|---|---|---|---|
| ① | 탭구현 = state + CSS hidden 토글, 언마운트/라우트이동 금지 | 006, 007 (AD-4) | 양 뷰 모바일 블록 최상단 `useState<'auction'\|'status'>`, 양 패널 상시 마운트, 조건부 렌더 금지 명시(§4). ✔ |
| ② | 하단 탭바(경매/현황, role=tablist/tab, aria-selected, 44px, skewed/네온) | 003 (+006/007 배선) | `h-14`(≥44px), controlled(부모 state 소유), 접근성 수동 부여. ✔ |
| ③ | 경매탭 스테이지(초상화+현재가+선두+도화선 바+티커) | 005 (+001/002/004) | MobileAuctionStage 신규, 공유 훅 구독. ✔ |
| ④ | 현황탭 TeamSidebar 무변경 재사용 | 006, 007 (AD-5) | team-sidebar.tsx 편집 금지, `overflow-y-auto` 래핑만. ✔ |
| ⑤ | 탭전환 채팅 draft/스크롤 유지 | 006, 007 | `display:none` 상태 보존, 조건부 렌더 금지(R1). ✔ |
| ⑥ | 탭전환 사운드 유지 | 006/007(언마운트 금지) + 001(뷰포트 게이트, 훅 상시 마운트) + 002(헤더 크래클 상시 마운트) | AD-2/AD-3/AD-4. ✔ |

6개 전부 매핑. 게이트 통과.

### 2. 폐기 스트립 부활 방지 — PASS
- `mobile-team-strip.tsx`: 소스 트리 검색 결과 **부재**(현재도 없음), 전 태스크 제약에 "생성 금지" 명시, plan.md 3행/R8에 명문. 신규 파일 목록에도 부재.
- 팀 정보가 경매 탭 메인에 노출되지 않음: 경매 패널 = 스테이지 → (팀장)입찰컨트롤 → 채팅. 팀 카드는 **현황 탭 전용**(TeamSidebar). requirement 30행 "완전히 제거" 준수. ✔

### 3. 태스크 분할 · DAG — PASS
- DAG: A{001,002,003,004} → B{005} → C{006,007} → D{008(P1)}. 단방향, 순환 없음. ✔
- 분할 적정: 001(L, 615줄 카드에서 상태로직 순수추출→~440줄), 002(M, prop 3종 추가), 003/004(S, 소형 신규), 005(L, 스테이지 HUD 200~400줄), 006/007(M, lg:hidden 블록 재작성), 008(P1 선택). 과대/과소 없음.
- 의존 정합: 005 deps=001(훅)+002(bar variant)+004(티커) 실제 import와 일치. 003은 005와 무관(006/007에서만 배선). ✔

### 4. 병렬 그룹 파일 충돌 — PASS (실측 대조)
소스에서 각 소유 파일이 실제로 분리됨을 확인:
- Group A 배타 소유: 001={`hooks/use-player-card-stage.ts`(신규), `parts/current-player-card.tsx`}, 002={`parts/bid-timer.tsx`}, 003={`parts/mobile-tab-bar.tsx`(신규)}, 004={`parts/fx/mobile-bid-ticker.tsx`(신규)}. 교집합 = ∅. ✔
- Group C: 006={`auction-ongoing-spectator.tsx`}, 007={`auction-ongoing-captain.tsx`}. 서로 다른 뷰 파일, 교집합 ∅. 각자 자기 뷰 파일만 소유. ✔
- 006(spectator)/007(captain): 스테이지·탭바·팀사이드바·채팅은 전부 **import만**(편집 아님) → 워크트리 머지 충돌 없음. ✔
- 001의 `current-player-card.tsx` 수정: 다른 병렬 태스크가 이 파일을 편집하지 않음(005는 훅 import만). ✔
- 008(P1)이 003/006/007을 재수정하나 Group C 전부 머지 후 **단독·순차** → 병렬 충돌 아님. ✔
- 무변경 확정: team-sidebar/chat-panel/player-status-grid/auction-audio-engine/card-rarity/globals.css/ui/*/lib/utils.ts/master-view — 전부 import·재사용만.

### 5. 데스크톱 무변경 보장 — PASS
- 001 = 순수 상태 추출(JSX 마크업/클래스/애니메 파라미터 불변, `stage.*` 치환만) → 데스크톱 카드 렌더 diff 0. ✔
- 002 = 신규 prop 기본값(`variant='default'`, `showNumber=true`, `soundEnabled=true`) = 기존 동작 100% 동일. ✔
- 006/007 = 뷰 루트에 `flex flex-col h-[calc(100dvh-7rem)] overflow-hidden` 추가하되 `lg:block lg:h-auto lg:overflow-visible` 리셋 → 데스크톱은 `block/h-auto/overflow-visible/space-y-4`로 원본과 등가. `hidden lg:grid` 블록·헤더 상태카드 무편집. ✔
- 실측: 데스크톱 `hidden lg:grid` 블록에 BidTimer 없음 → 002 변경이 데스크톱 그리드에 영향 0. 헤더 BidTimer(신규 prop 미지정=기본값)만 존재. ✔

### 6. 백엔드/패키지/이중마운트 방어 — PASS
- 백엔드 무접근: 전 태스크 프론트 전용, 기존 `roomState`/`bidEvents`/`stageEvent`/`chatMessages`만 사용(소켓 타입 export 실측 확인: AuctionBidEvent/StageEvent/ChatMessage/EmitFns 존재). ✔
- 신규 npm 금지: framer-motion/lucide-react 등 기존 의존성만, Radix `ui/tabs.tsx` 강제 아님. ✔
- 이중 마운트 사운드 방어: AD-2 `isActiveViewport` 게이트. 실측상 **현재도** 데스크톱(93행)+모바일(138행) CurrentPlayerCard 2개 동시 마운트 → 현재 `playRevealLegendary`(161·174행) per-instance ref만 있어 **이중 발화 잠재 버그 존재**. 계획의 뷰포트 게이트가 이를 현재 뷰포트 인스턴스 1개로 축소 → 방어이자 기존 버그 해소. 뷰포트 기준(탭 가시성 아님)이라 현황 탭 체류 중에도 발화. ✔

### 7. CSS hidden 토글 + 크래클 단일 소유자 상시 마운트 — PASS
- 언마운트 금지: 006/007 §4 + R1에서 조건부 렌더 명시 금지, 양 패널 `cn(..., activeTab !== 'x' && 'hidden')` 토글만. ✔
- 크래클 단일 소유자: 헤더 상태카드 BidTimer(`soundEnabled` 기본 true)가 **탭 콘텐츠 영역 밖 상위 `shrink-0`** → activeTab 무관 항상 마운트·항상 표시. 스테이지 바 타이머는 `soundEnabled={false}` 무음. 실측상 헤더 BidTimer는 lg:grid/lg:hidden 분기 이전(상태카드)에 위치해 뷰포트/탭 무관 단일 인스턴스 → 이중 크래클 없음. ✔

---

## NIT (비차단 · 참고)

- **[NIT-1] 중간 머지 상태에서의 일시적 모바일 전설음 억제(사용자 비노출)**: task-001 머지 후~006/007 머지 전에는 모바일 `lg:hidden` 블록이 여전히 `CurrentPlayerCard`(ownerViewport='desktop')를 렌더하므로, 모바일 뷰포트에서 `isActiveViewport=('desktop'===='mobile')=false`가 되어 전설음이 임시로 안 울림. **최종 상태(006/007 머지 후 MobileAuctionStage ownerViewport='mobile')에서는 정상 1회 발화**. P0(001~007)는 세트로 배포되므로 사용자 비노출. Integrator는 **전 P0 머지 완료 후에만** 모바일 사운드 회귀 테스트 수행 권장.
- **[NIT-2] 루트 `space-y-4` 잔존**: 006/007이 루트 className에 `space-y-4`를 유지한 채 `flex flex-col` 추가. 모바일 flex-col에서 `space-y-4`는 자식 간 margin으로 작동(상태카드/배너/탭콘텐츠/탭바 간격). 의도된 간격으로 보이나 고정높이 `overflow-hidden` 컨테이너에서 margin이 레이아웃 예산에 포함됨 — flex-1이 잔여 흡수하므로 스크롤 0은 유지되나, Implementor는 375px에서 실제 클리핑 없음을 확인할 것.
- **[NIT-3] ASSIGNING 중 크래클 미발화**: 헤더 BidTimer가 `{!isAssigning && <BidTimer/>}`로 조건부 → 배정 중에는 크래클 없음. 배정 중엔 입찰/도화선이 없으므로 정상 동작. 참고만.

## Integrator 실검증 체크(권장)
1. 전 P0(001~007) 머지 후 375/390/430px에서 관전자·팀장·배너표시 각각 **문서 스크롤 0**.
2. 탭 왕복 후 채팅 draft·스크롤 위치 유지.
3. 현황 탭 체류 중 입찰/낙찰 사운드 1회, 마감 5초 크래클 발화 + 스테이지 바 무음(이중 크래클 0).
4. 데스크톱·모바일 각각 전설 공개음 1회(이중 발화 0).
5. `cd frontend && npm run lint && npm run build` 통과.
