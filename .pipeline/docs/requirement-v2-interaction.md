# POTG 경매 인터랙션 고도화 (하스스톤식 카드 연출) — 2차 사이클

## 생성일시
2026-07-02 (조사 완료 시각 기준)

## 목적
- 왜 만드는가: 1차 사이클(효과음/이미지 생성/모바일 관전자 뷰/로그인)로 기본 체감 품질을 확보한 뒤, 실시간 경매의 핵심 감정 곡선(매물 공개 → 입찰 경쟁 → 마감 압박 → 낙찰 확정)을 하스스톤 카드팩 오프닝 수준의 게임적 연출로 강화한다. 현재도 `current-player-card.tsx`에 낙찰/유찰 셀레브레이션(베일→링 확산→빛 폭발→스탬프→파티클)이 이미 구현되어 있으나, "매물 공개"와 "입찰 임팩트"·"타이머 긴장감"·"팀 보드 시각화"는 아직 정적이다.
- 누가 사용하는가: 캡틴(입찰 주체), 마스터(진행자), 관전자(모바일 포함) — `CurrentPlayerCard`/`BidTimer`/`TeamSidebar`는 `auction-ongoing-captain.tsx`, `auction-ongoing-master.tsx`, `auction-ongoing-spectator.tsx` 3개 뷰가 **동일 컴포넌트를 공유**하므로, `parts/*.tsx` 확장만으로 3개 역할 전원에게 자동 반영된다.
- 기대 효과: 카드팩 오프닝급 매물 공개 연출로 몰입감 상승, 입찰 경쟁의 물리적 임팩트 체감, 마감 임박 긴장감 강화, 팀 결과를 게임 로스터 보드처럼 시각화.

## 스코프

### 포함 (이번에 만드는 것)
- [ ] 매물 공개 = 팩 오프닝 연출 (카드 뒷면→플립, 등급 프레임/글로우, 전설급 화면 플래시+파티클+전용 사운드)
- [ ] 입찰 = 카드 임팩트 (금액 스탬프 임팩트 + 미세 화면 흔들림, 연속 입찰 콤보 카운터로 강도/피치 상승)
- [ ] 타이머 = 불타는 도화선 연출 (마감 N초 전부터 타이머 바 연소 + 지지직 사운드, 기존 `BidTimer` 확장)
- [ ] 낙찰 = 전설 획득 + 팀 보드 (골든 카드 변신 → 팀 슬롯으로 flight-in, 팀 로스터 보드 시각화 강화)
- [ ] (P2·검토) 낙찰 순간 OverFast 스킬 영상 배경 재생

### 제외 (이번에 만들지 않는 것)
- 관전자 이모트/응원 반응 (사용자 결정으로 제외)
- 예측 베팅 연출 (별도 시스템 — 디스코드 제공 예정, 이 파이프라인 범위 아님)
- 백엔드 신규 API/신규 소켓 이벤트 추가 (기존 `roomState`/`playerSelected`/`bidPlaced`/`bidConfirmed`/`playerPassed`/`timerUpdate` 이벤트와 기존 payload 필드만으로 구현. 단, 등급 프레임의 실제 티어/MMR 반영은 백엔드 필드 노출이 없어 이번 스코프에서 구현 불가 — 특이사항 참조)
- 1차 사이클 산출물(효과음 3종 SFX, 이미지 생성 안정화, 모바일 관전자 레이아웃, 로그인 인증) 자체의 재작업 — 2차는 그 위에 확장만 함
- 실제 서버 렌더링 미디어 트랜스코딩/저장(스킬 영상은 OverFast 원본 CDN을 직접 재생하는 방식만 검토, 자체 인코딩·캐싱 인프라 구축 없음)

