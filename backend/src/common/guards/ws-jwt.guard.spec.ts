import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { authenticateSocket } from './ws-jwt.guard';

/**
 * WsJwtGuard 의 핵심 — 소켓 핸드셰이크 쿠키 인증 헬퍼 단위 테스트.
 *
 * 검증:
 *  - 유효 토큰 → SocketUser 반환 (payload.sub → userId)
 *  - 쿠키 없음 → WsException
 *  - 잘못된 토큰 → WsException
 */
describe('authenticateSocket', () => {
  const SECRET = 'test-secret-at-least-16-chars';

  function makeSocket(cookie?: string, auth?: Record<string, unknown>): Socket {
    return {
      handshake: { headers: cookie ? { cookie } : {}, auth: auth ?? {} },
    } as unknown as Socket;
  }

  function makeJwt(verifyImpl: () => unknown): JwtService {
    return {
      verify: jest.fn(verifyImpl),
    } as unknown as JwtService;
  }

  it('유효한 access_token 쿠키 → SocketUser 반환', () => {
    const jwt = makeJwt(() => ({
      sub: 'user-1',
      username: 'tester',
      role: 'ADMIN',
      clanId: 'clan-1',
    }));
    const client = makeSocket('access_token=valid.jwt.token; other=x');

    const user = authenticateSocket(client, jwt, SECRET);

    expect(user).toEqual({
      userId: 'user-1',
      username: 'tester',
      role: 'ADMIN',
      clanId: 'clan-1',
    });
    expect(jwt.verify).toHaveBeenCalledWith('valid.jwt.token', {
      secret: SECRET,
    });
  });

  it('쿠키 없음 → WsException', () => {
    const jwt = makeJwt(() => ({ sub: 'x' }));
    expect(() => authenticateSocket(makeSocket(), jwt, SECRET)).toThrow(
      WsException,
    );
  });

  it('access_token 쿠키 없음(다른 쿠키만) → WsException', () => {
    const jwt = makeJwt(() => ({ sub: 'x' }));
    expect(() =>
      authenticateSocket(makeSocket('session=abc'), jwt, SECRET),
    ).toThrow(WsException);
  });

  it('잘못된 토큰(verify throw) → WsException', () => {
    const jwt = makeJwt(() => {
      throw new Error('invalid signature');
    });
    expect(() =>
      authenticateSocket(makeSocket('access_token=bad'), jwt, SECRET),
    ).toThrow(WsException);
  });

  it('쿠키 없음 + handshake.auth.token 있음 → 폴백으로 SocketUser 반환 (모바일 쿠키 차단 회귀)', () => {
    const jwt = makeJwt(() => ({
      sub: 'user-2',
      username: 'mobile',
      role: 'USER',
    }));
    const client = makeSocket(undefined, { token: 'fallback.jwt.token' });

    const user = authenticateSocket(client, jwt, SECRET);

    expect(user.userId).toBe('user-2');
    expect(jwt.verify).toHaveBeenCalledWith('fallback.jwt.token', {
      secret: SECRET,
    });
  });

  it('쿠키와 auth.token 둘 다 있으면 쿠키 우선', () => {
    const jwt = makeJwt(() => ({ sub: 'x', username: 'y', role: 'USER' }));
    const client = makeSocket('access_token=cookie.jwt', {
      token: 'auth.jwt',
    });

    authenticateSocket(client, jwt, SECRET);

    expect(jwt.verify).toHaveBeenCalledWith('cookie.jwt', { secret: SECRET });
  });

  it('auth.token 이 문자열이 아니면 무시 → WsException', () => {
    const jwt = makeJwt(() => ({ sub: 'x' }));
    expect(() =>
      authenticateSocket(makeSocket(undefined, { token: 123 }), jwt, SECRET),
    ).toThrow(WsException);
  });
});
