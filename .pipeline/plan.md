# 구현 계획 — POTG 경매 고도화 (효과음 / 이미지 생성 수정 / 모바일 관전자 뷰 / 로그인 무한 새로고침)

## 요약
requirement.md의 4개 P0 항목을 **파일 충돌이 전혀 없는 4개 태스크**로 분할한다. 4개 모두 서로 다른 파일 집합만 건드리므로 **단일 병렬 그룹 A에서 동시 실행** 가능하다. 진단·근본원인·수정방향은 requirement.md에 이미 확정되어 있어, 각 태스크는 지정된 파일만 최소 침습으로 수정한다.

## 스코프

### 포함
- P0-1 효과음: 입찰(bid)/낙찰(sold)/유찰(pass) 3종 SFX 재생 + 모바일 autoplay unlock
- P0-2 이미지 생성 수정: `auction-completed.tsx` `handleDownload` 에러 로깅 + `document.fonts.ready` await + `toPng` 옵션 보강 + 1회 자동 재시도 + 실패 토스트
- P0-3 모바일 관전자 레이아웃: `auction-ongoing-spectator.tsx` 를 `hidden lg:grid`(데스크톱) / `lg:hidden`(모바일: 경매현황 + 채팅만) breakpoint 분기
- P0-4 로그인 무한 새로고침 수정: 백엔드 JWT를 쿠키+Authorization 헤더 이중 추출로 확장 + 로그인 응답 바디에 access_token 포함, 프론트 axios Bearer 폴백 + auth-context가 fetchUser 실패를 표면화

### 제외 (requirement.md 명시)
- 캡틴/마스터용 모바일 조작 UI (관전자 뷰만)
- 효과음 음소거/볼륨/음원선택 등 P1·P2 고급설정
- 결과 이미지 템플릿 디자인 변경 (생성 안정성만)
- 프론트/백엔드 도메인 통일(방안 2, 인프라 변경) — 후속 requirement로 분리
- 게스트 매물 수기 업로드 (별도 파이프라인)

## 아키텍처 결정
- **효과음 트리거는 `useAuctionSocket` 내부에서 신규 훅 `useAuctionSound(bidEvents, stageEvent)` 호출로 배선한다.** 근거: 이미 `bidEvents`(입찰/낙찰 피드)와 `stageEvent`(seq 기반 1회성 낙찰/유찰 트리거)가 이 훅의 상태로 존재하고, 마스터/캡틴/관전자 모든 뷰가 이 훅을 공유하므로 role 무관하게 일관 재생된다. page.tsx나 각 뷰 컴포넌트를 건드리지 않아 파일 충돌 0.
- **효과음 에셋 전략(Planner 최종 결정): 기본안 = 네이티브 `HTMLAudioElement` + CC0 mp3 3종(`public/sounds/`), 폴백 = Web Audio API 오실레이터 합성.** 무료/CC0 라이선스 SFX 확보가 어려우면 폴백으로 전환하되, 두 경로 모두 "3종 재생 + 모바일 unlock" 성공기준을 충족해야 한다. 어느 쪽을 택하든 태스크가 막히지 않도록 task-001에 두 경로를 모두 명시.
- **로그인 수정은 backend+frontend를 한 태스크로 유지한다.** 근거: "로그인 응답 바디에 access_token 반환 ↔ 프론트가 이를 저장/Bearer 첨부 ↔ 백엔드 jwt.strategy가 헤더 추출"은 하나의 계약(contract)으로 얽혀 있어 분할 시 태스크 간 계약 의존이 생기고 통합 리스크가 커진다. 단일 worktree가 auth 관련 파일 전부를 소유해 다른 태스크가 `api.ts`/`auth-context.tsx`를 만지지 않음을 보장한다. 기존 쿠키 인증(소켓 인증 포함)은 회귀 없이 유지.
- **모바일 레이아웃은 같은 URL 반응형 분기.** 별도 라우트 신설 시 소켓/roomState 로직 이중화 위험 → `AuctionOngoingSpectator` 단일 컴포넌트 내부에서 Tailwind breakpoint로만 분기.

