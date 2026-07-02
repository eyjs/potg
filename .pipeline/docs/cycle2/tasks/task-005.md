# Task 005: (P2·선택) 낙찰 순간 OverFast 스킬 영상 배경 재생

## 메타데이터
- 복잡도: M
- 병렬그룹: C (Group B의 task-003 머지 후 실행) — **선택(optional)**
- 우선순위: P2 — P0(001~004) 완료·안정에 지장 없을 때만 착수. 지장 시 **생략 가능**.
- 의존: task-003 (current-player-card 통합) — 낙찰 셀레브레이션 지점에 배경을 mount하므로 카드 파일 재수정 필요, task-003 머지 필수 선행
- 변경 파일 (충돌 방지용):
  - 신규(배타 소유): `frontend/src/modules/auction/components/parts/fx/skill-video-backdrop.tsx`
  - 수정(재수정): `frontend/src/modules/auction/components/parts/current-player-card.tsx` (task-003 소유 파일을 **Group C에서 순차 재수정** — 배경 mount 1지점만 추가)
  - 읽기전용: `frontend/src/modules/auction/hooks/use-heroes.ts` (목록 엔드포인트 패턴 참고)

## 목적
낙찰 순간, 낙찰된 매물의 대표 영웅 스킬 영상을 카드 뒤 배경으로 뮤트 재생해 몰입감을 높인다(데스크톱 한정). 백엔드 무변경(단순 `<video>` 재생, 프록시/CORS 불필요). 실패/지연 시 기존 골드 카드 연출로 **조용히 폴백**한다.

## 배경 / 실현 가능성 (requirement.md 확인 결과)
- OverFast `/heroes/{key}` 상세 엔드포인트가 스킬 `video.link.mp4`/`.webm`(`blz-contentstack-assets.akamaized.net`) 제공. 목록 엔드포인트(`use-heroes.ts`, `https://overfast-api.tekrop.fr/heroes?locale=ko-kr`)와 별개.
- 캡처가 아닌 단순 재생 → cross-origin video는 CORS 제약 없음(픽셀 접근 없음). 백엔드 image-proxy 불필요/무관.
- 리스크: 원본 1080p 수 MB~수십 MB(모바일 부담), 대표 스킬 선정 휴리스틱 필요, 낙찰 시점 fetch 지연. → P2·데스크톱 한정·폴백 필수.

## 구현 방식

### 1. `skill-video-backdrop.tsx` (신규 컴포넌트)
- Props: `heroKey: string | null`, `active: boolean`(낙찰 셀레브레이션 중 여부).
- **feature flag**: 상단 상수 `const SKILL_VIDEO_ENABLED = false`(기본 off) 또는 env 기반 — 기본 비활성, 안정화 후 켠다.
- **데스크톱 한정**: `matchMedia('(min-width: 1024px)')` false거나 `prefers-reduced-motion` reduce면 렌더 안 함(null 반환).
- **영상 소스**: `active && heroKey`일 때 `/heroes/{heroKey}` fetch(react-query 또는 단발 fetch, 캐시) → 첫 스킬(가능하면 궁극기 휴리스틱: 마지막 ability 등) `video.link.mp4` 추출. 타입 안전(응답 스키마 최소 인터페이스, `any` 금지).
- **재생**: `<video muted autoplay loop playsInline>` (또는 1회 재생 후 정지), `position:absolute inset-0 -z-...`로 카드 뒤/저알파 오버레이. 낙찰 셀레브레이션 시간과 정합.
- **폴백**: fetch 실패/지연/`onError`/타임아웃 시 아무것도 렌더하지 않음(기존 골드 카드 연출만) — 예외를 조용히 삼키지 말고 `console.warn` 로깅 후 폴백.

### 2. `current-player-card.tsx` 재수정 (최소 침습)
- 낙찰 셀레브레이션(`celebrate==='sold'`) 블록 배경에 `<SkillVideoBackdrop heroKey={lastPlayer?.hero ?? null} active={celebrate==='sold'} />` 1지점 mount.
- 그 외 로직 변경 금지(task-003 결과 보존, mount 라인만 추가).

## 성공 기준
- [ ] (flag on·데스크톱) 낙찰 시 대표 영웅 스킬 영상이 카드 뒤 배경으로 뮤트 재생된다.
- [ ] 영상 로드 실패/지연/에러 시 골드 카드 연출로 조용히 폴백(깨진 영역·에러 UI 없음), 원인은 `console.warn` 로깅.
- [ ] 모바일(<lg) 및 `prefers-reduced-motion`에서 재생하지 않는다.
- [ ] flag off(기본)일 때 아무 변화 없음(P0 연출 무회귀).
- [ ] `current-player-card.tsx` 변경은 mount 1지점으로 최소화. `any` 미사용. `cd frontend && npm run lint && npm run build` 통과.

## 테스트 요구사항
- 단위 테스트: `/heroes/{key}` 응답에서 대표 스킬 video URL 추출 순수 함수(궁극기 휴리스틱·필드 부재 폴백) 경계 테스트.
- 수동 검증: flag on 데스크톱 재생, 실패 URL 강제 시 폴백, 모바일/reduced-motion 미재생, flag off 무변화.

## 제약사항
- 백엔드 무변경(프록시/화이트리스트 변경 금지, 단순 `<video>` 직재생). 신규 npm 패키지 금지.
- P0(001~004) 완료·안정 우선 — 본 태스크로 P0 회귀 발생 시 즉시 제외(생략). `any` 금지, 에러 조용히 삼키지 않기(로깅 후 폴백).
- 오버워치 테마/토큰 유지. 자체 인코딩/캐싱 인프라 구축 금지(원본 CDN 직재생만).
</content>
