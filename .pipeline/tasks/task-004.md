# Task 004: bid-timer 불타는 도화선 + globals.css 키프레임

## 메타데이터
- 복잡도: M
- 병렬그룹: B (Group A 머지 후 실행)
- 의존: task-001 (오디오 엔진) — `startFuseCrackle`/`stopFuseCrackle` import **필수 선행**
- 변경 파일 (충돌 방지용):
  - 수정(배타 소유): `frontend/src/modules/auction/components/parts/bid-timer.tsx`
  - 수정(배타 소유): `frontend/src/app/globals.css` (신규 키프레임 + reduced-motion 정지 항목 — **globals.css 단일 소유자**)
  - 읽기전용: `frontend/src/modules/auction/hooks/auction-audio-engine.ts` (task-001, import만)

## 목적
마감 임박 타이머를 "불타는 도화선"으로 연출한다: 게이지 끝단 불꽃/스파크 + 옅은 연소 텍스처 + 지지직 크래클 사운드. 기존 `isUrgent`/`isEnded`/`aria-live` 접근성 동작은 회귀 없이 유지한다. **globals.css를 단독 소유**해 신규 키프레임과 그 감소모션 정지 항목을 여기서만 추가한다(다른 태스크는 globals.css 미수정).

## 배경 / 현재 구조 (검증 완료)
- `bid-timer.tsx`(128줄, 단독 파일): `isUrgent = value<=5 && value>0`(32행), `isEnded = value<=0`(33행). 게이지 바(112-125행): `width: ${fraction*100}%` + `backgroundColor: hsl(hue ...)`. `role=timer`/`aria-live`(63-64행), `aria-label=srLabel`. `isEnded`면 "종료" 표시.
- `globals.css`: 기존 키프레임들(`.flash-burst`, `.burst-particle`, `.ring-expand`, `.pulse-live` 등) + `@media (prefers-reduced-motion: reduce)` 블록(477-491행, `.float-slow`/`.ring-spin`/... `animation:none`).

## 구현 방식

### 1. `globals.css` — 신규 키프레임 (기존 파일 내 추가)
- **불꽃 flicker**: `@keyframes timer-flame-kf` — 게이지 끝단 불꽃 스프라이트(scale/opacity/translateY 흔들림). `.timer-flame` 클래스.
- **스파크**: `@keyframes timer-spark-kf` — 짧은 튐(작은 점 상승/소멸). `.timer-spark` 클래스(index 기반 결정적 각도로 여러 개, `--spark-x` 등 CSS 변수 방식 권장 — `.burst-particle` 패턴 참고).
- **연소 텍스처**: `.timer-ember` — 게이지 배경 옅은 그라데이션 노이즈(오렌지/레드 저알파, 오버워치 토큰 `--ow-orange`/`--ow-red` 계열). 정적이어도 무방하나 미세 애니메이션 시 키프레임 추가.
- **reduced-motion**: `@media (prefers-reduced-motion: reduce)` 블록(477행)에 `.timer-flame, .timer-spark { animation: none; }` 추가(정적 대체 — 불꽃은 정지 스프라이트 또는 숨김).
- 색상/간격은 기존 오버워치 토큰/변수 사용(하드코딩 금지). 신규 CSS 파일 생성 금지(기존 globals.css 내 확장만).

### 2. `bid-timer.tsx` — 연소 연출 + 크래클 사운드
- 게이지 바(112-125행) 확장: `isUrgent`일 때 게이지 **끝단**(채워진 폭의 오른쪽 끝)에 `.timer-flame` + `.timer-spark` 요소 오버레이, 게이지 트랙에 `.timer-ember` 배경.
  - 끝단 위치 = 채워진 width의 끝 → 불꽃을 채운 바의 우측 끝에 절대배치(`left: ${fraction*100}%` 근처) 또는 채운 바 내부 우측 정렬.
- 기존 `isUrgent`/`isEnded` 분기, hue 보간, `fraction` 계산, `role=timer`/`aria-live`/`aria-label` 구조 **그대로 유지**(연소 요소는 `aria-hidden`).
- **크래클 사운드**: `isUrgent` 진입 시 `startFuseCrackle()` 1회, `isUrgent` 이탈(종료/낙찰/유찰/WAITING)·언마운트 시 `stopFuseCrackle()`. `useEffect`로 isUrgent 변화 구독, cleanup에서 stop. 중복 시작 방지는 엔진이 보장하나 컴포넌트도 진입/이탈 1회씩만 호출.
- reduced-motion 시 불꽃/스파크는 CSS로 정지(위 미디어쿼리) — 사운드는 유지(모션 아님).

## 성공 기준
- [ ] 마감 5초 전(`isUrgent`)부터 게이지 끝단 불꽃/스파크 + 연소 텍스처가 나타난다.
- [ ] 지지직 크래클 사운드가 `isUrgent` 진입 시 재생되고 이탈/종료/언마운트 시 정지한다(잔류 루프 없음).
- [ ] 기존 타이머 동작 무회귀: hue 보간 게이지, `isUrgent`/`isEnded` 분기, "종료" 표시, `role=timer`/`aria-live`/`aria-label`.
- [ ] `prefers-reduced-motion`에서 불꽃/스파크 애니메이션 정지(정적/숨김), 상태 표시는 유지.
- [ ] 3개 뷰(captain/master/spectator)에서 동일 `BidTimer` 재사용 → 자동 반영, 무회귀.
- [ ] 신규 CSS 파일 없음(globals.css 내 확장). 하드코딩 색상/간격 없음(토큰 사용). `any` 미사용. `cd frontend && npm run lint && npm run build` 통과.

## 테스트 요구사항
- 단위 테스트: isUrgent 진입/이탈에 따른 크래클 start/stop 호출 여부(사운드 함수 목 주입 가능하면 mock, 아니면 로직 분리 후 검증). fraction/isUrgent/isEnded 경계는 기존 동작 유지 확인.
- 수동 검증: 실경매에서 5초 진입 시 불꽃+크래클, 0초 종료 시 정지, WAITING 복귀 시 정지, reduced-motion 정지, 3뷰 확인.

## 제약사항
- `bid-timer.tsx`/`globals.css` 외 파일 수정 금지. 다른 태스크는 globals.css를 수정하지 않음(단일 소유 유지).
- 신규 npm 패키지/신규 CSS 파일 금지. `any` 금지. 오버워치 테마/토큰 유지.
- 기존 접근성 구조(`role=timer`/`aria-live`/`aria-label`) 훼손 금지.
</content>