## 태스크 목록
| # | 태스크 | 우선순위 | 병렬그룹 | 파일셋 | 의존성 |
|---|--------|----------|----------|--------|--------|
| 001 | 경매 효과음 (입찰/낙찰/유찰 + 모바일 unlock) | P0 | A | `hooks/use-auction-sound.ts`(신규), `public/sounds/*`(신규, 폴백 시 없음), `hooks/use-auction-socket.ts`(수정) | 없음 |
| 002 | 결과 이미지 생성 실패 진단·수정 | P0 | A | `components/auction-completed.tsx`(수정), `components/parts/auction-result-poster.tsx`(선택 수정) | 없음 |
| 003 | 모바일 관전자 반응형 레이아웃 | P0 | A | `components/auction-ongoing-spectator.tsx`(수정) | 없음 (Design 산출물 소비) |
| 004 | 로그인 무한 새로고침(리다이렉트 루프) 수정 | P0 | A | BE: `auth/jwt.strategy.ts`, `auth/auth.controller.ts`, `auth/auth.service.ts` / FE: `lib/api.ts`, `context/auth-context.tsx`, `app/login/page.tsx` (모두 수정) | 없음 |

## 병렬 실행 그래프
```
Design 단계 (계획 리뷰 후) ──▶ task-003 전용 모바일 레이아웃 스펙 생성
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        ▼            ▼            ▼            ▼
   [그룹 A · 4개 태스크 전부 동시 실행 — worktree 격리]
   task-001      task-002      task-003      task-004
   (효과음)      (이미지)      (모바일)      (로그인)
        └──────────────┬───────────────┬──────────────┘
                       ▼
             Reviewer (코드+디자인 리뷰) ──▶ Integrator (머지+빌드)
```
- **전 태스크 병렬**: 001·002·003·004는 서로 의존이 없고 파일 교집합이 공집합이므로 4개 worktree에서 완전 동시 실행한다.
- **순차 요소 없음** (태스크 간): 유일한 선행은 Design 단계이며, 이는 task-003에만 스펙을 공급한다. 001·002·004는 Design 산출물과 무관하게 시작 가능하다(파이프라인 순서상 Design 완료 후 일괄 착수해도 무방).

## 파일 충돌 분석 (각 파일이 정확히 하나의 태스크에만 속함)
| 파일 | 소속 태스크 | 다른 태스크의 접근 |
|------|-------------|---------------------|
| `frontend/src/modules/auction/hooks/use-auction-sound.ts` (신규) | 001 | 없음 |
| `frontend/public/sounds/*` (신규) | 001 | 없음 |
| `frontend/src/modules/auction/hooks/use-auction-socket.ts` | 001 | 002·003은 **type import만**(수정 없음) |
| `frontend/src/modules/auction/components/auction-completed.tsx` | 002 | 없음 |
| `frontend/src/modules/auction/components/parts/auction-result-poster.tsx` | 002 | 없음 |
| `frontend/src/modules/auction/components/auction-ongoing-spectator.tsx` | 003 | 없음 |
| `frontend/src/lib/api.ts` | 004 | 없음 |
| `frontend/src/context/auth-context.tsx` | 004 | 없음 |
| `frontend/src/app/login/page.tsx` | 004 | 없음 |
| `backend/src/modules/auth/jwt.strategy.ts` | 004 | 없음 |
| `backend/src/modules/auth/auth.controller.ts` | 004 | 없음 |
| `backend/src/modules/auth/auth.service.ts` | 004 | 없음 |

