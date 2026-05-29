import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * 소켓 핸드셰이크 쿠키에서 추출한 인증 사용자.
 * HTTP JwtStrategy.validate() 의 반환 형상과 동일하게 맞춘다.
 */
export interface SocketUser {
  userId: string;
  username: string;
  role: string;
  clanId?: string;
}

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  clanId?: string;
}

const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * `cookie` 헤더 문자열을 key/value 맵으로 파싱한다.
 * (HTTP 의 cookieParser 는 미들웨어라 소켓 핸드셰이크에는 적용되지 않으므로 직접 파싱)
 */
function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) {
    return out;
  }
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) {
      out[name] = decodeURIComponent(value);
    }
  }
  return out;
}

/**
 * 소켓 핸드셰이크의 HttpOnly `access_token` 쿠키를 검증하고 사용자 정보를 반환한다.
 * 실패 시 throw — 호출부(connection 핸들러)에서 disconnect 처리.
 */
export function authenticateSocket(
  client: Socket,
  jwtService: JwtService,
  secret: string,
): SocketUser {
  const cookies = parseCookieHeader(client.handshake.headers.cookie);
  const token = cookies[ACCESS_TOKEN_COOKIE];
  if (!token) {
    throw new WsException('인증 토큰이 없습니다.');
  }

  let payload: JwtPayload;
  try {
    payload = jwtService.verify<JwtPayload>(token, { secret });
  } catch {
    throw new WsException('유효하지 않은 토큰입니다.');
  }

  return {
    userId: payload.sub,
    username: payload.username,
    role: payload.role,
    clanId: payload.clanId,
  };
}

/**
 * 메시지 핸들러 레벨 방어선.
 * connection 시점 인증이 1차이며, 이 가드는 client.data.user 존재를 강제한다.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const data = client.data as { user?: SocketUser };
    if (data.user?.userId) {
      return true;
    }

    // connection 시점 인증이 누락된 경우(재연결 등) 핸드셰이크로 재검증
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new WsException('서버 인증 설정 오류');
      }
      data.user = authenticateSocket(client, this.jwtService, secret);
      return true;
    } catch (e) {
      this.logger.warn(
        `WS auth rejected for ${client.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e instanceof WsException ? e : new WsException('인증 실패');
    }
  }
}