## 기술스택
- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Shadcn UI
- 애니메이션: **framer-motion (기존 의존성, `^12.29.0`, 신규 설치 불필요)** — `current-player-card.tsx`에서 이미 `AnimatePresence`/`motion`으로 낙찰/유찰 셀레브레이션 구현 중. 카드 플립/flight-in/스프링 물리 모두 기존 API로 충분.
- 파티클: 신규 라이브러리 도입 없이 기존 2개 패턴 재사용 — (1) `current-player-card.tsx`의 `BURST_PARTICLES`(index 기반 결정적 각도의 `<span>` + CSS keyframe, `globals.css`의 `.burst-particle`/`.flash-burst`) (2) `fx/starfield.tsx`의 canvas rAF 파티클(더 무거운 화면 전체 이펙트가 필요할 때만). `canvas-confetti` 등 신규 패키지 도입은 **권장하지 않음** (번들 증가 대비 이득 낮음, 기존 패턴으로 대체 가능).
- 오디오: 1차 `use-auction-sound.ts`(HTMLAudioElement 또는 Web Audio 오실레이터, 태스크 결정에 따름) 확장. 피치 상승은 `HTMLAudioElement.playbackRate` 조정 또는 (Web Audio 합성 채택 시) 오실레이터 주파수 계수 조정으로 구현 — 신규 라이브러리 불필요.
- Backend: NestJS 11, TypeORM, PostgreSQL, socket.io — **이번 스코프는 원칙적으로 미접근**. 등급 프레임의 실제 티어/MMR 데이터 노출이 불가피하다고 판단될 경우에만 `auctions-room-state.service.ts`의 기존 payload 필드 추가(신규 이벤트 아님)를 3차 이후 별도 검토 (특이사항 참조).

## 핵심 기능

### P0 (필수)

#### 1. 매물 공개 = 팩 오프닝 연출
- **트리거 지점**: `frontend/src/modules/auction/components/parts/current-player-card.tsx:63-64` — 이미 `player.id !== lastPlayer?.id`로 매물 전환을 감지하는 `lastPlayer` state 패턴이 존재. **신규 소켓 이벤트 불필요** — 동일 패턴으로 "새 매물 공개" 트리거를 판별한다 (`roomState.currentPlayer`가 `playerSelected`/`roomState` 브로드캐스트로 갱신되는 기존 경로 재사용).
- **접근 방식**: 매물 전환 감지 시 `biddingPhase === 'WAITING'` 구간에서 카드 뒷면(엠블럼/실루엣) → 플립 → 정면 공개 애니메이션을 `framer-motion`의 3D `rotateY` 트랜지션으로 구현. 현재 아바타(`Avatar` + `AvatarImage src={portraitByKey.get(hero) ?? avatarUrl}`, 라인 136-157)를 카드 아트로 그대로 사용 — `displayPlayer.hero`가 `RoomStateParticipant.user.representativeHero`(대표 영웅) 기반이므로 별도 작업 없이 이미 대표 영웅이 카드 아트에 쓰이고 있음.
- **등급 프레임**: 아래 "등급 프레임 산정 기준" 참조 — 실제 티어/MMR 데이터가 프론트까지 내려오지 않으므로, 매물 id 기반 **결정적 pseudo-rarity**(일반/레어/전설 확률 배분, 예: 70/25/5)를 기본안으로 채택. 프레임 색상/글로우는 등급별 CSS 클래스(`border-*`, `drop-shadow-*`)로 `Avatar` 테두리와 카드 외곽에 적용.
- **전설급 연출**: 화면 전체 플래시(기존 `.flash-burst` radial-gradient 패턴 확장, 전체 뷰포트 오버레이) + 파티클(`BURST_PARTICLES` 패턴 재사용, 개수/반경 확대) + 전용 사운드(1차 `use-auction-sound.ts`에 `reveal-legendary` 종류 추가, HTMLAudioElement 또는 오실레이터 합성).

