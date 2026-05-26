import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminUsersController } from './admin-users.controller';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { User, UserRole } from './entities/user.entity';

// 회계 critical — 잔액 조정(mint/burn) 경로 검증
describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let userRepo: jest.Mocked<
    Pick<Repository<User>, 'findOne' | 'save' | 'findAndCount'>
  >;
  let ledger: jest.Mocked<Pick<LedgerService, 'mint' | 'burn' | 'getBalance'>>;

  const baseUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-uuid-1',
      username: 'testuser',
      nickname: '테스트유저',
      role: UserRole.USER,
      discordId: '12345678901234567',
      pointsBalance: BigInt(1000),
      marketGatePassed: false,
      createdAt: new Date('2026-01-01'),
      ...overrides,
    }) as unknown as User;

  beforeEach(async () => {
    const mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };
    const mockLedger = {
      mint: jest.fn(),
      burn: jest.fn(),
      getBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: LedgerService, useValue: mockLedger },
      ],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    userRepo = module.get(getRepositoryToken(User));
    ledger = module.get(LedgerService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== adjust ====================

  describe('adjust', () => {
    it('delta > 0 이면 LedgerService.mint를 ADMIN_ADJUST reason으로 호출한다', async () => {
      const user = baseUser();
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (ledger.mint as jest.Mock).mockResolvedValue(undefined);
      (ledger.getBalance as jest.Mock).mockResolvedValue(BigInt(1500));

      const result = await controller.adjust('user-uuid-1', {
        delta: 500,
        memo: '테스트 지급',
      });

      expect(ledger.mint).toHaveBeenCalledWith(
        'user-uuid-1',
        BigInt(500),
        POINT_TX_REASON.ADMIN_ADJUST,
        expect.objectContaining({ memo: '테스트 지급' }),
      );
      expect(ledger.burn).not.toHaveBeenCalled();
      expect(result.delta).toBe(500);
      expect(result.newBalance).toBe('1500');
    });

    it('delta < 0 이면 LedgerService.burn을 ADMIN_ADJUST reason으로 호출한다', async () => {
      const user = baseUser();
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (ledger.burn as jest.Mock).mockResolvedValue(undefined);
      (ledger.getBalance as jest.Mock).mockResolvedValue(BigInt(500));

      const result = await controller.adjust('user-uuid-1', {
        delta: -500,
        memo: '테스트 차감',
      });

      expect(ledger.burn).toHaveBeenCalledWith(
        'user-uuid-1',
        BigInt(500),
        POINT_TX_REASON.ADMIN_ADJUST,
        expect.objectContaining({ memo: '테스트 차감' }),
      );
      expect(ledger.mint).not.toHaveBeenCalled();
      expect(result.delta).toBe(-500);
      expect(result.newBalance).toBe('500');
    });

    it('delta = 0 이면 BadRequestException을 던진다', async () => {
      await expect(
        controller.adjust('user-uuid-1', { delta: 0 }),
      ).rejects.toThrow(BadRequestException);

      expect(ledger.mint).not.toHaveBeenCalled();
      expect(ledger.burn).not.toHaveBeenCalled();
    });

    it('delta가 소수이면 BadRequestException을 던진다', async () => {
      // class-validator @IsInt()는 런타임에서 number가 1.5이면 거부해야 하지만,
      // controller 레이어에서는 서비스 레이어 진입 전에 직접 Number.isInteger 체크가 있음.
      await expect(
        controller.adjust('user-uuid-1', { delta: 1.5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 userId이면 NotFoundException을 던진다', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.adjust('non-existent-uuid', { delta: 100 }),
      ).rejects.toThrow(NotFoundException);

      expect(ledger.mint).not.toHaveBeenCalled();
    });

    it('memo 없이도 기본값으로 mint를 호출한다', async () => {
      const user = baseUser();
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (ledger.mint as jest.Mock).mockResolvedValue(undefined);
      (ledger.getBalance as jest.Mock).mockResolvedValue(BigInt(2000));

      await controller.adjust('user-uuid-1', { delta: 1000 });

      expect(ledger.mint).toHaveBeenCalledWith(
        'user-uuid-1',
        BigInt(1000),
        POINT_TX_REASON.ADMIN_ADJUST,
        expect.objectContaining({ memo: 'admin grant' }),
      );
    });
  });

  // ==================== updateRole ====================

  describe('updateRole', () => {
    it('user의 role을 변경하고 저장한다', async () => {
      const user = baseUser({ role: UserRole.USER });
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (userRepo.save as jest.Mock).mockImplementation((u: User) =>
        Promise.resolve(u),
      );

      const result = await controller.updateRole('user-uuid-1', {
        role: UserRole.ADMIN,
      });

      expect(result.role).toBe(UserRole.ADMIN);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.ADMIN }),
      );
    });

    it('존재하지 않는 userId이면 NotFoundException을 던진다', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.updateRole('non-existent-uuid', { role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== detail ====================

  describe('detail', () => {
    it('존재하는 userId이면 user를 반환한다', async () => {
      const user = baseUser();
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);

      const result = await controller.detail('user-uuid-1');

      expect(result).toEqual(user);
    });

    it('존재하지 않는 userId이면 NotFoundException을 던진다', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.detail('no-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
