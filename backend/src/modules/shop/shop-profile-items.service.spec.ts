import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShopService } from './shop.service';
import { ShopProduct } from './entities/shop-product.entity';
import { ShopPurchase } from './entities/shop-purchase.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import { ProfileItem, ProfileItemCategory } from './entities/profile-item.entity';
import { MemberItem } from './entities/member-item.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ShopService - Profile Items', () => {
  let service: ShopService;
  let profileItemRepo: jest.Mocked<Repository<ProfileItem>>;
  let memberItemRepo: jest.Mocked<Repository<MemberItem>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockProfileItem: ProfileItem = {
    id: 'item-1',
    code: 'FRAME_GOLD',
    name: '골드 프레임',
    description: '황금빛 프레임',
    category: ProfileItemCategory.FRAME,
    price: 300,
    previewUrl: null,
    assetUrl: null,
    assetData: null,
    isLimited: false,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProfileItem;

  const mockClanMember: ClanMember = {
    id: 'member-1',
    userId: 'user-1',
    clanId: 'clan-1',
    totalPoints: 1000,
    lockedPoints: 0,
  } as ClanMember;

  const mockMemberItem: MemberItem = {
    id: 'mi-1',
    memberId: 'member-1',
    itemId: 'item-1',
    purchasedAt: new Date(),
    expiresAt: null,
  } as MemberItem;

  beforeEach(async () => {
    const mockTransactionManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        {
          provide: getRepositoryToken(ShopProduct),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ShopPurchase),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ShopCoupon),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProfileItem),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MemberItem),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClanMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) => callback(mockTransactionManager)),
          },
        },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
    profileItemRepo = module.get(getRepositoryToken(ProfileItem));
    memberItemRepo = module.get(getRepositoryToken(MemberItem));
    dataSource = module.get(DataSource);
  });

  describe('getProfileItems', () => {
    it('활성화된 모든 프로필 아이템을 반환해야 함', async () => {
      const items = [mockProfileItem];
      profileItemRepo.find.mockResolvedValue(items);

      const result = await service.getProfileItems();

      expect(result).toEqual(items);
      expect(profileItemRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });
    });

    it('카테고리로 필터링해야 함', async () => {
      const items = [mockProfileItem];
      profileItemRepo.find.mockResolvedValue(items);

      await service.getProfileItems(ProfileItemCategory.FRAME);

      expect(profileItemRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, category: ProfileItemCategory.FRAME },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });
    });
  });

  describe('getProfileItem', () => {
    it('아이템이 존재하면 반환해야 함', async () => {
      profileItemRepo.findOne.mockResolvedValue(mockProfileItem);

      const result = await service.getProfileItem('item-1');

      expect(result).toEqual(mockProfileItem);
    });

    it('아이템이 없으면 NotFoundException을 던져야 함', async () => {
      profileItemRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfileItem('not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasMemberItem', () => {
    it('아이템을 보유하면 true 반환', async () => {
      memberItemRepo.count.mockResolvedValue(1);

      const result = await service.hasMemberItem('member-1', 'item-1');

      expect(result).toBe(true);
    });

    it('아이템을 보유하지 않으면 false 반환', async () => {
      memberItemRepo.count.mockResolvedValue(0);

      const result = await service.hasMemberItem('member-1', 'item-2');

      expect(result).toBe(false);
    });
  });

  describe('purchaseProfileItem', () => {
    it('성공적으로 구매해야 함', async () => {
      const mockManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(mockProfileItem) // 아이템 조회
          .mockResolvedValueOnce(null) // 이미 보유 여부 (없음)
          .mockResolvedValueOnce({ ...mockClanMember, totalPoints: 1000 }), // 멤버 조회
        create: jest.fn().mockReturnValue(mockMemberItem),
        save: jest.fn().mockResolvedValue(undefined),
      };
      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      const result = await service.purchaseProfileItem('member-1', 'clan-1', 'item-1');

      expect(result).toEqual(mockMemberItem);
      expect(mockManager.save).toHaveBeenCalledTimes(2); // 포인트 차감 + 아이템 지급
    });

    it('아이템이 없으면 NotFoundException을 던져야 함', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(
        service.purchaseProfileItem('member-1', 'clan-1', 'not-exist'),
      ).rejects.toThrow(NotFoundException);
    });

    it('이미 보유한 아이템이면 BadRequestException을 던져야 함', async () => {
      const mockManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(mockProfileItem)
          .mockResolvedValueOnce(mockMemberItem), // 이미 보유
      };
      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(
        service.purchaseProfileItem('member-1', 'clan-1', 'item-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('포인트가 부족하면 BadRequestException을 던져야 함', async () => {
      const mockManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(mockProfileItem)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ ...mockClanMember, totalPoints: 100 }), // 포인트 부족
      };
      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(
        service.purchaseProfileItem('member-1', 'clan-1', 'item-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('클랜 멤버가 아니면 NotFoundException을 던져야 함', async () => {
      const mockManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(mockProfileItem)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null), // 멤버 없음
      };
      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(
        service.purchaseProfileItem('member-1', 'clan-1', 'item-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
