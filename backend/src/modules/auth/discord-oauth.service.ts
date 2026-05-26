import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomBytes } from 'crypto';

export interface DiscordProfile {
  id: string;
  username: string;
  avatar?: string | null;
}

const DISCORD_API_BASE = 'https://discord.com/api';
const DISCORD_AUTHORIZE_URL = `${DISCORD_API_BASE}/oauth2/authorize`;
const DISCORD_TOKEN_URL = `${DISCORD_API_BASE}/oauth2/token`;
const DISCORD_USER_URL = `${DISCORD_API_BASE}/users/@me`;

/**
 * Discord OAuth2 클라이언트.
 *
 * passport-discord(deprecated)를 대체한다. scope='identify' 단일.
 * state 파라미터는 CSRF 방지용으로 컨트롤러가 짧은 쿠키에 저장 후 콜백에서 비교.
 */
@Injectable()
export class DiscordOAuthService {
  constructor(private readonly config: ConfigService) {}

  generateState(): string {
    return randomBytes(16).toString('hex');
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'identify',
      state,
      prompt: 'none',
    });
    return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });
    try {
      const res = await axios.post<{ access_token: string }>(
        DISCORD_TOKEN_URL,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      if (!res.data?.access_token) {
        throw new UnauthorizedException('Discord token response missing access_token');
      }
      return res.data.access_token;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Discord OAuth code exchange failed');
    }
  }

  async fetchProfile(accessToken: string): Promise<DiscordProfile> {
    try {
      const res = await axios.get<DiscordProfile>(DISCORD_USER_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.data?.id) {
        throw new UnauthorizedException('Discord profile response missing id');
      }
      return res.data;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Discord profile fetch failed');
    }
  }

  buildAvatarUrl(profile: DiscordProfile): string | null {
    return profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
      : null;
  }

  private get clientId(): string {
    return this.config.get<string>('DISCORD_CLIENT_ID') ?? 'dev_client_id';
  }

  private get clientSecret(): string {
    return (
      this.config.get<string>('DISCORD_CLIENT_SECRET') ?? 'dev_client_secret'
    );
  }

  private get redirectUri(): string {
    return (
      this.config.get<string>('DISCORD_OAUTH_REDIRECT_URI') ??
      'http://localhost:3000/auth/discord/callback'
    );
  }
}
