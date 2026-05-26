import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ClansService } from './clans.service';
import { Clan } from './entities/clan.entity';
import { ClanMember, ClanRole } from './entities/clan-member.entity';
import {
  ClanJoinRequest,
  RequestStatus,
} from './entities/clan-join-request.entity';
import { Announcement } from './entities/announcement.entity';
import { HallOfFame } from './entities/hall-of-fame.entity';
import { PointTx } from '../ledger/entities/point-tx.entity';

/**
 * ClansService 핵심 권한/상태 변경 로직 단위 테스트.
 *
 * 커버: create (트랜잭션), updateClan, updateMemberRole, transferMaster,
 *      kickMember (master/manager 권한 분기), approveRequest.
 *
 * 회귀 안전망: 641줄 service 리팩토링 전 권한 매트릭스 보존.
 */
describe('ClansService', () => {
  let service: ClansService;
  let clansRepo: jest.Mocked<
    Pick<Repository<Clan>, 'findOne' | 'find' | 'save' | 'create'>
  >;
  let membersRepo: jest.Mocked<
    Pick<
      Repository<ClanMember>,
      'findOne' | 'find' | 'save' | 'create' | 'remove'
    >
  >;
  let requestsRepo: jest.Mocked<
    Pick<Repository<ClanJoinRequest>, 'findOne' | 'save'>
  >;
  let manager: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'find' | 'save' | 'create'>
  >;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<typeof manager>;

    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    };

    const stubRepo = () => ({
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    });

    const mockClansRepo = stubRepo();
    const mockMembersRepo = stubRepo();
    const mockRequestsRepo = stubRepo();
    const mockAnnouncementsRepo = stubRepo();
    const mockHallOfFameRepo = stubRepo();
    const mockPointTxRepo = stubRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClansService,
        { provide: getRepositoryToken(Clan), useValue: mockClansRepo },
        {
          provide: getRepositoryToken(ClanMember),
          useValue: mockMembersRepo,
        },
        {
          provide: getRepositoryToken(ClanJoinRequest),
          useValue: mockRequestsRepo,
        },
        {
          provide: getRepositoryToken(Announcement),
          useValue: mockAnnouncementsRepo,
        },
        {
          provide: getRepositoryToken(HallOfFame),
          useValue: mockHallOfFameRepo,
        },
        { provide: getRepositoryToken(PointTx), useValue: mockPointTxRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ClansService);
    clansRepo = module.get(getRepositoryToken(Clan));
    membersRepo = module.get(getRepositoryToken(ClanMember));
    requestsRepo = module.get(getRepositoryToken(ClanJoinRequest));
  });

  afterEach(() => jest.clearAllMocks());

  const member = (
    role: ClanRole,
    overrides: Partial<ClanMember> = {},
  ): ClanMember =>
    ({
      id: `cm-${role}`,
      clanId: 'clan-1',
      userId: 'user-' + role.toLowerCase(),
      role,
      ...overrides,
    }) as unknown as ClanMember;

  // ==================== create ====================

  describe('create', () => {
    it('이름/태그 중복 없으면 Clan + MASTER ClanMember를 함께 생성', async () => {
      const dto = { name: '테스트클랜', tag: 'TST' };
      const saved = { id: 'clan-1', ...dto } as unknown as Clan;

      (manager.findOne as jest.Mock).mockResolvedValue(null);
      (manager.create as jest.Mock)
        .mockReturnValueOnce(saved) // Clan
        .mockReturnValueOnce({
          clanId: 'clan-1',
          userId: 'user-1',
          role: ClanRole.MASTER,
        }); // member
      (manager.save as jest.Mock)
        .mockResolvedValueOnce(saved)
        .mockResolvedValueOnce({ role: ClanRole.MASTER });

      const result = await service.create(dto, 'user-1');

      expect(result).toBe(saved);
      expect(manager.create).toHaveBeenCalledWith(
        ClanMember,
        expect.objectContaining({
          clanId: 'clan-1',
          userId: 'user-1',
          role: ClanRole.MASTER,
        }),
      );
    });

    it('이름 또는 태그 중복 시 BadRequestException', async () => {
      (manager.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ name: 'dup', tag: 'X' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== updateClan ====================

  describe('updateClan', () => {
    it('MASTER가 아니면 ForbiddenException', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValue(
        member(ClanRole.MEMBER),
      );

      await expect(
        service.updateClan('clan-1', { name: 'x' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('clan 미존재 시 BadRequestException', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValue(
        member(ClanRole.MASTER),
      );
      (clansRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateClan('clan-1', { name: 'x' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('새 이름이 다른 clan에서 사용 중이면 거부', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValue(
        member(ClanRole.MASTER),
      );
      (clansRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 'clan-1', name: 'old' } as Clan)
        .mockResolvedValueOnce({ id: 'other-clan', name: 'dup' } as Clan);

      await expect(
        service.updateClan('clan-1', { name: 'dup' }, 'user-1'),
      ).rejects.toThrow('이미 사용 중');
    });

    it('자기 자신의 clan에 같은 이름 재설정은 허용', async () => {
      const clan = { id: 'clan-1', name: 'sameName' } as unknown as Clan;
      (membersRepo.findOne as jest.Mock).mockResolvedValue(
        member(ClanRole.MASTER),
      );
      (clansRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(clan)
        .mockResolvedValueOnce(clan); // 같은 id
      (clansRepo.save as jest.Mock).mockImplementation((c) =>
        Promise.resolve(c),
      );

      await service.updateClan(
        'clan-1',
        { name: 'sameName', description: '바뀐 설명' },
        'user-1',
      );

      expect(clan.description).toBe('바뀐 설명');
    });
  });

  // ==================== updateMemberRole ====================

  describe('updateMemberRole', () => {
    it('MASTER만 역할 변경 가능', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValueOnce(
        member(ClanRole.MANAGER),
      );

      await expect(
        service.updateMemberRole(
          'clan-1',
          'target-1',
          ClanRole.MANAGER,
          'requester-1',
        ),
      ).rejects.toThrow('Only clan master');
    });

    it('대상 멤버 없으면 거부', async () => {
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole(
          'clan-1',
          'target-1',
          ClanRole.MANAGER,
          'requester-1',
        ),
      ).rejects.toThrow('Target user');
    });

    it('newRole=MASTER는 transferMaster로 안내', async () => {
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(member(ClanRole.MEMBER));

      await expect(
        service.updateMemberRole(
          'clan-1',
          'target-1',
          ClanRole.MASTER,
          'requester-1',
        ),
      ).rejects.toThrow('transferMaster');
    });

    it('자신의 역할은 변경 불가', async () => {
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(member(ClanRole.MASTER));

      await expect(
        service.updateMemberRole(
          'clan-1',
          'requester-1',
          ClanRole.MANAGER,
          'requester-1',
        ),
      ).rejects.toThrow('your own role');
    });

    it('정상: MEMBER → MANAGER 승격', async () => {
      const target = member(ClanRole.MEMBER, { userId: 'target-1' });
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(target);
      (membersRepo.save as jest.Mock).mockImplementation((m) =>
        Promise.resolve(m),
      );

      const result = (await service.updateMemberRole(
        'clan-1',
        'target-1',
        ClanRole.MANAGER,
        'requester-1',
      )) as unknown as ClanMember;

      expect(result.role).toBe(ClanRole.MANAGER);
    });
  });

  // ==================== transferMaster ====================

  describe('transferMaster', () => {
    it('현재 MASTER가 아니면 ForbiddenException', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValueOnce(
        member(ClanRole.MANAGER),
      );

      await expect(
        service.transferMaster('clan-1', 'new-master', 'fake-master'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('대상 멤버 없으면 거부', async () => {
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(null);

      await expect(
        service.transferMaster('clan-1', 'unknown', 'current-master'),
      ).rejects.toThrow('대상 유저');
    });

    it('정상: 현재 MASTER → MANAGER로 강등, 대상 → MASTER로 승격', async () => {
      const current = member(ClanRole.MASTER, { userId: 'current-master' });
      const next = member(ClanRole.MEMBER, { userId: 'new-master' });
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(next);
      (membersRepo.save as jest.Mock).mockImplementation((arr) =>
        Promise.resolve(arr),
      );

      const result = await service.transferMaster(
        'clan-1',
        'new-master',
        'current-master',
      );

      expect(current.role).toBe(ClanRole.MANAGER);
      expect(next.role).toBe(ClanRole.MASTER);
      expect(result).toEqual({ message: 'Master transferred successfully' });
    });
  });

  // ==================== kickMember (권한 매트릭스) ====================

  describe('kickMember', () => {
    it('MEMBER가 호출 시 거부', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValueOnce(
        member(ClanRole.MEMBER),
      );

      await expect(
        service.kickMember('clan-1', 'target-1', 'mem-1'),
      ).rejects.toThrow('Only master or manager');
    });

    it('대상 미존재 시 거부', async () => {
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(null);

      await expect(
        service.kickMember('clan-1', 'missing', 'master-1'),
      ).rejects.toThrow('Target user');
    });

    it('MASTER 추방 불가', async () => {
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(member(ClanRole.MASTER, { userId: 'other' }));

      await expect(
        service.kickMember('clan-1', 'other', 'requester-1'),
      ).rejects.toThrow('Cannot kick clan master');
    });

    it('MANAGER가 다른 MANAGER 추방 불가', async () => {
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MANAGER))
        .mockResolvedValueOnce(member(ClanRole.MANAGER, { userId: 'mgr-2' }));

      await expect(
        service.kickMember('clan-1', 'mgr-2', 'mgr-1'),
      ).rejects.toThrow('Managers cannot kick');
    });

    it('MASTER가 MANAGER 추방 OK', async () => {
      const target = member(ClanRole.MANAGER, { userId: 'mgr-1' });
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MASTER))
        .mockResolvedValueOnce(target);
      (membersRepo.remove as jest.Mock).mockResolvedValue(target);

      const result = await service.kickMember('clan-1', 'mgr-1', 'master-1');

      expect(membersRepo.remove).toHaveBeenCalledWith(target);
      expect(result).toEqual({ message: 'Member kicked successfully' });
    });

    it('MANAGER가 MEMBER 추방 OK', async () => {
      const target = member(ClanRole.MEMBER, { userId: 'mem-1' });
      (membersRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member(ClanRole.MANAGER))
        .mockResolvedValueOnce(target);
      (membersRepo.remove as jest.Mock).mockResolvedValue(target);

      await service.kickMember('clan-1', 'mem-1', 'mgr-1');
      expect(membersRepo.remove).toHaveBeenCalledWith(target);
    });
  });

  // ==================== approveRequest ====================

  describe('approveRequest', () => {
    it('요청 미존재 시 거부', async () => {
      (requestsRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.approveRequest('req-1', 'admin-1')).rejects.toThrow(
        'Request not found',
      );
    });

    it('MEMBER 권한이면 ForbiddenException', async () => {
      (requestsRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'req-1',
        userId: 'applicant-1',
      });
      (membersRepo.findOne as jest.Mock).mockResolvedValue(
        member(ClanRole.MEMBER),
      );

      await expect(service.approveRequest('req-1', 'mem-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('정상: status APPROVED로 저장 + addMember 트랜잭션 실행', async () => {
      const request = {
        id: 'req-1',
        userId: 'applicant-1',
        status: RequestStatus.PENDING,
      } as unknown as ClanJoinRequest;
      (requestsRepo.findOne as jest.Mock).mockResolvedValue(request);
      (membersRepo.findOne as jest.Mock).mockResolvedValue(
        member(ClanRole.MASTER),
      );
      (requestsRepo.save as jest.Mock).mockImplementation((r) =>
        Promise.resolve(r),
      );
      // addMember 트랜잭션
      (manager.findOne as jest.Mock).mockResolvedValue(null);
      (manager.create as jest.Mock).mockReturnValue({});
      (manager.save as jest.Mock).mockResolvedValue({});

      const result = await service.approveRequest('req-1', 'master-1');

      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  // ==================== leaveClan ====================

  describe('leaveClan', () => {
    it('clan 멤버 아니면 거부', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.leaveClan('user-1')).rejects.toThrow(
        'not in any clan',
      );
    });

    it('MASTER는 leave 불가', async () => {
      (membersRepo.findOne as jest.Mock).mockResolvedValue(
        member(ClanRole.MASTER),
      );

      await expect(service.leaveClan('master-1')).rejects.toThrow(
        'cannot leave',
      );
    });

    it('일반 멤버는 정상 leave', async () => {
      const m = member(ClanRole.MEMBER);
      (membersRepo.findOne as jest.Mock).mockResolvedValue(m);
      (membersRepo.remove as jest.Mock).mockResolvedValue(m);

      await service.leaveClan('mem-1');
      expect(membersRepo.remove).toHaveBeenCalledWith(m);
    });
  });
});
