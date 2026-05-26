import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { DiscordOAuthService } from './discord-oauth.service';
import { DiscordOAuthGuard } from './discord-oauth.guard';
import { DiscordMemberService } from '../discord-bot/discord-member.service';

// auth.controller.ts의 쿠키 기반 로그인/로그아웃 검증
describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'validateUser' | 'login'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  // Response 객체 mock (cookie / clearCookie)
  const buildResMock = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as unknown as Response;

  const baseUser = () => ({
    id: 'user-uuid-1',
    username: 'testuser',
    role: UserRole.USER,
    clanMembers: [],
  });

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
      login: jest.fn(),
    };
    const mockUsersService = {
      findByIdWithClan: jest.fn(),
    };
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockDiscordOAuth = {
      generateState: jest.fn(() => 'state-xyz'),
      getAuthUrl: jest.fn((s: string) => `https://discord.test/auth?state=${s}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DiscordOAuthService, useValue: mockDiscordOAuth },
        { provide: DiscordMemberService, useValue: {} },
      ],
    })
      .overrideGuard(DiscordOAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== POST /auth/login ====================

  describe('login', () => {
    it('유효한 자격증명이면 쿠키를 설정하고 ok: true를 반환한다', async () => {
      const user = baseUser();
      const token = 'jwt-token-xyz';
      (authService.validateUser as jest.Mock).mockResolvedValue(user);
      (authService.login as jest.Mock).mockResolvedValue({ access_token: token });
      (configService.get as jest.Mock).mockReturnValue('development');

      const res = buildResMock();
      const result = await controller.login(
        { username: 'testuser', password: 'pass123' },
        res,
      );

      // 쿠키 신호 응답 검증 (token은 쿠키로만 전달)
      expect(result).toEqual({ ok: true });

      // 쿠키 설정 검증
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('prod 환경에서는 secure: true로 쿠키를 설정한다', async () => {
      const user = baseUser();
      (authService.validateUser as jest.Mock).mockResolvedValue(user);
      (authService.login as jest.Mock).mockResolvedValue({ access_token: 'tok' });
      (configService.get as jest.Mock).mockReturnValue('production');

      const res = buildResMock();
      await controller.login({ username: 'u', password: 'p' }, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'tok',
        expect.objectContaining({ secure: true }),
      );
    });

    it('dev 환경에서는 secure: false로 쿠키를 설정한다', async () => {
      const user = baseUser();
      (authService.validateUser as jest.Mock).mockResolvedValue(user);
      (authService.login as jest.Mock).mockResolvedValue({ access_token: 'tok' });
      (configService.get as jest.Mock).mockReturnValue('development');

      const res = buildResMock();
      await controller.login({ username: 'u', password: 'p' }, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'tok',
        expect.objectContaining({ secure: false }),
      );
    });

    it('로그인 쿠키의 maxAge가 7일(ms)이다', async () => {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const user = baseUser();
      (authService.validateUser as jest.Mock).mockResolvedValue(user);
      (authService.login as jest.Mock).mockResolvedValue({ access_token: 'tok' });
      (configService.get as jest.Mock).mockReturnValue('development');

      const res = buildResMock();
      await controller.login({ username: 'u', password: 'p' }, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'tok',
        expect.objectContaining({ maxAge: SEVEN_DAYS_MS }),
      );
    });

    it('잘못된 자격증명이면 UnauthorizedException을 던진다', async () => {
      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      const res = buildResMock();
      await expect(
        controller.login({ username: 'bad', password: 'wrong' }, res),
      ).rejects.toThrow(UnauthorizedException);

      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  // ==================== GET /auth/discord ====================

  describe('discordLogin', () => {
    it('state 쿠키를 설정하고 Discord auth URL로 리다이렉트한다', () => {
      (configService.get as jest.Mock).mockReturnValue('development');
      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      controller.discordLogin(res);

      expect(res.cookie).toHaveBeenCalledWith(
        'discord_oauth_state',
        'state-xyz',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 5 * 60 * 1000,
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'https://discord.test/auth?state=state-xyz',
      );
    });
  });

  // ==================== GET /auth/discord/callback ====================

  describe('discordCallback', () => {
    it('Discord 콜백도 자체 로그인과 동일한 7일 maxAge 쿠키를 설정한다', async () => {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const user = baseUser();
      (authService.login as jest.Mock).mockResolvedValue({ access_token: 'd-tok' });
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DISCORD_OAUTH_SUCCESS_REDIRECT') return '/';
        return undefined;
      });

      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.discordCallback(
        { user } as unknown as Parameters<typeof controller.discordCallback>[0],
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'd-tok',
        expect.objectContaining({
          maxAge: SEVEN_DAYS_MS,
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  // ==================== POST /auth/logout ====================

  describe('logout', () => {
    it('access_token 쿠키를 clearCookie로 삭제하고 200 메시지를 반환한다', () => {
      const res = buildResMock();
      const result = controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('여러 번 호출해도 매번 clearCookie를 호출한다', () => {
      const res = buildResMock();
      controller.logout(res);
      controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
});