#### 2. 입찰 = 카드 임팩트
- **트리거 지점**: `use-auction-socket.ts:132-142`의 `bidPlaced` 리스너가 이미 `pushBidEvent({ kind: 'bid', ... })`로 `bidEvents` 배열에 push (1차 task-001이 이 파일을 배타적으로 소유하므로 **2차는 이 파일을 재수정하지 않는다** — `bidEvents` 배열은 이미 `id`/`timestamp`를 포함해 외부로 노출되어 있으므로, 콤보 카운터는 `current-player-card.tsx` 또는 신규 프론트 훅에서 `bidEvents`를 구독해 `kind==='bid'` 항목의 연속 타임스탬프 간격만으로 계산 가능 — **`use-auction-socket.ts` 수정 불필요**).
- **접근 방식**: 새 `kind:'bid'` 이벤트 수신 시 금액 텍스트가 카드 입찰가 패널(`current-player-card.tsx:210-216`, 기존 `bid-pop` 클래스 확장)에 "꽂히는" 임팩트 애니메이션(스케일 오버슈트 + 짧은 회전) + `document.body` 또는 카드 컨테이너에 `transform: translate` 기반 미세 화면 흔들림(4~6px, 80~120ms, `prefers-reduced-motion` 시 생략).
- **콤보 카운터**: N초(예: 3초) 이내 연속 `bid` 이벤트 개수를 세어 콤보 배지 표시, 콤보 단계별로 임팩트 스케일/흔들림 강도/사운드 `playbackRate`(또는 오실레이터 주파수 계수)를 단계적으로 상승. 콤보는 매물 전환 또는 N초 무입찰 시 리셋.

### P1 (중요)

#### 3. 타이머 = 불타는 도화선
- **대상 파일**: `frontend/src/modules/auction/components/parts/bid-timer.tsx` (단일 파일, 다른 1차 태스크가 소유하지 않음).
- **접근 방식**: 기존 게이지 바(라인 111-125, `width: ${fraction*100}%` + hue 보간)를 확장 — 마감 N초 전(`isUrgent`, 이미 `value <= 5` 판정 존재, 라인 32)부터 게이지 끝단에 불꽃/스파크 스프라이트를 CSS keyframe으로 추가하고, 게이지 배경에 옅은 연소 텍스처(그라데이션 노이즈)를 얹는다. 기존 `isUrgent`/`isEnded` 분기, `aria-live`/`role=timer` 접근성 구조는 그대로 유지.
- **사운드**: 지지직(도화선 연소) 사운드는 1차 오디오 유틸 패턴 재사용 — `isUrgent` 진입 시 1회, 필요 시 루프(짧은 loop, 종료 시 정지). 볼륨/피치는 고정(콤보와 별개).

#### 4-a. 낙찰 = 전설 획득 + 팀 보드 (골든 카드 변신 + flight-in)
- **트리거 지점**: `current-player-card.tsx:66-71`의 기존 `stageEvent.seq` 감지 → `celebrate==='sold'` 분기(라인 230-310, 이미 낙찰 셀레브레이션 구현됨)를 **확장**. 골든 카드 변신(테두리/배경 골드 그라데이션 전이)은 기존 `celebrate==='sold'` 블록에 애니메이션 단계 추가로 구현.
- **flight-in 대상**: `frontend/src/modules/auction/components/parts/team-sidebar.tsx` — 이미 팀별 카드에 크라운/팀명/포인트/멤버 아바타 행/에너지 게이지를 갖춘 "보드" 형태(라인 55-222)이므로 완전 신규 컴포넌트가 아니라 **기존 `TeamSidebar`에 신규 영입 멤버 슬롯의 flip-in/pop 애니메이션을 추가**하는 방식을 권장 (라인 140-167의 `team.members.map` 렌더링에 최근 추가된 멤버만 진입 애니메이션 적용 — 예: 직전 `stageEvent.seq`와 매칭되는 멤버 id를 감지).
- **카드 flight 경로**: `CurrentPlayerCard`(중앙)에서 낙찰 팀의 `TeamSidebar` 카드 위치로 날아가는 연출은 두 컴포넌트가 서로 다른 DOM 트리(형제가 아닌 별도 그리드 셀)에 위치하므로, `framer-motion`의 `layoutId` 공유 애니메이션(같은 `layoutId`를 가진 요소가 다른 위치에 나타나면 자동 보간 이동) 사용을 권장 — 두 컴포넌트가 부모(`auction-ongoing-captain.tsx`/`auction-ongoing-master.tsx`)에서 함께 `LayoutGroup`으로 감싸져 있어야 동작하므로, 이 두 뷰 파일의 최소 수정(래핑)이 필요할 수 있음.

