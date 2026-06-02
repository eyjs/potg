import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ShopService } from './shop.service';
import {
  ShopProduct,
  ProductStatus,
  ProductCategory,
} from './entities/shop-product.entity';
import { MarketOrder, MarketOrderStatus } from './entities/market-order.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import { ProfileItem } from './entities/profile-item.entity';
import { MemberItem } from './entities/member-item.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';

/**
 * ShopService 단위 테스트.
 *
 * 커버: purchase(검증/재고차감/burn/쿠폰할당), cancelOrder(환불/재고복구),
 * markDelivered(상태가드), purchaseProfileItem(중복/멤버 검증).
 *
 * 회계 무결성: 잔액 변경은 모두 LedgerService.burn/mint 경유 — 직접 UPDATE 금지.
 * 재정 핵심 경로의 회귀 안전망.
 */
describe('ShopService', () => {
  let service: ShopService;
  // 오버로드된 save/create 시그니처 충돌을 피하려 느슨한 jest.Mock 레코드로 선언.
  let manager: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let ledger: { burn: jest.Mock; mint: jest.Mock };
  let productsRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  // where/andWhere/select/update/set 모두 self-chaining. getRawOne/execute만 제어.
  const makeQb = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  });
  let qb: ReturnType<typeof makeQb>;

  const baseProduct = (overrides: Partial<ShopProduct> = {}): ShopProduct =>
    ({
      id: 'prod-1',
      name: '상품',
      status: ProductStatus.ACTIVE,
      stock: 10,
      price: 100,
      purchaseLimit: 0,
      category: ProductCategory.GOODS,
      totalSold: 0,
      ...overrides,
    }) as unknown as ShopProduct;

  beforeEach(async () => {
    qb = makeQb();
    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    } as unknown as typeof manager;

    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    };

    ledger = { burn: jest.fn(), mint: jest.fn() };
    productsRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

    const repoStub = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: getRepositoryToken(ShopProduct), useValue: productsRepo },
        { provide: getRepositoryToken(MarketOrder), useValue: repoStub() },
        { provide: getRepositoryToken(ShopCoupon), useValue: repoStub() },
        { provide: getRepositoryToken(ProfileItem), useValue: repoStub() },
        { provide: getRepositoryToken(MemberItem), useValue: repoStub() },
        { provide: getRepositoryToken(ClanMember), useValue: repoStub() },
        { provide: DataSource, useValue: dataSource },
        { provide: LedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get(ShopService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== 상품 CRUD ====================

  describe('updateProduct', () => {
    it('미존재 상품이면 NotFoundException', async () => {
      productsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateProduct('missing', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('isActive=false → status INACTIVE 로 매핑', async () => {
      const product = baseProduct();
      productsRepo.findOne.mockResolvedValue(product);
      productsRepo.save.mockImplementation((p: ShopProduct) =>
        Promise.resolve(p),
      );

      const result = await service.updateProduct('prod-1', { isActive: false });

      expect(result.status).toBe(ProductStatus.INACTIVE);
    });
  });

  // ==================== purchase ====================

  describe('purchase', () => {
    it('수량이 양의 정수가 아니면 BadRequestException', async () => {
      await expect(service.purchase('user-1', 'prod-1', 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.purchase('user-1', 'prod-1', 1.5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('상품 미존재 시 NotFoundException', async () => {
      manager.findOne.mockResolvedValueOnce(null);
      await expect(service.purchase('user-1', 'prod-1', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('비활성 상품이면 거부', async () => {
      manager.findOne.mockResolvedValueOnce(
        baseProduct({ status: ProductStatus.INACTIVE }),
      );
      await expect(service.purchase('user-1', 'prod-1', 1)).rejects.toThrow(
        'not active',
      );
    });

    it('재고 부족이면 거부', async () => {
      manager.findOne.mockResolvedValueOnce(baseProduct({ stock: 1 }));
      await expect(service.purchase('user-1', 'prod-1', 5)).rejects.toThrow(
        'Out of stock',
      );
    });

    it('구매 한도 초과 시 거부', async () => {
      manager.findOne.mockResolvedValueOnce(
        baseProduct({ purchaseLimit: 3, stock: 100 }),
      );
      qb.getRawOne.mockResolvedValue({ total: '2' }); // 이미 2개 → +2 = 4 > 3

      await expect(service.purchase('user-1', 'prod-1', 2)).rejects.toThrow(
        'Purchase limit exceeded',
      );
    });

    it('정상 구매: totalPrice burn + COMPLETED 주문 생성', async () => {
      const product = baseProduct({ price: 100, stock: 10 });
      manager.findOne
        .mockResolvedValueOnce(product) // 1) 상품 조회
        .mockResolvedValueOnce(baseProduct({ stock: 8 })); // 2) 재고 갱신 후 재조회
      manager.create.mockImplementation((_e, p) => p as MarketOrder);
      manager.save.mockImplementation((o: MarketOrder) =>
        Promise.resolve({ ...o, id: 'order-1' }),
      );

      const result = await service.purchase('user-1', 'prod-1', 2);

      // 재고 원자적 차감 쿼리 수행
      expect(qb.execute).toHaveBeenCalled();
      // 200P (=100*2) burn, 주문 id로 추적
      expect(ledger.burn).toHaveBeenCalledWith(
        'user-1',
        200n,
        POINT_TX_REASON.MARKET_BUY,
        expect.objectContaining({
          refType: 'MarketOrder',
          refId: 'order-1',
          manager,
        }),
      );
      expect(result.id).toBe('order-1');
    });

    it('재고 차감 경합 패배(affected=0) 시 Out of stock', async () => {
      manager.findOne.mockResolvedValueOnce(baseProduct({ stock: 10 }));
      qb.execute.mockResolvedValue({ affected: 0 });

      await expect(service.purchase('user-1', 'prod-1', 1)).rejects.toThrow(
        'Out of stock',
      );
      expect(ledger.burn).not.toHaveBeenCalled();
    });

    it('VOUCHER 구매 시 쿠폰 부족하면 거부(트랜잭션 롤백)', async () => {
      manager.findOne.mockResolvedValueOnce(
        baseProduct({ category: ProductCategory.VOUCHER, stock: 10 }),
      );
      manager.create.mockImplementation((_e, p) => p as MarketOrder);
      manager.save.mockImplementation((o: MarketOrder) =>
        Promise.resolve({ ...o, id: 'order-1' }),
      );
      manager.find.mockResolvedValue([]); // 가용 쿠폰 0개 < quantity 1

      await expect(service.purchase('user-1', 'prod-1', 1)).rejects.toThrow(
        'Not enough coupons',
      );
    });
  });

  // ==================== markDelivered ====================

  describe('markDelivered', () => {
    it('COMPLETED 주문만 배송 처리', async () => {
      const order = {
        id: 'o1',
        status: MarketOrderStatus.COMPLETED,
      } as MarketOrder;
      manager.findOne.mockResolvedValueOnce(order);
      manager.save.mockImplementation((o: MarketOrder) => Promise.resolve(o));

      const result = await service.markDelivered('o1', '메모');

      expect(result.status).toBe(MarketOrderStatus.DELIVERED);
      expect(result.adminNote).toBe('메모');
    });

    it('이미 DELIVERED면 거부', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'o1',
        status: MarketOrderStatus.DELIVERED,
      } as MarketOrder);

      await expect(service.markDelivered('o1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('주문 미존재 시 NotFoundException', async () => {
      manager.findOne.mockResolvedValueOnce(null);
      await expect(service.markDelivered('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== cancelOrder ====================

  describe('cancelOrder', () => {
    it('환불 mint + 재고 복구 + CANCELLED 전환', async () => {
      const order = {
        id: 'o1',
        status: MarketOrderStatus.COMPLETED,
        buyerId: 'user-1',
        productId: 'prod-1',
        quantity: 2,
        totalPrice: '200',
      } as MarketOrder;
      manager.findOne
        .mockResolvedValueOnce(order) // 주문 조회
        .mockResolvedValueOnce(
          baseProduct({ category: ProductCategory.GOODS }),
        ); // 상품(쿠폰 해제 분기용)
      manager.save.mockImplementation((o: MarketOrder) => Promise.resolve(o));

      const result = await service.cancelOrder('o1', '취소사유');

      expect(ledger.mint).toHaveBeenCalledWith(
        'user-1',
        200n,
        POINT_TX_REASON.MARKET_REFUND,
        expect.objectContaining({ refType: 'MarketOrder', refId: 'o1' }),
      );
      expect(qb.execute).toHaveBeenCalled(); // 재고 복구
      expect(result.status).toBe(MarketOrderStatus.CANCELLED);
    });

    it('이미 CANCELLED면 거부', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'o1',
        status: MarketOrderStatus.CANCELLED,
      } as MarketOrder);

      await expect(service.cancelOrder('o1')).rejects.toThrow('Already');
      expect(ledger.mint).not.toHaveBeenCalled();
    });

    it('DELIVERED 주문은 취소 불가', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'o1',
        status: MarketOrderStatus.DELIVERED,
      } as MarketOrder);

      await expect(service.cancelOrder('o1')).rejects.toThrow(
        'Cannot cancel a delivered order',
      );
    });
  });

  // ==================== purchaseProfileItem ====================

  describe('purchaseProfileItem', () => {
    it('아이템 미존재 시 NotFoundException', async () => {
      manager.findOne.mockResolvedValueOnce(null);
      await expect(
        service.purchaseProfileItem('member-1', 'item-1'),
      ).rejects.toThrow('아이템을 찾을 수 없습니다.');
    });

    it('이미 보유한 아이템이면 거부', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'item-1', price: 50 }) // 아이템
        .mockResolvedValueOnce({ id: 'mi-1' }); // 기존 보유

      await expect(
        service.purchaseProfileItem('member-1', 'item-1'),
      ).rejects.toThrow('이미 보유한');
    });

    it('정상 구매: clanMember.userId 잔액에서 item.price burn', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'item-1', price: 50 }) // 아이템
        .mockResolvedValueOnce(null) // 기존 보유 없음
        .mockResolvedValueOnce({ id: 'member-1', userId: 'user-7' }); // 클랜 멤버
      manager.create.mockImplementation((_e, p) => p as MemberItem);
      manager.save.mockImplementation((m: MemberItem) => Promise.resolve(m));

      await service.purchaseProfileItem('member-1', 'item-1');

      expect(ledger.burn).toHaveBeenCalledWith(
        'user-7',
        50n,
        POINT_TX_REASON.MARKET_BUY,
        expect.objectContaining({ refType: 'ProfileItem', refId: 'item-1' }),
      );
    });

    it('클랜 멤버 미존재 시 NotFoundException', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'item-1', price: 50 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // 멤버 없음

      await expect(
        service.purchaseProfileItem('member-1', 'item-1'),
      ).rejects.toThrow('클랜 멤버를 찾을 수 없습니다.');
      expect(ledger.burn).not.toHaveBeenCalled();
    });
  });
});