**증명**: 위 표의 "소속 태스크" 열에 중복 파일이 없다. task-001만 `use-auction-socket.ts`를 **수정**하고, task-002/003은 해당 파일에서 타입(`AuctionBidEvent`, `AuctionStageEvent`, `AuctionChatMessage`)을 **import만** 한다(수정 없음). import는 파일 편집이 아니므로 worktree 머지 충돌을 일으키지 않는다. 따라서 4개 태스크는 완전 격리되어 동시 실행·독립 머지가 가능하다.

**주의 (Integrator/Reviewer용)**: `current-player-card.tsx`의 `stageEvent` 셀레브레이션 연출과 task-001의 효과음은 **동일한 `stageEvent.seq`를 각각 독립 구독**한다(연출은 컴포넌트, 효과음은 훅). 서로 파일이 다르고 상태를 공유만 하므로 충돌 없음. 다만 낙찰/유찰 시 시각 연출과 효과음이 동시에 1회 발화하는 것이 정상 동작임을 리뷰 시 확인할 것.

## 디자인 단계 필요 여부
- **task-003 (모바일 관전자 레이아웃)만 Design 스펙이 필요**하다. 트위치/치지직 세로 시청 스타일: 상단 고정 = 실시간 경매현황(`CurrentPlayerCard` + 현재가/입찰선두 + `BidTimer`), 하단 = 채팅(`ChatPanel`, 남은 높이 채움 + 입력창 하단 고정). 오버워치 테마/디자인 토큰 유지, 375~430px 뷰포트 기준. Designer는 이 스펙(간격·breakpoint·채팅 높이 계산·sticky 입력창)을 `lg` 미만 블록용으로 산출한다.
- task-001·002·004는 시각 변경이 없거나(로직/인프라) 기존 디자인을 그대로 재사용하므로 Design 불필요.

## 리스크
- **R1 (task-001) 효과음 에셋 라이선스**: CC0 SFX 확보 실패 시 Web Audio API 합성으로 폴백. 완화: task-001에 두 경로 모두 명시(어느 쪽이든 성공기준 충족). 오버워치 테마에 맞는 톤은 낙찰=상승 골드톤, 유찰=하강 저음, 입찰=짧은 클릭틱으로 가이드.
- **R2 (task-001) 모바일 autoplay 차단**: iOS/모바일은 첫 사용자 제스처 전 재생 불가. 완화: 최초 1회 `pointerdown`/`touchstart`로 AudioContext/오디오 unlock. 제스처 전 이벤트는 무음이 정상이며 실패로 간주하지 않음.
- **R3 (task-002) 실제 콘솔 에러 부재**: 코드 리딩 기반 추정. 완화: 1차로 에러 로깅부터 추가(진단 가능화)하고, `fonts.ready`+옵션 보강+재시도로 알려진 원인(cross-origin stylesheet, 폰트 타이밍)을 선제 차단하는 2단계 접근. `skipFonts`/`fontEmbedCSS` 적용 시 캡처 폰트가 시스템 폰트로 대체될 수 있어 시각 트레이드오프 확인 필요.
- **R4 (task-004) 헤더 폴백이 기존 쿠키 흐름을 깨뜨릴 위험**: 완화: `ExtractJwt.fromExtractors([쿠키, Bearer])`로 **쿠키 우선 + 헤더 폴백** 이중 추출 — 기존 쿠키 경로(소켓 인증 포함) 무회귀. 토큰을 응답 바디에 담아 프론트 저장 시 XSS 노출면 증가 → localStorage 저장 시 주석으로 트레이드오프 명시(근본 해결은 방안 2 도메인 통일, 후속 과제).
- **R5 (task-004) 회귀 테스트 필요**: 신규 브라우저(시크릿) 정상 진입 + 기존 브라우저/소켓 인증 무회귀 둘 다 검증. 백엔드 `jwt.strategy`/`auth.controller` 유닛·통합 테스트 갱신.
- **R6 (전체) lint/build 게이트**: `cd frontend && npm run lint && npm run build`, 백엔드 변경분은 `cd backend && npm test` 통과 필수.
