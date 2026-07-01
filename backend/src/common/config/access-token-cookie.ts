import type { CookieOptions } from 'express';

/** 인증 JWT를 담는 HttpOnly 쿠키 이름. */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/** 쿠키 수명 7일. JWT 자체 만료(60분)는 슬라이딩 갱신으로 연장된다. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * access_token HttpOnly 쿠키 옵션.
 *
 * 프론트엔드(예: Vercel `*.vercel.app`)와 백엔드(`potg.joonbi.co.kr`)가
 * 서로 다른 도메인(cross-site)이므로, 쿠키가 크로스사이트 fetch에 실리려면
 * `SameSite=None` + `Secure` 여야 한다. (SameSite=None은 Secure가 필수이며,
 * 실제 접속은 HTTPS 프록시를 경유하므로 Secure 쿠키가 정상 저장/전송된다.)
 *
 * 로그인 / 슬라이딩 세션 갱신 인터셉터가 이 함수를 공유해 동일 속성으로 발급한다.
 */
export function buildAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}

/** 로그아웃 시 access_token 쿠키를 지우기 위한 옵션 (발급 시 속성과 일치해야 삭제됨). */
export function clearAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  };
}
