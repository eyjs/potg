# 계획 리뷰 — POTG 3차 사이클 (mode: plan-review)

VERDICT: FAIL

리뷰 일시: 2026-07-03
리뷰 대상: `.pipeline/plan.md`, `.pipeline/tasks/task-001.md`~`task-007.md`
기준: `.pipeline/requirement.md` (v2 최종본, tab-navigation)

---

## 결론 요약 (경매 당일, 속도 관점)

**치명 결함 1건으로 FAIL.** 파일 충돌·의존성 DAG·데스크톱 무변경·이중마운트 사운드 처리 등
**"기계적 설계"는 전부 견고**하다. 문제는 단 하나: **계획이 요구사항의 최종 설계(v3 탭 네비게이션)가 아니라
폐기된 이전 설계(v1 "팀 현황 가로 스트립 세로 스택")를 구현하고 있다.**

다행히 7개 태스크 중 **4개(001/002/004/005)는 탭 설계에서도 거의 그대로 재사용 가능**하다.
재작업은 전면 재시작이 아니라 **task-003 교체 + task-006/007의 lg:hidden 재작성 방향 전환**으로 국한된다.

---

## [BLOCKER-1] 계획이 요구사항의 최종 설계와 다른(폐기된) 설계를 구현한다 — P0 대량 누락 + 스코프 외 작업

### 근거 (문서 대조)
requirement.md는 v2 최종본이며, "이전 지시와의 차이"(157-158행)에서 스코프 확정 이력을 명시한다:
> (1) "팀 현황 가로 스트립" → (2) "팀 스트립 제거, 바텀시트" → (3) **최종: 하단 탭 네비게이션으로 화면 자체를 전환**.
> Implementor는 이 문서만을 기준으로 작업하며, 팀 스트립/바텀시트 관련 과거 논의는 참고하지 않는다.

또한 requirement.md 30행: **"팀 현황 가로 스트립 — 스코프에서 완전히 제거"** (명시적 제외 항목).

그런데 plan.md와 태스크는 **정확히 그 폐기된 v1 "가로 스트립 세로 스택"을 구현**한다:
- plan.md 4행: "상단 HUD 스테이지 → **팀 현황 가로 스트립** → [팀장: 입찰 컨트롤] → 하단 채팅"
- **task-003 = `mobile-team-strip.tsx` 신규 생성** = requirement가 "완전히 제거"라고 명시한 컴포넌트를 새로 만든다.
- plan.md P0 매핑표(122-133행)의 항목명("P0-1 뷰포트 고정 3~4존 레이아웃", "P0-5 팀 현황 가로 스트립")은
  **requirement.md의 실제 P0 목록과 대응하지 않는다** — 낡은(stale) 요구사항 기준으로 매핑되어 있다.

사용자가 v1을 거부한 이유("그냥 위에서 아래로 뿌리는 거잖아", requirement 7행)를 그대로 재현한다:
계획의 3존/4존은 여전히 **세로 스택**(스테이지→스트립→채팅)이다.

### requirement.md 실제 P0 → 계획 커버리지 (핵심기능 §P0 1~7 + 스코프 포함 P0)
| requirement 실제 P0 | 계획 반영 | 상태 |
|---|---|---|
| ① 탭 구현 방식 = activeTab 상태 + CSS `hidden` 토글(언마운트 금지) | 없음 | **누락** |
| ② 하단 탭바 `mobile-tab-bar.tsx` (경매/현황, role=tablist, 44px+) | 없음(어느 태스크도 생성 안 함) | **누락** |
| ③ 탭 1 "경매" 상단 스테이지 + 채팅 (스트립 없음) | task-005 스테이지는 있으나 탭 아님·스트립 삽입 | **부분/오염** |
| ④ 탭 2 "현황" = 기존 `TeamSidebar` 재사용(무변경, 스크롤 컨테이너로만 감쌈) | 없음. 대신 신규 `mobile-team-strip.tsx` 생성 | **누락 + 스코프 외** |
| ⑤ 탭 전환 시 소켓/채팅 draft·스크롤 유지 (CSS 토글) | 없음 | **누락** |
| ⑥ 탭 전환 시 경매 사운드 계속 재생 (언마운트 금지) | 없음(탭 개념 자체 부재) | **누락** |
| 도화선 타이머 바 변형 | task-002 ✅ | OK |
| 최근 입찰 티커 | task-004 ✅ | OK |
| 팀장 입찰 컨트롤 재배치 | task-007 ✅(위치만 다름) | OK(재배치 대상은 탭 구조여야) |
| 2차 연출 스테이지 재생 / reduced-motion / 데스크톱 무변경 | task-001/002/005 ✅ | OK |

