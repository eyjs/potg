import { Strategy } from 'passport-jwt';
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
      jwtFromRequest: cookieExtractor,
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
