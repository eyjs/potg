import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

function cookieExtractor(req: Request): string | null {
  if (req?.cookies) {
    return (req.cookies as Record<string, string>)['access_token'] ?? null;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret || secret.length < 16) {
      throw new Error(
        'JWT_SECRET is required and must be at least 16 chars. See .env.example.',
      );
    }
    super({
      // 쿠키를 우선 추출(기존 회귀 방지)하고, 쿠키가 없으면 Authorization: Bearer
      // 헤더로 폴백한다. 서드파티 쿠키 차단 브라우저에서 로그인 무한 새로고침이
      // 발생하는 문제의 임시 완화책 — 근본 해결(동일 사이트 도메인 통합)은 별도 과제.
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: {
    sub: string;
    username: string;
    role: string;
    clanId?: string;
  }) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      clanId: payload.clanId,
    };
  }
}
