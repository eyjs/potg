import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ShopProduct,
  ProductStatus,
  ProductCategory,
} from './entities/shop-product.entity';
import { ShopPurchase, PurchaseStatus } from './entities/shop-purchase.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import { ProfileItem, ProfileItemCategory } from './entities/profile-item.entity';
import { MemberItem } from './entities/member-item.entity';
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
    @InjectRepository(ProfileItem)
    private profileItemRepo: Repository<ProfileItem>,
    @InjectRepository(MemberItem)
    private memberItemRepo: Repository<MemberItem>,
    @InjectRepository(ClanMember)
    private clanMemberRepo: Repository<ClanMember>,
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

  // ==================== 프로필 아이템 ====================

  async getProfileItems(category?: ProfileItemCategory): Promise<ProfileItem[]> {
    const where: { isActive: boolean; category?: ProfileItemCategory } = { isActive: true };
    if (category) {
      where.category = category;
    }
    return this.profileItemRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async getProfileItem(itemId: string): Promise<ProfileItem> {
    const item = await this.profileItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('아이템을 찾을 수 없습니다.');
    return item;
  }

  async getMemberItems(memberId: string): Promise<MemberItem[]> {
    return this.memberItemRepo.find({
      where: { memberId },
      relations: ['item'],
    });
  }

  async hasMemberItem(memberId: string, itemId: string): Promise<boolean> {
    const count = await this.memberItemRepo.count({ where: { memberId, itemId } });
    return count > 0;
  }

  async purchaseProfileItem(memberId: string, clanId: string, itemId: string): Promise<MemberItem> {
    return this.dataSource.transaction(async (manager) => {
      // 1. 아이템 조회
      const item = await manager.findOne(ProfileItem, { where: { id: itemId, isActive: true } });
      if (!item) throw new NotFoundException('아이템을 찾을 수 없습니다.');

      // 2. 이미 보유 여부 확인
      const existingItem = await manager.findOne(MemberItem, { where: { memberId, itemId } });
      if (existingItem) throw new BadRequestException('이미 보유한 아이템입니다.');

      // 3. 포인트 확인
      const clanMember = await manager.findOne(ClanMember, { where: { id: memberId, clanId } });
      if (!clanMember) throw new NotFoundException('클랜 멤버를 찾을 수 없습니다.');
      if (clanMember.totalPoints < item.price) {
        throw new BadRequestException('포인트가 부족합니다.');
      }

      // 4. 포인트 차감
      clanMember.totalPoints -= item.price;
      await manager.save(clanMember);

      // 5. 아이템 지급
      const memberItem = manager.create(MemberItem, {
        memberId,
        itemId,
        purchasedAt: new Date(),
      });
      await manager.save(memberItem);

      // 6. 구매 로그 (PointLog)
      // TODO: PointLog에 기록

      return memberItem;
    });
  }
}
