# Task 002: 결과 이미지 생성 실패 진단 및 수정 (handleDownload / html-to-image)

## 메타데이터
- 우선순위: P0
- 복잡도: M
- 병렬그룹: A
- 의존: 없음
- 변경 파일 (충돌 방지용):
  - 수정: `frontend/src/modules/auction/components/auction-completed.tsx` (`handleDownload`, 라인 ~64-88)
  - 선택 수정: `frontend/src/modules/auction/components/parts/auction-result-poster.tsx` (폰트 임베딩 스킵 시 인라인 `fontFamily` 폴백 보강이 필요할 경우에만)
  - 백엔드는 원칙적으로 건드리지 않음. (진단 결과 프록시 타임아웃 등 백엔드 원인이 **확정**된 경우에 한해 `backend/src/modules/auctions/auctions.controller.ts`의 `imageProxy`만 최소 수정 허용 — 이 경우 파일 충돌 없음(다른 태스크 미접근)이나 백엔드 테스트 갱신 필요)
- 이 태스크 외 파일 수정 금지.

## 목적
경매 결과 포스터의 PNG 다운로드가 "자꾸 실패"하는 문제를, (1) 실패 원인을 콘솔로 진단 가능하게 만들고 (2) 알려진 원인들(cross-origin stylesheet 접근, 폰트 로딩 타이밍, 일시적 네트워크)을 선제 차단하며 (3) 실패 시 사용자에게 명확히 안내하는 방식으로 해결한다.

## 배경 (조사 완료 — requirement.md P0-2)
현재 `handleDownload` (auction-completed.tsx):
```
const dataUrl = await toPng(posterRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#0b0b0b' })
...
} catch (error) { handleApiError(error, '이미지 생성 실패') }  // ← 실제 error 객체를 로깅하지 않음
```
- 문제 1: catch가 `console.error(error)` 없이 fallback 메시지만 토스트 → 원인 특정 불가 (이것이 1차 수정 대상).
- 원인 가설(확신도 순): ① 진단 정보 부재, ② html-to-image의 cross-origin `<link rel=stylesheet>` `cssRules` 접근 SecurityError(확장 프로그램 주입 스타일 등으로 간헐 실패), ③ 다수 원격 이미지(프록시 경유) 로딩 지연/미완료 상태 캡처, ④ `document.fonts.ready` 미대기로 Exo 2 웹폰트 미준비, ⑤ pixelRatio 2 canvas 크기 제한.
- 포스터(`auction-result-poster.tsx`)는 인라인 스타일 + 컬러 토큰 직접 지정으로 되어 있고 `fontFamily: 'var(--font-exo2), sans-serif'`만 CSS 변수를 참조한다. 원격 이미지는 `<img crossOrigin="anonymous">`로 백엔드 `image-proxy` 경유(ACAO `*` 확인됨, 설계 결함 가능성 낮음).

## 구현 가이드 (2단계 접근 — requirement.md 특이사항 반영)
1. **1차: 진단 가능화 (필수)**
   - catch 블록에 실제 에러 로깅 추가: `console.error('[AuctionResultPoster] image generation failed', error)`. 그런 다음 사용자 토스트는 유지(`handleApiError` 또는 명확한 실패 메시지).
2. **폰트 준비 대기**
   - `toPng` 호출 전 `await document.fonts.ready` 추가 (Exo 2 로드 완료 후 캡처).
3. **cross-origin stylesheet 에러 차단**
   - `toPng` 옵션에 `skipFonts: true` 또는 `fontEmbedCSS: ''` 적용을 검토·적용해 html-to-image가 `document.styleSheets`를 순회하며 cross-origin `cssRules`에 접근하다 SecurityError로 전체 캡처가 실패하는 경로를 원천 차단.
   - **트레이드오프 확인**: 폰트 임베딩을 스킵하면 캡처 이미지의 폰트가 시스템 기본으로 대체될 수 있다. 포스터는 인라인 스타일 기반이라 시각 차이가 크지 않을 것으로 예상되나, 실제 캡처 결과를 확인하고 폰트가 어색하면 `auction-result-poster.tsx`의 `fontFamily`에 무난한 폴백 스택(예: `'Exo 2', system-ui, sans-serif` 형태로 시스템 폰트 우선순위 조정)을 보강. 시각 열화가 크면 skipFonts 대신 `document.fonts.ready`만으로 처리하고 옵션 판단을 재검토.
4. **1회 자동 재시도**
   - 캡처 실패 시 짧은 지연(예: 250~500ms) 후 1회 자동 재시도. 재시도까지 실패하면 그때 사용자에게 명확한 에러 토스트 표시. 재시도 로직은 `isDownloading` 상태 관리와 충돌하지 않게 구성.
5. **실패 UX**
   - 최종 실패 시 "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." 등 명확한 토스트. (P1의 수동 재시도 버튼은 이번 스코프 아님 — 자동 재시도까지만.)
6. **백엔드는 기본적으로 미접근.** 위 조치 후에도 로깅된 실제 에러가 프록시 타임아웃/이미지 미로드를 명확히 가리키는 경우에 한해 `auctions.controller.ts` `imageProxy`의 타임아웃 등 최소 조정 허용(그 외 백엔드 변경 금지). 이 경우 백엔드 테스트도 함께 갱신.

## 제약사항 (requirement.md + CLAUDE.md)
- `any` 타입 사용 금지.
- Tailwind CSS만 사용, 별도 CSS 파일 생성 금지.
- `frontend/src/components/ui/*`, `frontend/src/lib/utils.ts` 수정 금지.
- 신규 npm 라이브러리 도입 금지 (기존 `html-to-image`만 사용).
- 결과 이미지 **템플릿 디자인(레이아웃/컬러) 변경 금지** — 생성 안정성만 수정. 포스터 수정은 폰트 폴백 보강 등 최소한으로.
- 오버워치 테마 유지.
- `backend/src/modules/*/*.entity.ts` 수정 금지.

## 성공 기준
- [ ] 실패 시 실제 에러 객체가 `console.error`로 로깅되어 원인 진단이 가능하다.
- [ ] `toPng` 전 `document.fonts.ready`를 await 한다.
- [ ] cross-origin stylesheet 접근 에러가 캡처 실패로 이어지지 않도록 옵션(`skipFonts`/`fontEmbedCSS`)이 적용되었거나, 적용하지 않기로 한 근거가 핸드오프에 기록되어 있다.
- [ ] 일시적 실패 시 1회 자동 재시도가 동작한다.
- [ ] 정상 케이스(팀 2~4개, 멤버 다수, 미낙찰 포함)에서 반복 다운로드가 일관되게 성공한다.
- [ ] 최종 실패 시 사용자에게 명확한 에러 토스트가 표시된다.
- [ ] 폰트 스킵 채택 시 캡처 이미지의 폰트가 시각적으로 수용 가능하다(핸드오프에 캡처 확인 결과 기록).
- [ ] `cd frontend && npm run lint && npm run build` 통과.

## 테스트 요구사항
- 단위 테스트: html-to-image/canvas 의존이라 자동 단위 테스트는 필수 아님. 대신 수동 검증 시나리오를 핸드오프에 기록: (1) 팀 2·3·4개 각각 반복 다운로드 성공, (2) 실패 유도(네트워크 스로틀) 시 자동 재시도 + 실패 토스트 확인, (3) 콘솔에 원인 로그가 남는지 확인, (4) 캡처 이미지의 폰트/레이아웃 육안 확인.
- 백엔드를 수정한 경우: `imageProxy` 관련 유닛/통합 테스트 갱신 (`cd backend && npm test`).
