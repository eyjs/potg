import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { User, UserRole } from './entities/user.entity';

// 회계 critical — 잔액 조정(mint/burn) 경로 검증
describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let users: jest.Mocked<
    Pick<UsersService, 'adminList' | 'adminFindOrFail' | 'adminUpdateRole'>
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
    const mockUsers = {
      adminList: jest.fn(),
      adminFindOrFail: jest.fn(),
      adminUpdateRole: jest.fn(),
    };
    const mockLedger = {
      mint: jest.fn(),
      burn: jest.fn(),
      getBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        { provide: UsersService, useValue: mockUsers },
        { provide: LedgerService, useValue: mockLedger },
      ],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    users = module.get(UsersService);
    ledger = module.get(LedgerService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== adjust ====================

  describe('adjust', () => {
    it('delta > 0 이면 LedgerService.mint를 ADMIN_ADJUST reason으로 호출한다', async () => {
      const user = baseUser();
      (users.adminFindOrFail as jest.Mock).mockResolvedValue(user);
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
      (users.adminFindOrFail as jest.Mock).mockResolvedValue(user);
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
      await expect(
        controller.adjust('user-uuid-1', { delta: 1.5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 userId이면 NotFoundException을 던진다', async () => {
      (users.adminFindOrFail as jest.Mock).mockRejectedValue(
        new NotFoundException('Member not found'),
      );

      await expect(
        controller.adjust('non-existent-uuid', { delta: 100 }),
      ).rejects.toThrow(NotFoundException);

      expect(ledger.mint).not.toHaveBeenCalled();
    });

    it('memo 없이도 기본값으로 mint를 호출한다', async () => {
      const user = baseUser();
      (users.adminFindOrFail as jest.Mock).mockResolvedValue(user);
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
      const updated = baseUser({ role: UserRole.ADMIN });
      (users.adminUpdateRole as jest.Mock).mockResolvedValue(updated);

      const result = await controller.updateRole('user-uuid-1', {
        role: UserRole.ADMIN,
      });

      expect(result.role).toBe(UserRole.ADMIN);
      expect(users.adminUpdateRole).toHaveBeenCalledWith(
        'user-uuid-1',
        UserRole.ADMIN,
      );
    });

    it('존재하지 않는 userId이면 NotFoundException을 던진다', async () => {
      (users.adminUpdateRole as jest.Mock).mockRejectedValue(
        new NotFoundException('Member not found'),
      );

      await expect(
        controller.updateRole('non-existent-uuid', { role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== detail ====================

  describe('detail', () => {
    it('존재하는 userId이면 user를 반환한다', async () => {
      const user = baseUser();
      (users.adminFindOrFail as jest.Mock).mockResolvedValue(user);

      const result = await controller.detail('user-uuid-1');

      expect(result).toEqual(user);
    });

    it('존재하지 않는 userId이면 NotFoundException을 던진다', async () => {
      (users.adminFindOrFail as jest.Mock).mockRejectedValue(
        new NotFoundException('Member not found'),
      );

      await expect(controller.detail('no-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
