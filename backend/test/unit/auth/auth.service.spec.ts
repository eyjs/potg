import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  UserRole,
  MainRole,
} from '../../../src/modules/users/entities/user.entity';

describe('AuthService - Unit Tests', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    battleTag: 'TestPlayer#1234',
    password: 'hashedPassword',
    role: UserRole.USER,
    mainRole: MainRole.DPS,
    rating: 1000,
    avatarUrl: null,
    bettingFloatingEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByBattleTag: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
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
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersService.findByBattleTag.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const result = await service.validateUser(
        'TestPlayer#1234',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(usersService.findByBattleTag).toHaveBeenCalledWith(
        'TestPlayer#1234',
      );
    });

    it('should return null when user does not exist', async () => {
      mockUsersService.findByBattleTag.mockResolvedValue(null);

      const result = await service.validateUser('NonExistent#0000', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      mockUsersService.findByBattleTag.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      const result = await service.validateUser(
        'TestPlayer#1234',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token', async () => {
      const token = 'jwt-token-12345';
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(mockUser);

      expect(result).toEqual({ access_token: token });
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: mockUser.battleTag,
        sub: mockUser.id,
        role: mockUser.role,
      });
    });
  });

  describe('register', () => {
    it('should create new user with hashed password', async () => {
      const registerDto = {
        battleTag: 'NewPlayer#5678',
        password: 'password123',
        mainRole: MainRole.TANK,
      };

      const hashedPassword = 'hashed-password';
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve(hashedPassword));

      const newUser = { ...mockUser, ...registerDto, password: hashedPassword };
      mockUsersService.create.mockResolvedValue(newUser);

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(result).toEqual(newUser);
    });
  });
});
