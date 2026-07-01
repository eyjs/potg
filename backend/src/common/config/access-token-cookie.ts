import type { CookieOptions } from 'express';

/** 인증 JWT를 담는 HttpOnly 쿠키 이름. */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/** 쿠키 수명 7일. JWT 자체 만료(60분)는 슬라이딩 갱신으로 연장된다. */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * access_token HttpOnly 쿠키 옵션.
 *
 * 로그인 / Discord OAuth 콜백 / 슬라이딩 세션 갱신 인터셉터가 모두
 * 이 함수를 공유하여 동일한 쿠키 속성으로 발급/재발급한다.
 */
export function buildAccessTokenCookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}
