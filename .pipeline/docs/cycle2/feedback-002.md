# 피드백 002 — 팀장(captain) 화면 모바일 대응 (사용자 직접 피드백)

## 원문
"팀장 화면도 모바일 대응해줘"

## 배경
1차 task-003은 관전자 뷰(auction-ongoing-spectator.tsx)만 모바일 대응함. 역할 분기(auction/page.tsx) 때문에 팀장(captain)은 데스크톱 전용 화면(auction-ongoing-captain.tsx)을 그대로 받아 모바일에서 사용 불가. 금요일(2026-07-03) 경매에서 팀장/감독이 폰으로 입찰할 수 있어야 함.

## 요구 (P0)
auction-ongoing-captain.tsx에 관전자 뷰와 동일한 패턴(hidden lg:grid / lg:hidden 분기, 데스크톱 JSX 무변경)으로 모바일 레이아웃 추가:

- 세로 스택 (위→아래): ① 현재 매물 카드(CurrentPlayerCard) + 타이머 ② **입찰 컨트롤** (현재가, 입찰 버튼/금액 — 팀장의 핵심 기능이므로 엄지 닿는 위치에 크게, 최소 터치 타겟 44px) ③ 채팅(flex-1, 남은 높이)
- 입찰 컨트롤은 sticky 하단 고정도 검토 (채팅 스크롤 중에도 항상 접근 가능)
- 팀 현황/입찰 로그 등 부가 정보는 모바일에서 숨기거나 접기(P1)
- 오버워치 테마/디자인 토큰 유지, 100dvh 기준, 관전자 뷰(1차 task-003)의 스펙 문서(.pipeline/design/screen-specs/mobile-spectator.md → cycle1 보존본) 참고

## 주의 — 파일 충돌
2차 flight-in 태스크가 auction-ongoing-captain.tsx에 LayoutGroup 래핑을 추가할 수 있음. 같은 파일을 두 태스크가 수정하지 않도록:
- flight-in 태스크와 같은 implementor에 배정하거나
- flight-in 머지 후 순차 실행으로 배치할 것 (orchestrator 판단)

## 성공 기준
- 모바일(375~430px)에서 팀장 계정 접속 시 세로 레이아웃 + 입찰 버튼 정상 동작
- 데스크톱 팀장 화면 회귀 없음 (JSX 무변경 래핑)
- lint/build 통과
