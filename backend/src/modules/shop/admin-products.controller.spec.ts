import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminProductsController } from './admin-products.controller';
import { ShopService } from './shop.service';
import { ShopProduct, ProductStatus, ProductCategory } from './entities/shop-product.entity';

// 관리자 상품 CRUD 단위 테스트
describe('AdminProductsController', () => {
  let controller: AdminProductsController;
  let productsRepo: jest.Mocked<Pick<Repository<ShopProduct>, 'findOne' | 'save'>>;
  let shopService: jest.Mocked<Pick<ShopService, 'findAll' | 'createProduct'>>;

  const baseProduct = (overrides: Partial<ShopProduct> = {}): ShopProduct =>
    ({
      id: 'product-uuid-1',
      name: '테스트 상품',
      description: '상품 설명',
      price: 1000,
      stock: 50,
      purchaseLimit: 0,
      imageUrl: null,
      status: ProductStatus.ACTIVE,
      category: ProductCategory.GOODS,
      totalSold: 0,
      coupons: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    }) as unknown as ShopProduct;

  beforeEach(async () => {
    const mockProductsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const mockShopService = {
      findAll: jest.fn(),
      createProduct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProductsController],
      providers: [
        { provide: ShopService, useValue: mockShopService },
        { provide: getRepositoryToken(ShopProduct), useValue: mockProductsRepo },
      ],
    }).compile();

    controller = module.get<AdminProductsController>(AdminProductsController);
    productsRepo = module.get(getRepositoryToken(ShopProduct));
    shopService = module.get(ShopService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== create ====================

  describe('create', () => {
    it('ShopService.createProduct를 호출하고 결과를 반환한다', async () => {
      const product = baseProduct();
      const createDto = {
        name: '테스트 상품',
        description: '상품 설명',
        price: 1000,
        stock: 50,
        category: ProductCategory.GOODS,
        purchaseLimit: 0,
      };
      (shopService.createProduct as jest.Mock).mockResolvedValue(product);

      const result = await controller.create(createDto);

      expect(shopService.createProduct).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(product);
    });
  });

  // ==================== update ====================

  describe('update', () => {
    it('존재하는 상품의 부분 필드를 수정하고 저장한다', async () => {
      const product = baseProduct();
      (productsRepo.findOne as jest.Mock).mockResolvedValue(product);
      (productsRepo.save as jest.Mock).mockImplementation((p: ShopProduct) =>
        Promise.resolve(p),
      );

      const result = await controller.update('product-uuid-1', {
        name: '수정된 상품명',
        price: 2000,
      });

      expect(result.name).toBe('수정된 상품명');
      expect(result.price).toBe(2000);
      // 변경하지 않은 필드는 원래 값 유지
      expect(result.stock).toBe(50);
      expect(productsRepo.save).toHaveBeenCalled();
    });

    it('isActive: false → status INACTIVE로 변경한다', async () => {
      const product = baseProduct({ status: ProductStatus.ACTIVE });
      (productsRepo.findOne as jest.Mock).mockResolvedValue(product);
      (productsRepo.save as jest.Mock).mockImplementation((p: ShopProduct) =>
        Promise.resolve(p),
      );

      const result = await controller.update('product-uuid-1', { isActive: false });

      expect(result.status).toBe(ProductStatus.INACTIVE);
    });

    it('isActive: true → status ACTIVE로 변경한다', async () => {
      const product = baseProduct({ status: ProductStatus.INACTIVE });
      (productsRepo.findOne as jest.Mock).mockResolvedValue(product);
      (productsRepo.save as jest.Mock).mockImplementation((p: ShopProduct) =>
        Promise.resolve(p),
      );

      const result = await controller.update('product-uuid-1', { isActive: true });

      expect(result.status).toBe(ProductStatus.ACTIVE);
    });

    it('존재하지 않는 id이면 NotFoundException을 던진다', async () => {
      (productsRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.update('non-existent-uuid', { name: '변경' }),
      ).rejects.toThrow(NotFoundException);

      expect(productsRepo.save).not.toHaveBeenCalled();
    });
  });

  // ==================== remove (soft delete) ====================

  describe('remove', () => {
    it('상품을 INACTIVE로 soft-delete 처리한다', async () => {
      const product = baseProduct({ status: ProductStatus.ACTIVE });
      (productsRepo.findOne as jest.Mock).mockResolvedValue(product);
      (productsRepo.save as jest.Mock).mockResolvedValue({
        ...product,
        status: ProductStatus.INACTIVE,
      });

      await controller.remove('product-uuid-1');

      expect(productsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.INACTIVE }),
      );
    });

    it('존재하지 않는 id이면 NotFoundException을 던진다', async () => {
      (productsRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.remove('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );

      expect(productsRepo.save).not.toHaveBeenCalled();
    });
  });

  // ==================== findAll ====================

  describe('findAll', () => {
    it.skip('clanId 필터를 ShopService에 전달한다 (단일 클랜 전환으로 제거)', async () => {
      const products = [baseProduct()];
      (shopService.findAll as jest.Mock).mockResolvedValue(products);

      await controller.findAll();
      expect(shopService.findAll).toHaveBeenCalled();
    });

    it('파라미터 없이 전체 조회한다', async () => {
      (shopService.findAll as jest.Mock).mockResolvedValue([]);

      await controller.findAll();

      expect(shopService.findAll).toHaveBeenCalledWith();
    });
  });
});