### P2 (있으면 좋음)

#### 4-b. 낙찰 순간 스킬 영상 배경 재생 (검토)
- **실현 가능성 확인 결과**: OverFast API의 `/heroes/{key}` 상세 엔드포인트(`https://overfast-api.tekrop.fr/heroes/{key}`, 기존 `use-heroes.ts`가 쓰는 목록 엔드포인트와 별개)가 각 스킬의 `video.link.mp4`/`video.link.webm` URL을 실제로 제공함을 curl로 직접 확인했다 (예: Genji Shuriken/Deflect 등, 1920x1080p30 원본). 영상은 `blz-contentstack-assets.akamaized.net` 호스트에 위치.
- **팀장님이 언급한 "프록시 화이트리스트 등록됨"은 사실과 다름 — 정정 필요**: `backend/src/modules/auctions/auctions.controller.ts`의 `image-proxy`(라인 31-136)는 (1) 호스트 화이트리스트가 `overfast-api.tekrop.fr`/`d15f34w2p8l1cc.cloudfront.net`(OverFast 초상화)/Discord 아바타 2개뿐이며 스킬 영상 호스트(`blz-contentstack-assets.akamaized.net`)는 **포함되어 있지 않고**, (2) 응답 content-type을 `image/png|jpeg|webp|gif|avif`로만 제한해 **video/mp4·video/webm 자체를 차단**한다 (라인 118-127). 즉 현재 프록시로는 스킬 영상을 절대 통과시킬 수 없다.
- **그럼에도 백엔드 변경 없이 구현 가능**: 위 프록시는 `html-to-image` canvas 캡처 시 발생하는 cross-origin taint 문제를 우회하기 위한 것(2차 요구사항의 결과 이미지 생성과 동일 맥락)이며, 이번 기능은 **캡처가 아닌 단순 `<video>` 재생**이므로 애초에 프록시/CORS 헤더가 필요 없다. `<video src="https://blz-contentstack-assets.akamaized.net/...mp4">`를 프론트에서 직접 렌더링하면 별도 백엔드 변경 없이 재생 가능 (일반 브라우저의 cross-origin video 재생은 CORS 제약을 받지 않음, 픽셀 접근이 필요한 canvas 캡처 시에만 문제가 됨).
- **P2로 낮추는 이유(리스크)**: (1) 원본 영상이 1920x1080 수준으로 파일 크기가 수 MB~수십 MB로 커 모바일 데이터/성능 부담이 큼 (2) 어떤 스킬 영상을 대표로 쓸지 선정 기준 필요(궁극기 우선 등, API 응답에 궁극기 플래그가 명확하지 않아 휴리스틱 필요) (3) `/heroes/{key}` 상세 API를 낙찰 시점에 새로 fetch해야 해 지연 발생 가능 (4) 모바일 관전자/`prefers-reduced-motion` 환경에서는 재생하지 않는 것이 사실상 필수라 P0/P1 대비 체감 이득이 제한적.
- **권장**: 데스크톱 한정, feature flag 형태로 검토 구현. 뮤트 자동재생(`muted autoplay loop` 또는 1회 재생 후 정지), 로드 실패/지연 시 기존 골드 카드 연출로 조용히 폴백.

