import { Test, TestingModule } from '@nestjs/testing';
import { ClansService } from '../../../src/modules/clans/clans.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Clan } from '../../../src/modules/clans/entities/clan.entity';
import {
  ClanMember,
  ClanRole,
} from '../../../src/modules/clans/entities/clan-member.entity';
import { Repository } from 'typeorm';
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClansService,
        {
          provide: getRepositoryToken(Clan),
          useValue: mockClansRepository,
        },
        {
          provide: getRepositoryToken(ClanMember),
          useValue: mockMembersRepository,
        },
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
      const createClanDto = {
        name: 'New Clan',
        tag: 'NEW',
        description: 'New clan',
      };
      const userId = 'user-1';

      mockClansRepository.create.mockReturnValue(mockClan);
      mockClansRepository.save.mockResolvedValue(mockClan);
      mockMembersRepository.create.mockReturnValue(mockClanMember);
      mockMembersRepository.save.mockResolvedValue(mockClanMember);

      const result = await service.create(createClanDto, userId);

      expect(clansRepository.create).toHaveBeenCalledWith(createClanDto);
      expect(clansRepository.save).toHaveBeenCalledWith(mockClan);
      expect(membersRepository.create).toHaveBeenCalledWith({
        clanId: mockClan.id,
        userId,
        role: ClanRole.MASTER,
      });
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
      expect(clansRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'clan-1' },
      });
    });
  });

  describe('addMember', () => {
    it('should add member to clan', async () => {
      mockClansRepository.findOne.mockResolvedValue(mockClan);
      mockMembersRepository.findOne.mockResolvedValue(null);
      mockMembersRepository.create.mockReturnValue(mockClanMember);
      mockMembersRepository.save.mockResolvedValue(mockClanMember);

      const result = await service.addMember('clan-1', 'user-2');

      expect(membersRepository.create).toHaveBeenCalledWith({
        clanId: 'clan-1',
        userId: 'user-2',
        role: ClanRole.MEMBER,
      });
      expect(result).toEqual(mockClanMember);
    });

    it('should throw error if clan not found', async () => {
      mockClansRepository.findOne.mockResolvedValue(null);

      await expect(service.addMember('invalid-clan', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user already member', async () => {
      mockClansRepository.findOne.mockResolvedValue(mockClan);
      mockMembersRepository.findOne.mockResolvedValue(mockClanMember);

      await expect(service.addMember('clan-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
