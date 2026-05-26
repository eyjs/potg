import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { ShopService } from './shop.service';
import {
  ShopProduct,
  ProductStatus,
  ProductCategory,
} from './entities/shop-product.entity';

// 관리자 상품 CRUD 단위 테스트
describe('AdminProductsController', () => {
  let controller: AdminProductsController;
  let shopService: jest.Mocked<
    Pick<
      ShopService,
      'findAll' | 'createProduct' | 'updateProduct' | 'softDeleteProduct'
    >
  >;

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
    const mockShopService = {
      findAll: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      softDeleteProduct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProductsController],
      providers: [{ provide: ShopService, useValue: mockShopService }],
    }).compile();

    controller = module.get<AdminProductsController>(AdminProductsController);
    shopService = module.get(ShopService);
  });

  afterEach(() => jest.clearAllMocks());

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

  describe('update', () => {
    it('ShopService.updateProduct에 dto 그대로 위임', async () => {
      const updated = baseProduct({ name: '수정', price: 2000 });
      (shopService.updateProduct as jest.Mock).mockResolvedValue(updated);

      const result = await controller.update('product-uuid-1', {
        name: '수정',
        price: 2000,
      });

      expect(shopService.updateProduct).toHaveBeenCalledWith('product-uuid-1', {
        name: '수정',
        price: 2000,
      });
      expect(result).toEqual(updated);
    });

    it('service NotFoundException 전파', async () => {
      (shopService.updateProduct as jest.Mock).mockRejectedValue(
        new NotFoundException('Product not found'),
      );
      await expect(controller.update('missing', { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('ShopService.softDeleteProduct 호출', async () => {
      (shopService.softDeleteProduct as jest.Mock).mockResolvedValue(undefined);
      await controller.remove('product-uuid-1');
      expect(shopService.softDeleteProduct).toHaveBeenCalledWith(
        'product-uuid-1',
      );
    });

    it('service NotFoundException 전파', async () => {
      (shopService.softDeleteProduct as jest.Mock).mockRejectedValue(
        new NotFoundException('Product not found'),
      );
      await expect(controller.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('파라미터 없이 전체 조회한다', async () => {
      (shopService.findAll as jest.Mock).mockResolvedValue([]);
      await controller.findAll();
      expect(shopService.findAll).toHaveBeenCalledWith();
    });
  });
});
