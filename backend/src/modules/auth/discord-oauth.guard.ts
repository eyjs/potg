import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { DiscordOAuthService } from './discord-oauth.service';
import { DiscordMemberService } from '../discord-bot/discord-member.service';

export const DISCORD_OAUTH_STATE_COOKIE = 'discord_oauth_state';

function safeStateEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Discord OAuth 콜백 가드.
 *
 * 1) state 쿠키 vs query.state 비교 (CSRF)
 * 2) authorization code 교환
 * 3) Discord 프로필 조회
 * 4) DiscordMemberService.findOrCreate 호출 (봇과 동일 경로)
 * 5) req.user에 User entity 주입
 *
 * 사용한 state 쿠키는 즉시 만료 처리.
 */
@Injectable()
export class DiscordOAuthGuard implements CanActivate {
  private readonly logger = new Logger(DiscordOAuthGuard.name);

  constructor(
    private readonly oauth: DiscordOAuthService,
    private readonly members: DiscordMemberService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const stateQuery =
      typeof req.query.state === 'string' ? req.query.state : null;
    const stateCookie =
      (req.cookies as Record<string, string> | undefined)?.[
        DISCORD_OAUTH_STATE_COOKIE
      ] ?? null;

    if (
      !code ||
      !stateQuery ||
      !stateCookie ||
      !safeStateEqual(stateQuery, stateCookie)
    ) {
      res.clearCookie(DISCORD_OAUTH_STATE_COOKIE, { path: '/' });
      throw new UnauthorizedException('Invalid Discord OAuth state or code');
    }

    res.clearCookie(DISCORD_OAUTH_STATE_COOKIE, { path: '/' });

    const accessToken = await this.oauth.exchangeCode(code);
    const profile = await this.oauth.fetchProfile(accessToken);
    const { user, isNew } = await this.members.findOrCreate({
      discordId: profile.id,
      username: profile.username,
      avatarUrl: this.oauth.buildAvatarUrl(profile),
    });
    if (isNew) {
      this.logger.log(
        `Discord OAuth — new user registered: ${user.id} (discord_id=${profile.id})`,
      );
    }
    (req as Request & { user: typeof user }).user = user;
    return true;
  }
}