## 등급 프레임 산정 기준 (조사 결론)
- **실제 티어/MMR 데이터는 현재 프론트에 전달되지 않는다.** `backend/src/modules/users/entities/user.entity.ts:41-42`에 `rating` 컬럼이 존재하나 주석상 "OverFastAPI 연동 후 실제 랭크 사용" 예정 필드로 대다수 값이 비어있을 가능성이 높고, 무엇보다 `AuctionsRoomStateService.getRoomState()`(`auctions-room-state.service.ts:174-188`)의 `currentPlayer` 조립 로직과 프론트 `RoomStatePlayer` 타입(`types.ts:68-74`) 어디에도 `rating`/tier 필드가 포함되어 있지 않다. 코드베이스 전체(backend+frontend)에서 `tier`/`mmr` 키워드 자체가 존재하지 않는다.
- **기본안(채택 권장)**: 매물(`player.id`) 기반 **결정적 해시 → 등급 매핑** (예: id 문자열 해시값 % 100 구간으로 일반/레어/전설 배분, 시드 고정이라 같은 매물은 새로고침해도 같은 등급 유지). 실제 실력을 반영하지 않는 순수 코스메틱 연출이며, "카드팩 오프닝의 재미" 자체가 목적이므로 하스스톤 등급 시스템의 정신(희소성 연출)에 부합. UI 문구에서 "등급"을 실력 지표처럼 표현하지 않도록 주의(예: "S급 매물" 대신 "레전더리 카드" 등 게임적 표현 권장).
- **대안(비권장, 3차 이후 검토)**: 실제 데이터 기반 등급을 원할 경우 `auctions-room-state.service.ts`의 `currentPlayer`/`unsoldPlayers` 조립 시 `user.rating`을 추가 노출하는 **최소 백엔드 필드 확장**이 필요(신규 API/신규 소켓 이벤트는 아니고 기존 payload 필드 추가). 다만 (1) `rating` 값의 실제 채움 여부 확인 필요(대부분 null이면 의미 없음) (2) 이번 2차는 "백엔드 신규 API/소켓 이벤트 추가 금지" 원칙이므로 스코프 외로 명확히 제외하고, 필요 시 3차 요구사항으로 별도 상정할 것을 권장.

## 제약사항 (CLAUDE.md + requirement.md 공통 원칙)
- `any` 타입 사용 금지.
- Tailwind CSS만 사용, 별도 CSS 파일 신규 생성 금지 — 단, 기존 `globals.css`의 keyframe 확장(예: `.burst-particle`, `.flash-burst`, `prefers-reduced-motion` 블록 추가 항목)은 기존 파일 내 추가이므로 허용 범위로 간주(신규 라이브러리/신규 CSS 파일 생성과는 구분).
- `frontend/src/components/ui/*`(Shadcn), `frontend/src/lib/utils.ts` 수정 금지 — `cn()` 유틸로 클래스 병합.
- 신규 npm 라이브러리 도입 최소화 원칙 — 이번 스코프는 기존 `framer-motion` 재사용만으로 4개 기능 모두 구현 가능하다고 판단, **신규 라이브러리 도입 없음**을 기본 방침으로 한다. Implementor가 구현 중 불가피하게 라이브러리가 필요하다고 판단하면 (예: 정밀 사운드 피치 시프트 등) 핸드오프에 (1) 왜 기존 스택으로 불가능한지 (2) 번들 크기 영향 (3) 대안 검토 근거를 명시하고 도입해야 한다.
- 오버워치 테마(futuristic, skewed buttons, 고대비 네온) 및 기존 디자인 토큰/색상 체계(`--ow-gold`, `--ow-blue`, `--ow-red` 등) 유지 — 하드코딩 색상/폰트/간격 금지.
- **접근성 — `prefers-reduced-motion` 필수 대응**: `globals.css:477-492`에 이미 감소 모션 시 장식 애니메이션을 정지시키는 미디어쿼리 블록이 있고, `fx/starfield.tsx`가 `window.matchMedia('(prefers-reduced-motion: reduce)')`로 canvas 애니메이션을 정적 렌더로 대체하는 기존 패턴이 있음. 2차의 신규 keyframe/파티클/영상/화면 흔들림 전부 동일 원칙 적용 — reduced-motion 환경에서는 플립/흔들림/파티클/영상을 생략하고 상태 변화만 즉시 반영(정적 등급 프레임·정적 골드 테두리 등은 유지 가능).
- **모바일 관전자 뷰(task-003 산출물) 동작 범위**: `auction-ongoing-spectator.tsx`의 모바일 블록도 `CurrentPlayerCard`/`BidTimer`/`TeamSidebar`(팀 보드는 모바일에서 숨김 대상이므로 4-a의 flight-in은 모바일 미노출)를 그대로 재사용하므로 2차 연출이 자동 반영된다. 모바일에서는 데이터/성능 절약을 위해 (1) 화면 흔들림 강도 축소 또는 생략 (2) 전설급 화면 플래시/파티클 개수 축소 (3) P2 스킬 영상은 데스크톱 전용으로 제한을 권장.
- 백엔드 변경 없음이 원칙 (등급 프레임 실데이터화·스킬 영상 프록시화는 모두 스코프 제외, 위 섹션 참조).