→ requirement P0 6개 중 **①②④⑤⑥ 5개가 누락**되고, **④의 자리에 스코프 외 컴포넌트(task-003)가 들어감**.

### 수정 지시 (planner 재작업 — 국소 변경으로 처리 가능)
1. **task-003 폐기 → 신규 `mobile-tab-bar.tsx` 태스크로 교체**
   - 신규 파일: `components/parts/mobile-tab-bar.tsx` (하단 탭바, `role="tablist"`/`role="tab"`/`aria-selected`,
     터치 타겟 `h-14`≥44px, 오버워치 skewed/네온 토큰). `mobile-team-strip.tsx`는 **생성 금지**.
   - `TeamSidebar`는 requirement대로 **무변경** — 현황 탭에서 `overflow-y-auto` 컨테이너로 감싸 import만.
     (team-sidebar.tsx 무변경 제약이 오히려 지켜짐.)
2. **task-006/007의 lg:hidden 재작성 방향 전환**: "세로 3/4존 스택"이 아니라 **탭 구조**로.
   - 모바일 루트 flex 자식 = [상단 상태카드 shrink-0] · [배너 shrink-0] · **[탭 콘텐츠 영역 flex-1 min-h-0]** · **[MobileTabBar shrink-0 h-14]**.
   - 탭 콘텐츠 영역 안에 **경매 패널과 현황 패널을 항상 동시 마운트**하고,
     비활성 패널만 `cn(..., activeTab !== 'x' && 'hidden')`로 `display:none` 토글(언마운트 절대 금지).
   - 경매 패널 = MobileAuctionStage(shrink-0) + [팀장: 입찰 컨트롤 shrink-0] + ChatPanel(flex-1 min-h-0). **팀 스트립 삽입 금지.**
   - 현황 패널 = `<div className="h-full overflow-y-auto"><TeamSidebar .../></div>` (관전자 props / 팀장은 myCaptainId 추가).
   - `activeTab` state는 각 뷰 컴포넌트 lg:hidden 블록 최상단 `useState('auction')`로 관리(requirement 60행).
3. **뷰포트 예산 갱신**: 계획의 `calc(100dvh-7rem)` + flex 분배 논리는 유효하나,
   **탭바 `h-14`(3.5rem)를 flex-1 형제 shrink-0으로 추가**하면 탭 콘텐츠가 그만큼 줄어드는 것으로 흡수된다
   (여전히 문서 스크롤 0). 매직값을 늘리지 말고 탭바를 flex 형제로 넣을 것.
4. **P0 매핑표를 requirement의 실제 P0(①~⑥ 탭 항목)로 다시 작성**. 현재 매핑표는 stale 요구사항 기준이라 무효.

### 재사용 가능(그대로 유지) — 재시작 아님
- **task-001** (use-player-card-stage 훅 추출 + 카드 리팩터): 탭 설계에서도 MobileAuctionStage가 훅을 소비하므로 **그대로 유효**.
- **task-002** (bid-timer variant/showNumber/soundEnabled): 경매 탭 스테이지 타이머 바에 **그대로 유효**.
- **task-004** (mobile-bid-ticker): 경매 탭 스테이지 티커로 **그대로 유효**.
- **task-005** (mobile-auction-stage): 경매 탭 상단 스테이지로 **그대로 유효**(스택 최상단이 아니라 탭1 콘텐츠 상단으로 배치만).

---

## 통과한 항목 (재작업 시 보존할 것)

리뷰 기준 3~6번은 **현 계획 상태로도 견고**하다. 탭 설계로 전환해도 그대로 유지·재사용하면 된다.

- **[기준4 — 파일 충돌] PASS.** 소유표(37-53행) 각 파일 = 정확히 1개 태스크 소유. Group A(001~004) 파일집합 상호 교집합 ∅,
  Group C(006=spectator만 / 007=captain만) 서로 다른 뷰 파일. 나머지는 전부 import(편집 아님). **머지 충돌 원천 없음** — 직접 대조 확인.
  - task-001의 `current-player-card.tsx` 수정은 다른 병렬 태스크와 겹치지 않음(005는 훅만 import). 확인.
  - `globals.css`는 "무변경 목표, 불가피 시 task-005 단독 소유" 폴백 — 단일 소유라 충돌 없음(수용).
  - 소스 검증: spectator 161줄/captain 328줄/current-player-card 615줄/bid-timer 218줄/team-sidebar 297줄/chat-panel 140줄
    → requirement/plan의 라인 참조와 **일치**. `ui/tabs.tsx`도 명시 경로에 실재. mobile-* 컴포넌트는 아직 없음(신규 대상 정확).
