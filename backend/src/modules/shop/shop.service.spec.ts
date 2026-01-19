import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from './shop.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShopProduct, ProductStatus } from './entities/shop-product.entity';
import { ShopPurchase } from './entities/shop-purchase.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import { DataSource } from 'typeorm';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { BadRequestException } from '@nestjs/common';

const mockProduct = {
  id: 'prod-1',
  clanId: 'clan-1',
  price: 100,
  stock: 10,
  status: ProductStatus.ACTIVE,
  totalSold: 0,
};

const mockClanMember = {
  userId: 'user-1',
  clanId: 'clan-1',
  totalPoints: 500,
};

const mockEntityManager = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn().mockImplementation((entity, dto) => dto),
};

const mockDataSource = {
  transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
};

describe('ShopService', () => {
  let service: ShopService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: getRepositoryToken(ShopProduct), useValue: {} },
        { provide: getRepositoryToken(ShopPurchase), useValue: {} },
        { provide: getRepositoryToken(ShopCoupon), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('purchase', () => {
    it('should successfully purchase a product', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockProduct) // Product
        .mockResolvedValueOnce(mockClanMember); // ClanMember

      const result = await service.purchase('user-1', 'prod-1', 1);

      expect(mockEntityManager.save).toHaveBeenCalledTimes(3); // ClanMember(points), Product(stock), Purchase
      expect(mockProduct.stock).toBe(9);
      expect(mockProduct.totalSold).toBe(1);
      expect(mockClanMember.totalPoints).toBe(400); // 500 - 100
    });

    it('should throw error if insufficient points', async () => {
      const poorUser = { ...mockClanMember, totalPoints: 50 };
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(poorUser);

      await expect(service.purchase('user-1', 'prod-1', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if out of stock', async () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      mockEntityManager.findOne.mockResolvedValueOnce(outOfStockProduct);

      await expect(service.purchase('user-1', 'prod-1', 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
