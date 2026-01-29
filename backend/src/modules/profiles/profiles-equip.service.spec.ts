import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { ProfilesService } from './profiles.service';
import { MemberProfile } from './entities/member-profile.entity';
import { Follow } from './entities/follow.entity';
import { Guestbook } from './entities/guestbook.entity';
import { ProfileVisit } from './entities/profile-visit.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { MemberItem } from '../shop/entities/member-item.entity';
import { BadRequestException } from '@nestjs/common';

describe('ProfilesService - equipItems', () => {
  let service: ProfilesService;
  let profileRepo: jest.Mocked<Repository<MemberProfile>>;
  let memberItemRepo: jest.Mocked<Repository<MemberItem>>;

  const mockProfile: MemberProfile = {
    id: 'profile-1',
    memberId: 'member-1',
    displayName: '테스터',
    bio: null,
    statusMessage: null,
    themeId: 'default',
    bgmUrl: null,
    bgmTitle: null,
    avatarUrl: null,
    frameId: 'default',
    petId: null,
    pinnedAchievements: [],
    todayVisitors: 0,
    totalVisitors: 0,
    followerCount: 0,
    followingCount: 0,
    isPublic: true,
  } as MemberProfile;

  const mockMember: ClanMember = {
    id: 'member-1',
    userId: 'user-1',
    clanId: 'clan-1',
    user: {
      battleTag: 'Tester#1234',
      username: 'tester',
    },
  } as ClanMember;

  beforeEach(async () => {
    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    } as unknown as SelectQueryBuilder<MemberItem>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(MemberProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Guestbook),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProfileVisit),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ClanMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MemberItem),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    profileRepo = module.get(getRepositoryToken(MemberProfile));
    memberItemRepo = module.get(getRepositoryToken(MemberItem));
  });

  describe('equipItems', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(mockProfile);
      profileRepo.save.mockImplementation(async (profile) => profile as MemberProfile);
    });

    it('default 아이템은 보유 검증 없이 적용되어야 함', async () => {
      const result = await service.equipItems('member-1', {
        themeId: 'default',
        frameId: 'default',
      });

      expect(result.themeId).toBe('default');
      expect(result.frameId).toBe('default');
    });

    it('보유한 아이템은 적용되어야 함', async () => {
      const mockQb = memberItemRepo.createQueryBuilder();
      (mockQb.getCount as jest.Mock).mockResolvedValue(1);

      const result = await service.equipItems('member-1', {
        frameId: 'FRAME_GOLD',
      });

      expect(result.frameId).toBe('FRAME_GOLD');
    });

    it('보유하지 않은 아이템은 BadRequestException을 던져야 함', async () => {
      const mockQb = memberItemRepo.createQueryBuilder();
      (mockQb.getCount as jest.Mock).mockResolvedValue(0);

      await expect(
        service.equipItems('member-1', { frameId: 'FRAME_DIAMOND' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('여러 아이템 중 하나라도 미보유면 실패해야 함', async () => {
      const mockQb = memberItemRepo.createQueryBuilder();
      (mockQb.getCount as jest.Mock)
        .mockResolvedValueOnce(1)  // themeId 보유
        .mockResolvedValueOnce(0); // frameId 미보유

      await expect(
        service.equipItems('member-1', {
          themeId: 'THEME_NEON',
          frameId: 'FRAME_DIAMOND',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('BGM은 보유 검증 없이 적용되어야 함', async () => {
      const result = await service.equipItems('member-1', {
        bgmUrl: 'https://example.com/audio.mp3',
        bgmTitle: 'My BGM',
      });

      expect(result.bgmUrl).toBe('https://example.com/audio.mp3');
      expect(result.bgmTitle).toBe('My BGM');
    });

    it('null로 아이템을 해제할 수 있어야 함', async () => {
      const profileWithItem = { ...mockProfile, petId: 'PET_HAMSTER' };
      profileRepo.findOne.mockResolvedValue(profileWithItem as MemberProfile);

      const result = await service.equipItems('member-1', {
        petId: 'default',
      });

      expect(result.petId).toBe('default');
    });
  });
});
