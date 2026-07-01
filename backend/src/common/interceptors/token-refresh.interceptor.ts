import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  buildAccessTokenCookieOptions,
} from '../config/access-token-cookie';

interface AuthenticatedUser {
  userId: string;
  username: string;
  role: string;
  clanId?: string;
}

/**
 * 슬라이딩 세션 인터셉터.
 *
 * access_token 쿠키의 수명은 7일이지만 안에 담긴 JWT 자체는 60분에 만료된다.
 * 사용자가 활동하는 동안(= 인증된 요청이 들어올 때마다) 동일 payload로
 * 새 60분 JWT를 발급해 access_token 쿠키를 재설정한다. 이로써 활동 중에는
 * 토큰이 계속 갱신되어 경매 도중 60분 만료로 인한 강제 로그아웃을 방지한다.
 *
 * - 가드를 통과한(= req.user가 존재하는) 인증 요청에만 동작한다.
 * - HttpOnly 쿠키로만 갱신하므로 프론트엔드 변경이 필요 없다.
 * - HTTP 컨텍스트에만 적용한다(웹소켓 제외).
 */
@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = (request as Request & { user?: AuthenticatedUser }).user;

    if (user?.userId && user?.username) {
      // auth.service.login 과 동일한 payload 형태로 재서명 (JwtModule 의 60분 만료 적용)
      const token = this.jwtService.sign({
        username: user.username,
        sub: user.userId,
        role: user.role,
        clanId: user.clanId,
      });
      const isProd =
        this.configService.get<string>('NODE_ENV') === 'production';
      response.cookie(
        ACCESS_TOKEN_COOKIE,
        token,
        buildAccessTokenCookieOptions(isProd),
      );
    }

    return next.handle();
  }
}
