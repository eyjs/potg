import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

export interface WsUser {
  userId: string;
  username: string;
  role: string;
  clanId?: string;
  memberId?: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'dev_secret_key',
      });

      // 소켓에 사용자 정보 저장
      (client as Socket & { user: WsUser }).user = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        clanId: payload.clanId,
        memberId: payload.memberId,
      };

      return true;
    } catch {
      return false;
    }
  }

  private extractToken(client: Socket): string | undefined {
    // 1순위: HttpOnly 쿠키 (브라우저 기반 withCredentials)
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }

    // 2순위: Authorization Bearer (레거시/API 클라이언트 호환)
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 3순위: 쿼리 파라미터
    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    // 4순위: auth 핸드셰이크 데이터
    const authData = client.handshake.auth;
    if (authData?.token) {
      return authData.token;
    }

    return undefined;
  }
}

// 소켓에서 인증된 사용자 정보 가져오기
export const WsAuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): WsUser | undefined => {
    const client = ctx.switchToWs().getClient<Socket & { user: WsUser }>();
    return client.user;
  },
);
