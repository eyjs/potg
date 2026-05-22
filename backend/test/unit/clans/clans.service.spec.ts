import { Test, TestingModule } from '@nestjs/testing';
import { ClansService } from '../../../src/modules/clans/clans.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Clan } from '../../../src/modules/clans/entities/clan.entity';
import {
  ClanMember,
  ClanRole,
} from '../../../src/modules/clans/entities/clan-member.entity';
import { ClanJoinRequest } from '../../../src/modules/clans/entities/clan-join-request.entity';
import { Announcement } from '../../../src/modules/clans/entities/announcement.entity';
import { HallOfFame } from '../../../src/modules/clans/entities/hall-of-fame.entity';
import { PointTx } from '../../../src/modules/ledger/entities/point-tx.entity';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('ClansService - Unit Tests', () => {
  let service: ClansService;
  let clansRepository: Repository<Clan>;
  let membersRepository: Repository<ClanMember>;

  const mockClan = {
    id: 'clan-1',
    name: 'Test Clan',
    tag: 'TEST',
    description: 'Test clan description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClanMember = {
    id: 'member-1',
    clanId: 'clan-1',
    userId: 'user-1',
    role: ClanRole.MEMBER,
    totalPoints: 1000,
    lockedPoints: 0,
    penaltyCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClansRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockMembersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const noopRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    const mockDataSource = {
      transaction: jest.fn().mockImplementation((cb: (m: unknown) => unknown) =>
        cb({
          findOne: jest
            .fn()
            .mockImplementation((_entity: unknown, opts: { where: Record<string, unknown> }) => {
              // create(): existing clan check
              if (opts?.where && 'name' in (opts.where as object)) return null;
              return null;
            }),
          create: jest.fn().mockImplementation((entity: unknown, dto: unknown) => {
            if (entity === Clan) return mockClan;
            if (entity === ClanMember) return mockClanMember;
            return dto;
          }),
          save: jest.fn().mockImplementation((entity: unknown) => entity),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClansService,
        { provide: getRepositoryToken(Clan), useValue: mockClansRepository },
        { provide: getRepositoryToken(ClanMember), useValue: mockMembersRepository },
        { provide: getRepositoryToken(ClanJoinRequest), useValue: noopRepo },
        { provide: getRepositoryToken(Announcement), useValue: noopRepo },
        { provide: getRepositoryToken(HallOfFame), useValue: noopRepo },
        { provide: getRepositoryToken(PointTx), useValue: noopRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ClansService>(ClansService);
    clansRepository = module.get<Repository<Clan>>(getRepositoryToken(Clan));
    membersRepository = module.get<Repository<ClanMember>>(
      getRepositoryToken(ClanMember),
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new clan with creator as MASTER', async () => {
      const result = await service.create(
        { name: 'New Clan', tag: 'NEW', description: 'New clan' },
        'user-1',
      );
      expect(result).toEqual(mockClan);
    });
  });

  describe('findAll', () => {
    it('should return all clans', async () => {
      const clans = [mockClan];
      mockClansRepository.find.mockResolvedValue(clans);

      const result = await service.findAll();

      expect(result).toEqual(clans);
      expect(clansRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return clan by id', async () => {
      mockClansRepository.findOne.mockResolvedValue(mockClan);
      const result = await service.findOne('clan-1');
      expect(result).toEqual(mockClan);
    });
  });
});

