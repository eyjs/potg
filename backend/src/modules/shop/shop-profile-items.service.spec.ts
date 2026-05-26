import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopProduct } from './entities/shop-product.entity';
import { MarketOrder } from './entities/market-order.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import {
  ProfileItem,
  ProfileItemCategory,
} from './entities/profile-item.entity';
import { MemberItem } from './entities/member-item.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { LedgerService } from '../ledger/ledger.service';

describe('ShopService - Profile Items', () => {
  let service: ShopService;
  let profileItemRepo: jest.Mocked<Repository<ProfileItem>>;
  let memberItemRepo: jest.Mocked<Repository<MemberItem>>;
  let mockTransaction: jest.Mock;
  let ledgerBurn: jest.Mock;

  const mockProfileItem = {
    id: 'item-1',
    code: 'FRAME_GOLD',
    name: '골드 프레임',
    category: ProfileItemCategory.FRAME,
    price: 300,
    isActive: true,
  };

  const mockClanMember = {
    id: 'member-1',
    userId: 'user-1',
    clanId: 'clan-1',
  };

  const mockMemberItem = {
    id: 'mi-1',
    memberId: 'member-1',
    itemId: 'item-1',
    purchasedAt: new Date(),
  };

  beforeEach(async () => {
    mockTransaction = jest.fn();
    ledgerBurn = jest.fn().mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        {
          provide: getRepositoryToken(ShopProduct),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(MarketOrder),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ShopCoupon),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProfileItem),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(MemberItem),
          useValue: { find: jest.fn(), findOne: jest.fn(), count: jest.fn() },
        },
        {
          provide: getRepositoryToken(ClanMember),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { transaction: mockTransaction },
        },
        {
          provide: LedgerService,
          useValue: { burn: ledgerBurn, mint: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
    profileItemRepo = module.get(getRepositoryToken(ProfileItem));
    memberItemRepo = module.get(getRepositoryToken(MemberItem));
  });

  describe('getProfileItems', () => {
    it('활성화된 모든 프로필 아이템을 반환', async () => {
      profileItemRepo.find.mockResolvedValue([
        mockProfileItem,
      ] as ProfileItem[]);
      const result = await service.getProfileItems();
      expect(result).toEqual([mockProfileItem]);
    });

    it('카테고리 필터 적용', async () => {
      profileItemRepo.find.mockResolvedValue([] as ProfileItem[]);
      await service.getProfileItems(ProfileItemCategory.FRAME);
      expect(profileItemRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, category: ProfileItemCategory.FRAME },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });
    });
  });

  describe('getProfileItem', () => {
    it('NotFoundException on missing', async () => {
      profileItemRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfileItem('x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasMemberItem', () => {
    it('true when count > 0', async () => {
      memberItemRepo.count.mockResolvedValue(1);
      expect(await service.hasMemberItem('m', 'i')).toBe(true);
    });
    it('false when 0', async () => {
      memberItemRepo.count.mockResolvedValue(0);
      expect(await service.hasMemberItem('m', 'i')).toBe(false);
    });
  });

  describe('purchaseProfileItem (Ledger 위임)', () => {
    it('성공: LedgerService.burn 호출 + MemberItem 생성', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockProfileItem) // item
          .mockResolvedValueOnce(null) // existing memberItem
          .mockResolvedValueOnce(mockClanMember), // clanMember
        create: jest.fn().mockReturnValue(mockMemberItem),
        save: jest.fn().mockResolvedValue(mockMemberItem),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      const result = await service.purchaseProfileItem('member-1', 'item-1');

      expect(result).toEqual(mockMemberItem);
      expect(ledgerBurn).toHaveBeenCalledWith(
        'user-1',
        300n,
        expect.any(String),
        expect.objectContaining({
          refType: 'ProfileItem',
          manager: mockManager,
        }),
      );
    });

    it('아이템 없음 → NotFoundException', async () => {
      const mockManager = { findOne: jest.fn().mockResolvedValue(null) };
      mockTransaction.mockImplementation((cb) => cb(mockManager));
      await expect(service.purchaseProfileItem('m', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('중복 보유 → BadRequestException', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockProfileItem)
          .mockResolvedValueOnce(mockMemberItem),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));
      await expect(service.purchaseProfileItem('m', 'item-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('클랜 멤버 아님 → NotFoundException', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockProfileItem)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));
      await expect(service.purchaseProfileItem('m', 'item-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
