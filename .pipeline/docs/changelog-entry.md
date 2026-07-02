## [Unreleased] - 2026-07-02

### Added
- 경매 입찰 / 낙찰 / 유찰 효과음 추가 (`use-auction-sound.ts`, Web Audio API 오실레이터 합성, 신규 오디오 에셋/npm 의존성 없음). 모바일 autoplay 정책 대응 unlock 처리 포함.
- 모바일 관전자 전용 반응형 레이아웃 추가 (`auction-ongoing-spectator.tsx`). `lg` 미만에서 현재 매물 현황 + 채팅만 노출하는 세로 시청 스타일 화면. 데스크톱 레이아웃은 `hidden lg:grid`로 격리되어 회귀 없음.
- 로그인 시 Authorization Bearer 헤더 인증 폴백 추가 (`jwt.strategy.ts`, `api.ts`). 쿠키 인증을 우선 사용하고, 쿠키가 차단된 환경(서드파티 쿠키 차단)에서 자동 대체.

### Fixed
- 경매 결과 이미지(PNG) 다운로드 실패 문제 수정 (`auction-completed.tsx`): 에러 로깅 추가, `document.fonts.ready` 대기, `skipFonts: true`로 크로스 오리진 스타일시트 SecurityError 차단, 1회 자동 재시도, 실패 시 명확한 안내 토스트.
- 신규 브라우저/시크릿 모드/신규 IP에서 발생하던 로그인 무한 새로고침(리다이렉트 루프) 수정. 로그인 응답 바디에 `access_token` 포함, `fetchUser` 실패 표면화로 무한 루프 대신 명확한 안내 후 로그인 페이지 잔류. 기존 쿠키 인증/소켓 인증 회귀 없음.
