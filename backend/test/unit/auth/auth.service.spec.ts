import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../../src/modules/auth/email.service';
import { PasswordReset } from '../../../src/modules/auth/entities/password-reset.entity';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

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
    battleTag: 'TestPlayer#1234',
    password: 'hashedPassword',
    role: UserRole.USER,
    mainRole: MainRole.DPS,
    rating: 1000,
    avatarUrl: null as string | null,
    bettingFloatingEnabled: false,
    clanMembers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByBattleTag: jest.fn(),
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const mockPasswordResetRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: mockPasswordResetRepo,
        },
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
      // password 필드가 없어야 함
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

      // password 없는 user 객체 사용
      const { password: _p, ...userWithoutPw } = mockUser;
      const result = await service.login(userWithoutPw);

      expect(result).toEqual({ access_token: token });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        username: mockUser.username,
        sub: mockUser.id,
        role: mockUser.role,
        clanId: undefined, // clanMembers가 비어 있으면 undefined
      });
    });

    it('clanMembers가 있으면 clanId를 payload에 포함해야 함', async () => {
      const token = 'jwt-token-abc';
      mockJwtService.signAsync.mockResolvedValue(token);

      const userWithClan = {
        ...mockUser,
        clanMembers: [{ clanId: 'clan-1' }],
      };
      const { password: _p, ...userWithClanWithoutPw } = userWithClan;
      await service.login(userWithClanWithoutPw);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ clanId: 'clan-1' }),
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      username: 'NewPlayer',
      battleTag: 'NewPlayer#5678',
      password: 'password123',
      mainRole: MainRole.TANK,
    };

    it('비밀번호를 해시하여 새 유저를 생성해야 함', async () => {
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.findByBattleTag.mockResolvedValue(null);

      const newUser = {
        ...mockUser,
        username: registerDto.username,
        battleTag: registerDto.battleTag,
        password: hashedPassword,
      };
      mockUsersService.create.mockResolvedValue(newUser);

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      // password 필드가 결과에 없어야 함
      expect(result).not.toHaveProperty('password');
    });

    it('username이 없으면 BadRequestException을 던져야 함', async () => {
      await expect(
        service.register({ battleTag: 'Test#1234', password: 'pw' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('password가 없으면 BadRequestException을 던져야 함', async () => {
      await expect(
        service.register({ username: 'TestUser', battleTag: 'Test#1234' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('battleTag가 없으면 BadRequestException을 던져야 함', async () => {
      await expect(
        service.register({ username: 'TestUser', password: 'pw' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('이미 존재하는 username이면 BadRequestException을 던져야 함', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('이미 존재하는 battleTag면 BadRequestException을 던져야 함', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockUsersService.findByBattleTag.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('유저가 없어도 성공 메시지를 반환해야 함 (이메일 열거 방지)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('unknown@example.com');

      expect(result).toEqual({ message: '이메일이 전송되었습니다.' });
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('유저가 있으면 리셋 토큰을 생성하고 이메일을 발송해야 함', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetRepo.update.mockResolvedValue({ affected: 0 });
      mockPasswordResetRepo.create.mockReturnValue({ token: 'reset-token' });
      mockPasswordResetRepo.save.mockResolvedValue({});
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      expect(result).toEqual({ message: '이메일이 전송되었습니다.' });
      expect(mockPasswordResetRepo.create).toHaveBeenCalled();
      expect(mockPasswordResetRepo.save).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('이메일 전송 실패 시에도 성공 메시지를 반환해야 함', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetRepo.update.mockResolvedValue({ affected: 0 });
      mockPasswordResetRepo.create.mockReturnValue({ token: 'reset-token' });
      mockPasswordResetRepo.save.mockResolvedValue({});
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      // 이메일 전송 실패해도 예외가 전파되면 안 됨
      const result = await service.forgotPassword('test@example.com');

      expect(result).toEqual({ message: '이메일이 전송되었습니다.' });
    });
  });

  describe('resetPassword', () => {
    const mockReset = {
      userId: 'user-1',
      token: 'valid-token',
      used: false,
      expiresAt: new Date(Date.now() + 3600000),
    };

    it('유효한 토큰으로 비밀번호를 변경해야 함', async () => {
      mockPasswordResetRepo.findOne.mockResolvedValue(mockReset);
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockPasswordResetRepo.save.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-pw');

      const result = await service.resetPassword('valid-token', 'newPassword');

      expect(result).toEqual({ message: '비밀번호가 성공적으로 변경되었습니다.' });
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'new-hashed-pw',
      );
      // 토큰이 사용됨으로 표시되어야 함
      expect(mockReset.used).toBe(true);
    });

    it('유효하지 않은 토큰이면 BadRequestException을 던져야 함', async () => {
      mockPasswordResetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyResetToken', () => {
    it('유효한 토큰이면 { valid: true }를 반환해야 함', async () => {
      mockPasswordResetRepo.findOne.mockResolvedValue({ token: 'token' });

      const result = await service.verifyResetToken('valid-token');

      expect(result).toEqual({ valid: true });
    });

    it('유효하지 않은 토큰이면 { valid: false }를 반환해야 함', async () => {
      mockPasswordResetRepo.findOne.mockResolvedValue(null);

      const result = await service.verifyResetToken('invalid-token');

      expect(result).toEqual({ valid: false });
    });
  });
});
