import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { DiscordMemberService } from '../discord-bot/discord-member.service';
import type { User } from '../users/entities/user.entity';

/**
 * Discord OAuth2 strategy.
 *
 * DISCORD_OAUTH_ENABLED !== 'true' 시 등록은 되되 실 호출 시 ConfigService 빈 값으로
 * 401이 떨어진다 (passport-discord 내부에서 client_id 검증).
 *
 * validate() 콜백은 봇 자동 가입과 동일한 DiscordMemberService.findOrCreate를 호출하여
 * 양방향(봇/웹) 멱등성을 보장한다.
 */
@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  private readonly logger = new Logger(DiscordStrategy.name);

  constructor(
    config: ConfigService,
    private readonly members: DiscordMemberService,
  ) {
    super({
      clientID: config.get<string>('DISCORD_CLIENT_ID') ?? 'dev_client_id',
      clientSecret:
        config.get<string>('DISCORD_CLIENT_SECRET') ?? 'dev_client_secret',
      callbackURL:
        config.get<string>('DISCORD_OAUTH_REDIRECT_URI') ??
        'http://localhost:3000/auth/discord/callback',
      scope: ['identify'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      username: string;
      avatar?: string | null;
    },
  ): Promise<User> {
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
      : null;
    const { user, isNew } = await this.members.findOrCreate({
      discordId: profile.id,
      username: profile.username,
      avatarUrl,
    });
    if (isNew) {
      this.logger.log(
        `Discord OAuth — new user registered: ${user.id} (discord_id=${profile.id})`,
      );
    }
    return user;
  }
}