## 성공 기준
- [ ] 새 매물이 공개되면 카드 뒷면→플립 애니메이션 후 정면(대표 영웅 아트)이 드러나며, 매물 id 기반 결정적 등급(일반/레어/전설) 프레임이 표시된다.
- [ ] 전설급 매물 공개 시 화면 플래시 + 파티클 + 전용 사운드가 함께 발화한다(중복 재생 없음, 1차 오디오 unlock 패턴과 충돌 없음).
- [ ] 입찰 발생 시 금액이 카드에 꽂히는 임팩트 애니메이션과 미세 화면 흔들림이 발생한다.
- [ ] N초 이내 연속 입찰 시 콤보 카운터가 증가하고, 콤보 단계에 따라 이펙트 강도/사운드 피치가 상승하며, 매물 전환 또는 무입찰 시 리셋된다.
- [ ] 마감 5초 전부터 타이머 바에 연소 연출과 지지직 사운드가 재생되고, 기존 `isUrgent`/`isEnded`/`aria-live` 접근성 동작은 회귀 없이 유지된다.
- [ ] 낙찰 시 카드가 골드로 변신하며, 낙찰 팀의 `TeamSidebar` 카드에 신규 멤버 슬롯이 진입 애니메이션과 함께 표시된다.
- [ ] `prefers-reduced-motion: reduce` 환경에서 위 모든 동적 연출(플립/흔들림/파티클/flight/영상)이 생략되거나 정적 버전으로 대체된다.
- [ ] 모바일 관전자 뷰(`lg:hidden` 블록)에서 팀 보드(4-a) flight-in은 노출되지 않고(팀 사이드바 자체가 모바일 미노출), 나머지 연출은 축소된 강도로 정상 동작한다.
- [ ] 데스크톱(`lg` 이상) 캡틴/마스터/관전자 3개 뷰 모두에서 회귀 없이 동작한다(`CurrentPlayerCard`/`BidTimer`/`TeamSidebar` 공유 컴포넌트 특성상 3개 뷰 모두 검증 필요).
- [ ] `cd frontend && npm run lint && npm run build` 통과.
- [ ] (P2 채택 시) 스킬 영상 재생 실패/지연 시 골드 카드 연출로 조용히 폴백되고, 모바일에서는 재생되지 않는다.

## 특이사항

### 1차와의 파일 충돌 및 착수 순서 제약
1차 태스크(`task-001.md`~`task-004.md`)의 변경 파일을 확인한 결과:

