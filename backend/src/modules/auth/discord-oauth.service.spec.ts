import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { DiscordOAuthService } from './discord-oauth.service';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('DiscordOAuthService', () => {
  let service: DiscordOAuthService;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'DISCORD_CLIENT_ID') return 'cid';
        if (key === 'DISCORD_CLIENT_SECRET') return 'csecret';
        if (key === 'DISCORD_OAUTH_REDIRECT_URI')
          return 'https://app/auth/discord/callback';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new DiscordOAuthService(config);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateState', () => {
    it('32자 hex 문자열을 반환하고 매번 달라진다', () => {
      const a = service.generateState();
      const b = service.generateState();
      expect(a).toMatch(/^[0-9a-f]{32}$/);
      expect(a).not.toBe(b);
    });
  });

  describe('getAuthUrl', () => {
    it('필수 OAuth2 파라미터를 포함한 URL을 빌드한다', () => {
      const url = service.getAuthUrl('STATEX');
      expect(url).toContain('https://discord.com/api/oauth2/authorize?');
      expect(url).toContain('client_id=cid');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=identify');
      expect(url).toContain('state=STATEX');
      expect(url).toContain(
        'redirect_uri=https%3A%2F%2Fapp%2Fauth%2Fdiscord%2Fcallback',
      );
    });
  });

  describe('exchangeCode', () => {
    it('성공 시 access_token을 반환한다', async () => {
      axiosMock.post.mockResolvedValueOnce({ data: { access_token: 'tok' } });
      const tok = await service.exchangeCode('CODE');
      expect(tok).toBe('tok');
      expect(axiosMock.post).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.stringContaining('code=CODE'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    });

    it('access_token 없으면 UnauthorizedException', async () => {
      axiosMock.post.mockResolvedValueOnce({ data: {} });
      await expect(service.exchangeCode('CODE')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('네트워크 오류 시 UnauthorizedException으로 래핑', async () => {
      axiosMock.post.mockRejectedValueOnce(new Error('network'));
      await expect(service.exchangeCode('CODE')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('fetchProfile', () => {
    it('Bearer 헤더로 /users/@me 호출 후 프로필 반환', async () => {
      axiosMock.get.mockResolvedValueOnce({
        data: { id: 'd1', username: 'u', avatar: 'avhash' },
      });
      const p = await service.fetchProfile('TOKEN');
      expect(p.id).toBe('d1');
      expect(axiosMock.get).toHaveBeenCalledWith(
        'https://discord.com/api/users/@me',
        { headers: { Authorization: 'Bearer TOKEN' } },
      );
    });

    it('id 누락이면 UnauthorizedException', async () => {
      axiosMock.get.mockResolvedValueOnce({ data: {} });
      await expect(service.fetchProfile('T')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('buildAvatarUrl', () => {
    it('avatar 해시가 있으면 CDN URL 반환', () => {
      const url = service.buildAvatarUrl({
        id: 'd1',
        username: 'u',
        avatar: 'hash',
      });
      expect(url).toBe(
        'https://cdn.discordapp.com/avatars/d1/hash.png?size=256',
      );
    });

    it('avatar 없으면 null', () => {
      expect(
        service.buildAvatarUrl({ id: 'd1', username: 'u', avatar: null }),
      ).toBeNull();
    });
  });
});