- **[기준3 — 의존성 DAG] PASS.** A → B(005) → C(006/007) 단방향, 순환 없음. (탭 설계에선 신규 mobile-tab-bar를 Group A에 두면 동일 구조 유지.)
- **[기준5 — 데스크톱 무변경] PASS(설계 근거 타당).** ① 훅 추출은 순수 리팩터(카드 JSX diff 0 목표, git diff 검증 명시),
  ② bid-timer 신규 prop 기본값 = 기존 동작(variant='default'/showNumber=true/soundEnabled=true),
  ③ 뷰 루트는 `lg:block lg:h-auto lg:overflow-visible` 리셋으로 데스크톱 원복. 근거 충분.
- **[기준6 — 백엔드/패키지/이중마운트 사운드] PASS.** 백엔드 무변경(roomState/bidEvents/stageEvent/chatMessages만),
  신규 npm 금지 전 태스크 재확인. 이중마운트 사운드 중복 발화는 **AD-2(isActiveViewport 게이트 + 모듈레벨 lastLegendaryFiredId 가드)**
  와 **AD-3(soundEnabled 단일 소유: 헤더 타이머만 크래클)**, R1/R4에서 **정확히 식별·완화**됨. requirement 핵심기능 §1의 우려와 정합.
  - 참고: 현재 소스도 desktop(`hidden lg:grid`)+mobile(`lg:hidden`) 두 CurrentPlayerCard가 동시 마운트라
    잠재 이중발화가 이미 존재 → AD-2 게이트는 실질 개선이며 회귀 아님(계획 주장 타당). 탭 설계에서도 동일하게 적용됨.

---

## [NIT] (블로커 아님 — 재작업 중 반영 권장)

- **[NIT-1]** 탭 설계 전환 시 크래클 사운드 단독 소유자(헤더 BidTimer)가 **탭과 무관하게 항상 마운트**되는지 배치 확인.
  requirement 뷰포트 예산은 "상단 상태 카드(타이틀+타이머)"를 탭 콘텐츠와 별개로 둔다 → 상태카드를 탭 영역 밖(위)에 두면 자연 충족.
- **[NIT-2]** AD-2가 전설 portal 조건에 `isActiveViewport`를 추가하는 것은 현행 대비 미세한 사운드/플래시 발화횟수 변화(2→1)를 유발.
  계획은 "의도된 정상화"로 규정 — 통합 검증에서 데스크톱 전설 공개 사운드/플래시가 1회인지 실확인(R1대로) 권장.
- **[NIT-3]** P1-8 flight-in(AD-6 문자열 규약)은 탭 설계에서 "목적지(팀 카드)가 다른 탭에 있어 안 보임" 문제가 더 커진다.
  requirement가 이미 P2로 하향(27행)했으므로 P1로 승격하지 말 것 — 정적 갱신 폴백으로 충분.
- **[NIT-4]** task-004 제목이 "최근 입찰 킬로그 티커"인데 requirement 용어는 "최근 입찰 티커". 사소한 명칭 정렬.

---

## 재작업 지시 요약 (planner, 최소 변경 경로)
1. task-003 폐기 → `mobile-tab-bar.tsx` 신규 태스크(Group A)로 교체. `mobile-team-strip.tsx` 생성 금지.
2. task-006/007: lg:hidden을 **탭 구조**(activeTab + CSS hidden 토글, 양 패널 동시 마운트)로 재작성.
   경매 탭 = 스테이지+[입찰]+채팅 / 현황 탭 = TeamSidebar(무변경) overflow-y-auto 래핑. 팀 스트립 삽입 금지.
3. task-001/002/004/005는 유지(탭1 콘텐츠로 배치만 조정).
4. 뷰포트 예산에 탭바 h-14를 flex 형제 shrink-0으로 추가. P0 매핑표를 requirement 실제 P0로 갱신.
5. 재작성 후 재리뷰(plan-review) 1회.
