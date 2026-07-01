import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { TokenRefreshInterceptor } from './token-refresh.interceptor';
import { ACCESS_TOKEN_COOKIE } from '../config/access-token-cookie';

/**
 * TokenRefreshInterceptor — 슬라이딩 세션 쿠키 재발급 단위 테스트.
 *
 * 검증:
 *  - 인증된 HTTP 요청(req.user 존재) → 새 토큰으로 access_token 쿠키 재발급
 *  - 비인증 요청(req.user 없음) → 쿠키 미발급
 *  - 비 HTTP 컨텍스트(웹소켓 등) → 쿠키 미발급, 핸들러는 통과
 *  - NODE_ENV=production → secure 쿠키
 */
describe('TokenRefreshInterceptor', () => {
  const NEW_TOKEN = 'signed.jwt.token';

  function makeJwt(): JwtService {
    return { sign: jest.fn(() => NEW_TOKEN) } as unknown as JwtService;
  }

  function makeConfig(nodeEnv?: string): ConfigService {
    return {
      get: jest.fn((key: string) =>
        key === 'NODE_ENV' ? nodeEnv : undefined,
      ),
    } as unknown as ConfigService;
  }

  function makeContext(
    type: 'http' | 'ws',
    user?: unknown,
  ): { context: ExecutionContext; cookie: jest.Mock } {
    const cookie = jest.fn();
    const request = { user };
    const response = { cookie };
    const context = {
      getType: () => type,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    return { context, cookie };
  }

  const next: CallHandler = { handle: () => of('ok') };

  it('인증된 HTTP 요청 → access_token 쿠키 재발급', () => {
    const jwt = makeJwt();
    const interceptor = new TokenRefreshInterceptor(jwt, makeConfig());
    const { context, cookie } = makeContext('http', {
      userId: 'user-1',
      username: 'admin',
      role: 'ADMIN',
      clanId: 'clan-1',
    });

    interceptor.intercept(context, next);

    expect(jwt.sign).toHaveBeenCalledWith({
      username: 'admin',
      sub: 'user-1',
      role: 'ADMIN',
      clanId: 'clan-1',
    });
    expect(cookie).toHaveBeenCalledTimes(1);
    const [name, token, options] = cookie.mock.calls[0] as [
      string,
      string,
      { httpOnly: boolean; secure: boolean },
    ];
    expect(name).toBe(ACCESS_TOKEN_COOKIE);
    expect(token).toBe(NEW_TOKEN);
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false); // NODE_ENV 미설정 → dev
  });

  it('비인증 요청(req.user 없음) → 쿠키 미발급', () => {
    const jwt = makeJwt();
    const interceptor = new TokenRefreshInterceptor(jwt, makeConfig());
    const { context, cookie } = makeContext('http', undefined);

    interceptor.intercept(context, next);

    expect(jwt.sign).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });

  it('비 HTTP 컨텍스트 → 쿠키 미발급', () => {
    const jwt = makeJwt();
    const interceptor = new TokenRefreshInterceptor(jwt, makeConfig());
    const { context, cookie } = makeContext('ws', {
      userId: 'user-1',
      username: 'admin',
      role: 'ADMIN',
    });

    interceptor.intercept(context, next);

    expect(cookie).not.toHaveBeenCalled();
  });

  it('NODE_ENV=production → secure 쿠키', () => {
    const jwt = makeJwt();
    const interceptor = new TokenRefreshInterceptor(
      jwt,
      makeConfig('production'),
    );
    const { context, cookie } = makeContext('http', {
      userId: 'u',
      username: 'a',
      role: 'ADMIN',
    });

    interceptor.intercept(context, next);

    const [, , options] = cookie.mock.calls[0] as [
      string,
      string,
      { secure: boolean },
    ];
    expect(options.secure).toBe(true);
  });
});
