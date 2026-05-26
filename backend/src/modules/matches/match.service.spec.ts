import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { MatchService } from './match.service';
import { Match } from './entities/match.entity';
import { Team } from './entities/team.entity';
import { BettingService } from '../betting/betting.service';
import {
  BettingMarket,
  BettingMarketStatus,
} from '../betting/entities/betting-market.entity';
import { MatchStatus } from './enums/match-status.enum';

// 내전 상태머신 단위 테스트 — 실제 DB 의존성 없음
describe('MatchService', () => {
  let service: MatchService;
  let matchRepo: jest.Mocked<Repository<Match>>;
  let bettingService: jest.Mocked<BettingService>;
  let dataSource: { transaction: jest.Mock };

  // 공통 픽스처
  const baseMatch = (overrides: Partial<Match> = {}): Match =>
    ({
      id: 'match-uuid-1',
      title: '내전 1회',
      status: MatchStatus.DRAFT,
      scheduledAt: null,
      description: null,
      winnerTeamId: null,
      settledAt: null,
      teams: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    }) as unknown as Match;

  const baseTeam = (overrides: Partial<Team> = {}): Team =>
    ({
      id: 'team-uuid-1',
      matchId: 'match-uuid-1',
      name: '팀 알파',
      captainId: null,
      placement: null,
      ...overrides,
    }) as unknown as Team;

  /**
   * 트랜잭션 내 manager mock 생성.
   * getRepository(Match).createQueryBuilder() 체인으로 matchRow를 반환하고,
   * find/findOne/save 는 호출 시점마다 별도로 재정의 가능.
   */
  const buildManagerMock = (matchRow: Match | null) => {
    const qbMock = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(matchRow),
    };
    const managerMock = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      }),
      save: jest
        .fn()
        .mockImplementation((entity: unknown) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    return managerMock;
  };

  beforeEach(async () => {
    const mockMatchRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const mockTeamRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    const mockBettingService = {
      lockMarket: jest.fn(),
      settleMarket: jest.fn(),
      cancelMarket: jest.fn(),
    };
    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: getRepositoryToken(Match), useValue: mockMatchRepo },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
        { provide: BettingService, useValue: mockBettingService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
    matchRepo = module.get(getRepositoryToken(Match));
    bettingService = module.get(BettingService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== create ====================

  describe('create', () => {
    it('정상 타이틀로 DRAFT 상태 매치를 생성한다', async () => {
      const created = baseMatch();
      matchRepo.create.mockReturnValue(created);
      matchRepo.save.mockResolvedValue(created);

      const result = await service.create({ title: '내전 1회' });

      expect(matchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '내전 1회',
          status: MatchStatus.DRAFT,
        }),
      );
      expect(result.status).toBe(MatchStatus.DRAFT);
    });

    it('빈 title이면 BadRequestException을 던진다', async () => {
      await expect(service.create({ title: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      expect(matchRepo.save).not.toHaveBeenCalled();
    });
  });

  // ==================== openBetting ====================

  describe('openBetting', () => {
    it('DRAFT → BETTING_OPEN 전이가 성공한다', async () => {
      const match = baseMatch({ status: MatchStatus.DRAFT });
      const manager = buildManagerMock(match);
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      const result = await service.openBetting('match-uuid-1');

      expect(result.status).toBe(MatchStatus.BETTING_OPEN);
      expect(manager.save).toHaveBeenCalled();
    });

    it('비-DRAFT 상태에서 openBetting을 호출하면 BadRequestException을 던진다', async () => {
      const match = baseMatch({ status: MatchStatus.SETTLED });
      const manager = buildManagerMock(match);
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(service.openBetting('match-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('존재하지 않는 matchId이면 NotFoundException을 던진다', async () => {
      const manager = buildManagerMock(null);
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(service.openBetting('no-such-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== lockMatch ====================

  describe('lockMatch', () => {
    it('BETTING_OPEN → LOCKED 전이 + OPEN 마켓들을 lockMarket 호출', async () => {
      const match = baseMatch({ status: MatchStatus.BETTING_OPEN });
      const openMarkets: Partial<BettingMarket>[] = [
        { id: 'market-1', status: BettingMarketStatus.OPEN },
        { id: 'market-2', status: BettingMarketStatus.OPEN },
      ];

      const manager = buildManagerMock(match);
      manager.find.mockResolvedValue(openMarkets as BettingMarket[]);

      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      const result = await service.lockMatch('match-uuid-1');

      expect(result.status).toBe(MatchStatus.LOCKED);
      expect(bettingService.lockMarket).toHaveBeenCalledTimes(2);
      expect(bettingService.lockMarket).toHaveBeenCalledWith(
        'market-1',
        expect.anything(),
      );
      expect(bettingService.lockMarket).toHaveBeenCalledWith(
        'market-2',
        expect.anything(),
      );
    });

    it('DRAFT에서 lockMatch를 호출하면 BadRequestException을 던진다', async () => {
      const match = baseMatch({ status: MatchStatus.DRAFT });
      const manager = buildManagerMock(match);
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(service.lockMatch('match-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== settleMatch ====================

  describe('settleMatch', () => {
    it('LOCKED → SETTLED 전이 + WIN 마켓 정산 호출', async () => {
      const match = baseMatch({ status: MatchStatus.LOCKED });
      const winnerTeam = baseTeam({ id: 'team-uuid-1' });
      const lockedMarket: Partial<BettingMarket> = {
        id: 'market-1',
        status: BettingMarketStatus.LOCKED,
        type: 'WIN' as BettingMarket['type'],
      };

      const manager = buildManagerMock(match);
      manager.findOne.mockResolvedValue(winnerTeam);
      manager.find.mockResolvedValue([lockedMarket] as BettingMarket[]);

      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      const result = await service.settleMatch('match-uuid-1', 'team-uuid-1');

      expect(result.status).toBe(MatchStatus.SETTLED);
      expect(result.winnerTeamId).toBe('team-uuid-1');
      expect(bettingService.settleMarket).toHaveBeenCalledWith(
        'market-1',
        'team-uuid-1',
        expect.anything(),
      );
    });

    it('비-LOCKED 상태에서 settleMatch를 호출하면 BadRequestException을 던진다', async () => {
      const match = baseMatch({ status: MatchStatus.DRAFT });
      const manager = buildManagerMock(match);
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(
        service.settleMatch('match-uuid-1', 'team-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('존재하지 않는 winnerTeamId이면 BadRequestException을 던진다', async () => {
      const match = baseMatch({ status: MatchStatus.LOCKED });
      const manager = buildManagerMock(match);
      // winnerTeam 조회 → null
      manager.findOne.mockResolvedValue(null);

      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(
        service.settleMatch('match-uuid-1', 'wrong-team-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('placements 값이 1~4 범위 밖이면 BadRequestException을 던진다', async () => {
      const match = baseMatch({ status: MatchStatus.LOCKED });
      const winnerTeam = baseTeam({ id: 'team-uuid-1' });
      const rankedTeam = baseTeam({ id: 'team-uuid-2' });

      const manager = buildManagerMock(match);
      // 첫 findOne = winnerTeam, 두 번째 = rankedTeam (placement 검증)
      manager.findOne
        .mockResolvedValueOnce(winnerTeam)
        .mockResolvedValueOnce(rankedTeam);

      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(
        service.settleMatch('match-uuid-1', 'team-uuid-1', {
          'team-uuid-2': 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== cancelMatch ====================

  describe('cancelMatch', () => {
    it('DRAFT → CANCELLED 전이 + 미정산 OPEN 마켓 환불 호출', async () => {
      const match = baseMatch({ status: MatchStatus.DRAFT });
      const markets: Partial<BettingMarket>[] = [
        { id: 'market-1', status: BettingMarketStatus.OPEN },
        // 이미 정산된 마켓은 환불 건너뜀
        { id: 'market-2', status: BettingMarketStatus.SETTLED },
      ];

      const manager = buildManagerMock(match);
      manager.find.mockResolvedValue(markets as BettingMarket[]);

      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      const result = await service.cancelMatch('match-uuid-1');

      expect(result.status).toBe(MatchStatus.CANCELLED);
      // OPEN 마켓만 cancelMarket 호출됨
      expect(bettingService.cancelMarket).toHaveBeenCalledTimes(1);
      expect(bettingService.cancelMarket).toHaveBeenCalledWith(
        'market-1',
        expect.anything(),
      );
    });

    it('SETTLED 상태에서 cancelMatch를 호출하면 BadRequestException을 던진다', async () => {
      const match = baseMatch({ status: MatchStatus.SETTLED });
      const manager = buildManagerMock(match);
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(service.cancelMatch('match-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('CANCELLED 상태에서 cancelMatch를 호출하면 BadRequestException을 던진다', async () => {
      const match = baseMatch({ status: MatchStatus.CANCELLED });
      const manager = buildManagerMock(match);
      dataSource.transaction.mockImplementation(
        (cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager as unknown as EntityManager),
      );

      await expect(service.cancelMatch('match-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
