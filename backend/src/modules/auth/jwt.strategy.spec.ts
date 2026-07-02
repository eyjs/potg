import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtStrategy } from './jwt.strategy';

// passport-jwt Strategy는 jwtFromRequest 추출기를 내부 _jwtFromRequest에 보관한다.
// 쿠키 우선 + Authorization: Bearer 헤더 폴백 동작을 직접 검증하기 위해
// 해당 내부 함수를 타입 단언으로 꺼내 호출한다 (any 미사용).
type StrategyWithExtractor = {
  _jwtFromRequest: (req: Request) => string | null;
};

function buildRequest(options: {
  cookies?: Record<string, string>;
  authorization?: string;
}): Request {
  return {
    cookies: options.cookies,
    headers: options.authorization
      ? { authorization: options.authorization }
      : {},
  } as unknown as Request;
}

describe('JwtStrategy', () => {
  let extractor: (req: Request) => string | null;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('a-very-long-test-secret-value'),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configService);
    extractor = (strategy as unknown as StrategyWithExtractor)
      ._jwtFromRequest;
  });

  it('쿠키에 access_token이 있으면 쿠키 값을 우선 추출한다 (기존 회귀 방지)', () => {
    const req = buildRequest({
      cookies: { access_token: 'cookie-token' },
      authorization: 'Bearer header-token',
    });

    expect(extractor(req)).toBe('cookie-token');
  });

  it('쿠키가 없고 Authorization 헤더가 있으면 Bearer 토큰으로 폴백한다', () => {
    const req = buildRequest({
      authorization: 'Bearer header-token',
    });

    expect(extractor(req)).toBe('header-token');
  });

  it('쿠키도 Authorization 헤더도 없으면 null을 반환한다', () => {
    const req = buildRequest({});

    expect(extractor(req)).toBeNull();
  });
});
