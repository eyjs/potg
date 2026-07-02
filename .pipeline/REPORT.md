# 파이프라인 실행 리포트 — POTG 경매 고도화

- **파이프라인 타입**: feature
- **시작**: 2026-07-02T22:56:00+09:00 · **완료**: 2026-07-03T00:15:00+09:00
- **브랜치**: master (머지 완료, **push 안 함** — 사용자 확인 후 직접 push)
- **최종 상태**: SUCCESS — 4개 P0 전부 구현·리뷰·통합 완료

## 1. 스코프 (4개 P0)

| # | 태스크 | 결과 | 주요 변경 파일 |
|---|--------|------|----------------|
| 1 | 입찰/낙찰/유찰 효과음 | 완료 | frontend/src/modules/auction/hooks/use-auction-sound.ts (신규), use-auction-socket.ts (배선 1줄) |
| 2 | 결과 이미지 생성 실패 수정 | 완료 | frontend/src/modules/auction/components/auction-completed.tsx |
| 3 | 모바일 관전자 반응형 뷰 | 완료 | frontend/src/modules/auction/components/auction-ongoing-spectator.tsx |
| 4 | 로그인 무한 새로고침 수정 | 완료 | backend auth/jwt.strategy.ts, auth.controller.ts, auth.service.ts (+specs); frontend lib/api.ts, context/auth-context.tsx, app/login/page.tsx |

## 2. Phase별 진행

| Phase | 상태 | 결과 |
|-------|------|------|
| Planning | done | 4 태스크 분할, 파일 충돌 0 (병렬그룹 A 단일) |
| Plan Review | done | PASS (리트라이 0) |
| Design | done | 모바일 관전자 스펙 (hidden lg:grid / lg:hidden 분기, 기존 토큰 재사용) |
| Implementation | done | 4 태스크 worktree 격리 구현 → master 순차 머지 (충돌 0) |
| Code Review | done | PASS (리트라이 0, 블로커 없음) |
| Integration | done | 아래 검증 결과 |
| Documentation | done | release-note / ADR / changelog / insights |

## 3. 구현 요약

- **효과음**: Web Audio API 오실레이터 합성 방식 채택(mp3 에셋·신규 npm 의존성 없음). 입찰=880Hz square, 낙찰=523→784Hz 상승 sine, 유찰=330→160Hz 하강 sawtooth. 기존 stageEvent.seq + bidEvents 패턴 재구독으로 1회성 재생, 마운트 시 소급 재생 방지, 최초 사용자 제스처(pointerdown/touchstart)로 모바일 autoplay unlock.
- **이미지 생성**: catch 블록 실제 console.error 로깅 추가로 원인 진단 가능화, toPng 전 document.fonts.ready 대기, skipFonts:true로 cross-origin stylesheet cssRules 접근 SecurityError 원천 차단, 실패 시 300ms 후 1회 자동 재시도, 최종 실패 시 명확한 토스트. 백엔드·포스터 템플릿 무변경.
- **모바일 관전자**: 같은 URL에서 lg breakpoint 분기. 데스크톱 12-col 그리드는 hidden lg:grid로 감싸 내부 JSX 무변경(회귀 0), 신규 lg:hidden 블록에 상단=CurrentPlayerCard(shrink-0) + 하단=ChatPanel(flex-1 min-h-0, min-h-[calc(100dvh-10rem)]). 모바일에서 TeamSidebar/BidLog/PlayerStatusGrid 숨김. 오버워치 토큰만 재사용.
- **로그인 루프**: 근본 원인 = 크로스사이트 서드파티 쿠키 차단(신규 브라우저). 백엔드 jwt.strategy가 ExtractJwt.fromExtractors([cookieExtractor, fromAuthHeaderAsBearerToken])로 쿠키 우선 + 헤더 폴백, 로그인 응답 바디에 access_token 포함. 프론트는 토큰을 localStorage 저장 + axios 요청 인터셉터로 Bearer 첨부, auth-context가 fetchUser 실패를 표면화, 로그인 페이지는 실패 시 머무르며 안내 토스트. 기존 쿠키 인증 경로 회귀 없음.

## 4. 검증 결과 (Integration)

- frontend npm run lint: PASS — 0 errors (기존 무관 경고 2건: image-uploader.tsx <img>).
- frontend npm run build: PASS — 전체 라우트 생성 (/auction, /login 포함).
- backend npm run test:unit: PASS — 27 suites / 275 tests. auth 갱신분 포함(jwt.strategy.spec.ts: 쿠키우선/헤더폴백/둘다없음, auth.controller.spec.ts: 응답 바디 토큰 포함).
- merge conflict markers: 없음.

## 5. 커밋 (push 안 됨)

머지: worktree 4개(task-001~004) → master 순차 --no-ff 머지, 충돌 0.
개별 태스크 커밋: feat(auction): 효과음 / fix(auction): 이미지 생성 안정화 / feat(auction): 모바일 관전자 레이아웃 / fix(auth): jwt 이중 추출·토큰 응답 / fix(auth): 프론트 Bearer 폴백·실패 표면화. + chore(pipeline): 계획/태스크/디자인 산출물.

## 6. 남은 이슈 / 후속 과제

- [검증 필요·수동] 실브라우저 육안 검증은 샌드박스에 GUI/DB가 없어 미수행. 사용자 환경 확인 권장:
  1. 데스크톱 입찰→낙찰/유찰 효과음, 모바일 최초 탭 후 재생.
  2. 결과 이미지 반복 다운로드 성공 + skipFonts 적용 후 캡처 폰트 육안 확인(시스템 폰트 대체 시 어색하면 poster fontFamily 폴백 스택 보강 — 후속).
  3. 시크릿 모드 로그인 → 무한 루프 없이 / 진입, 이후 요청에 Authorization: Bearer 첨부 확인.
  4. 모바일 375/390/430px 현황+채팅 표시, 데스크톱 1280px+ 회귀 없음.
- [후속 requirement] 로그인 근본 해결 = 프론트/백엔드 same-site 도메인 통일(Vercel rewrites 등). 이번엔 헤더 폴백(완화책)만 적용. localStorage 토큰의 XSS 노출면은 ADR-001에 기록.
- [e2e] test/integration (Postgres 의존) 미실행 — 로컬 DB 환경에서 npm run test:integration 별도 확인 권장.
- [P1 백로그] 효과음 mute 토글, 모바일 팀현황 탭/바텀시트, 이미지 수동 재시도 버튼.

## 7. push 안내

push는 Vercel 배포를 트리거하므로 수행하지 않았습니다. 위 수동 검증 후 사용자가 직접 `git push origin master` 하십시오.
