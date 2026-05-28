import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  __esModule: true,
  compare: jest.fn(),
  hash: jest.fn(),
}));
import {
  UserRole,
  MainRole,
} from '../../../src/modules/users/entities/user.entity';

describe('AuthService - Unit Tests', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    username: 'TestPlayer',
    nickname: 'TestPlayer',
    battleTag: 'TestPlayer#1234',
    password: 'hashedPassword',
    role: UserRole.USER,
    mainRole: MainRole.DPS,
    rating: 1000,
    avatarUrl: null as string | null,
    bettingFloatingEnabled: false,
    pointsBalance: '0',
    marketGatePassed: false,
    clanMembers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByBattleTag: jest.fn(),
    findByUsername: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('자격증명이 유효하면 password 없는 user 객체를 반환해야 함', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('TestPlayer', 'password123');

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('password');
      expect(usersService.findByUsername).toHaveBeenCalledWith('TestPlayer');
    });

    it('유저가 존재하지 않으면 null을 반환해야 함', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      const result = await service.validateUser('NonExistent', 'password');

      expect(result).toBeNull();
    });

    it('비밀번호가 틀리면 null을 반환해야 함', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('TestPlayer', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('유저에 password 필드가 없으면 null을 반환해야 함', async () => {
      const userWithoutPassword = { ...mockUser, password: undefined };
      mockUsersService.findByUsername.mockResolvedValue(userWithoutPassword);

      const result = await service.validateUser('TestPlayer', 'password123');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('access_token을 반환해야 함', async () => {
      const token = 'jwt-token-12345';
      mockJwtService.signAsync.mockResolvedValue(token);

      const { password: _p, ...userWithoutPw } = mockUser;
      const result = await service.login(userWithoutPw);

      expect(result).toEqual({ access_token: token });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        username: mockUser.username,
        sub: mockUser.id,
        role: mockUser.role,
        clanId: undefined,
      });
    });

    it('clanMembers가 있으면 clanId를 payload에 포함해야 함', async () => {
      const token = 'jwt-token-abc';
      mockJwtService.signAsync.mockResolvedValue(token);

      const userWithClan = {
        ...mockUser,
        clanMembers: [
          {
            clanId: 'clan-1',
          } as unknown as (typeof mockUser.clanMembers)[number],
        ],
      };
      const { password: _p, ...userWithClanWithoutPw } = userWithClan;
      await service.login(userWithClanWithoutPw);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ clanId: 'clan-1' }),
      );
    });
  });
});
