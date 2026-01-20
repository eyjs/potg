import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ShopProduct,
  ProductStatus,
  ProductCategory,
} from './entities/shop-product.entity';
import { ShopPurchase, PurchaseStatus } from './entities/shop-purchase.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { CreateProductDto } from './dto/shop.dto';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(ShopProduct)
    private productsRepository: Repository<ShopProduct>,
    @InjectRepository(ShopPurchase)
    private purchasesRepository: Repository<ShopPurchase>,
    @InjectRepository(ShopCoupon)
    private couponsRepository: Repository<ShopCoupon>,
    private dataSource: DataSource,
  ) {}

  async createProduct(createProductDto: CreateProductDto, clanId: string) {
    const product = this.productsRepository.create({
      ...createProductDto,
      clanId,
    });
    return this.productsRepository.save(product);
  }

  async findAll(clanId: string) {
    return this.productsRepository.find({ where: { clanId } });
  }

  async purchase(userId: string, productId: string, quantity: number) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(ShopProduct, {
        where: { id: productId },
      });
      if (!product) throw new BadRequestException('Product not found');
      if (product.status !== ProductStatus.ACTIVE)
        throw new BadRequestException('Product not active');
      if (product.stock < quantity)
        throw new BadRequestException('Out of stock');

      // Check purchase limit (docs/shop/PROCESS.md:66, 117-129)
      if (product.purchaseLimit > 0) {
        const result = await manager
          .createQueryBuilder(ShopPurchase, 'purchase')
          .where('purchase.productId = :productId', { productId })
          .andWhere('purchase.userId = :userId', { userId })
          .andWhere('purchase.status = :status', {
            status: PurchaseStatus.APPROVED,
          })
          .select('COALESCE(SUM(purchase.quantity), 0)', 'totalQuantity')
          .getRawOne<{ totalQuantity: string }>();

        const currentPurchased = parseInt(result?.totalQuantity || '0', 10);
        const totalPurchased = currentPurchased + quantity;

        if (totalPurchased > product.purchaseLimit) {
          throw new BadRequestException(
            `Purchase limit exceeded. Max ${product.purchaseLimit} per person (you have ${currentPurchased})`,
          );
        }
      }

      // Check user points (ClanMember)
      const clanMember = await manager.findOne(ClanMember, {
        where: { userId, clanId: product.clanId },
      });
      if (!clanMember) throw new BadRequestException('User not in clan');

      const totalPrice = product.price * quantity;
      if (clanMember.totalPoints < totalPrice)
        throw new BadRequestException('Insufficient points');

      // Create purchase request (PENDING - 승인 대기)
      const purchase = manager.create(ShopPurchase, {
        productId,
        userId,
        clanId: product.clanId,
        quantity,
        totalPrice,
        status: PurchaseStatus.PENDING, // 마스터 승인 필요
      });

      return manager.save(purchase);
    });
  }

  async approvePurchase(purchaseId: string, adminNote?: string) {
    return this.dataSource.transaction(async (manager) => {
      const purchase = await manager.findOne(ShopPurchase, {
        where: { id: purchaseId },
        relations: ['product'],
      });
      if (!purchase) throw new BadRequestException('Purchase not found');
      if (purchase.status !== PurchaseStatus.PENDING)
        throw new BadRequestException('Purchase already processed');

      const product = purchase.product;

      // Check stock again
      if (product.stock < purchase.quantity)
        throw new BadRequestException('Out of stock');

      // Check user points
      const clanMember = await manager.findOne(ClanMember, {
        where: { userId: purchase.userId, clanId: purchase.clanId },
      });
      if (!clanMember) throw new BadRequestException('User not in clan');
      if (clanMember.totalPoints < purchase.totalPrice)
        throw new BadRequestException('Insufficient points');

      // Deduct points
      clanMember.totalPoints -= purchase.totalPrice;
      await manager.save(clanMember);

      // Decrease stock
      product.stock -= purchase.quantity;
      product.totalSold += purchase.quantity;
      await manager.save(product);

      // Assign coupons if VOUCHER type
      if (product.category === ProductCategory.VOUCHER) {
        const coupons = await manager.find(ShopCoupon, {
          where: { productId: product.id, isUsed: false },
          take: purchase.quantity,
          order: { createdAt: 'ASC' }, // FIFO
        });

        if (coupons.length < purchase.quantity) {
          throw new BadRequestException('Not enough coupons available');
        }

        for (const coupon of coupons) {
          coupon.isUsed = true;
          coupon.assignedToUserId = purchase.userId;
          await manager.save(coupon);
        }
      }

      // Update purchase status
      purchase.status = PurchaseStatus.APPROVED;
      purchase.adminNote = adminNote || '';
      purchase.approvedAt = new Date();
      await manager.save(purchase);

      return purchase;
    });
  }

  async rejectPurchase(purchaseId: string, adminNote?: string) {
    return this.dataSource.transaction(async (manager) => {
      const purchase = await manager.findOne(ShopPurchase, {
        where: { id: purchaseId },
      });
      if (!purchase) throw new BadRequestException('Purchase not found');
      if (purchase.status !== PurchaseStatus.PENDING)
        throw new BadRequestException('Purchase already processed');

      purchase.status = PurchaseStatus.REJECTED;
      purchase.adminNote = adminNote || '';
      await manager.save(purchase);

      return purchase;
    });
  }

  async getMyCoupons(userId: string) {
    return this.couponsRepository.find({
      where: { assignedToUserId: userId },
      relations: ['product'],
    });
  }
}