| 1차 태스크 | 소유/수정 파일 | 2차와의 관계 |
|---|---|---|
| task-001 (효과음) | 신규 `use-auction-sound.ts`, `public/sounds/*.mp3`, 배타적 소유 `use-auction-socket.ts`(배선 1줄) | 2차 기능 1(전설 사운드)·2(콤보 피치)·3(도화선 사운드)이 `use-auction-sound.ts`를 **확장**해야 함 — **1차 task-001 머지 후 착수 필수**. `use-auction-socket.ts`는 2차가 재수정할 필요 없음(콤보는 이미 노출된 `bidEvents` 타임스탬프만으로 계산 가능, 위 기능 2 참조). |
| task-002 (이미지 생성) | `auction-completed.tsx`, (조건부) `auction-result-poster.tsx` | 2차 스코프와 파일 겹침 없음(팀 보드 연출은 `team-sidebar.tsx` 대상, 완료 후 결과 화면이 아닌 진행 중 화면). 순서 제약 없음. |
| task-003 (모바일 관전자) | `auction-ongoing-spectator.tsx` (단일 파일) | 직접 파일 충돌은 없으나(2차는 `parts/*.tsx` 공유 컴포넌트를 수정), task-003이 만든 모바일 블록이 그 공유 컴포넌트를 그대로 쓰므로 **논리적 의존**이 있음 — 모바일 레이아웃이 먼저 안정화된 뒤 2차 연출을 얹어야 모바일 QA가 이중으로 흔들리지 않음. **1차 task-003 머지 후 착수 권장**. |
| task-004 (로그인) | auth 관련 파일 전체 | 2차와 겹침 없음. |

- `current-player-card.tsx`, `bid-timer.tsx`, `team-sidebar.tsx`는 1차 어느 태스크도 배타적으로 소유하지 않지만(task-001/003이 "import만" 하는 대상일 뿐), 1차 파이프라인이 현재 Phase 3(Design)/Phase 4(Implementation) 진행 중이므로 **2차는 1차의 Phase 6(Integration, 전체 브랜치 머지) 완료 후 착수**하는 것을 강하게 권장한다. 파이프라인 아키텍처상으로도 `.pipeline/status.json`이 단일 SSOT이며 동시에 두 파이프라인을 구동할 수 없으므로, 이 문서가 `requirement.md`로 승격되는 시점 자체가 자연히 1차 완료 이후가 된다.
- `auction-ongoing-captain.tsx`/`auction-ongoing-master.tsx`는 4-a(flight-in `layoutId` 공유)를 위해 `LayoutGroup` 래핑이 필요할 수 있어 최소 수정 대상에 포함될 가능성이 있음 — Planner 단계에서 태스크 분할 시 파일 충돌 방지 표에 명시 필요.

### 등급 프레임 관련 재확인 필요 사항
- 위 "등급 프레임 산정 기준"에서 결정적 해시 기반 코스메틱 등급을 기본안으로 제시했으나, 이는 사용자가 요청한 "티어/MMR 기반"과는 다른 접근이다. 사용자가 실제 데이터 기반 등급을 원한다면 3차 사이클에서 백엔드 `rating` 필드 노출 여부를 먼저 확인(값이 실제로 채워지고 있는지)한 뒤 별도 요구사항으로 상정해야 한다.

### P2 스킬 영상 관련 정정
- 팀장 지시에 있던 "OverFast 스킬 영상이 프록시 화이트리스트에 등록되어 있다"는 사실이 아니다(위 "실현 가능성 확인 결과" 참조). 다만 캡처가 아닌 단순 재생 목적이라 프록시 없이도 구현 가능하므로 기능 자체는 백엔드 무변경으로 실현 가능하며, P2로 유지하되 위 리스크(파일 크기/성능/모바일)를 고려해 데스크톱 한정 검토를 권장한다.

## 생성한 파일
- `/Users/eyjs/Desktop/WorkSpace/potg/potg/.pipeline/docs/requirement-v2-interaction.md` (본 문서)
