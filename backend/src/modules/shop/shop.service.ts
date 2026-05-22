import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ShopProduct,
  ProductStatus,
  ProductCategory,
} from './entities/shop-product.entity';
import {
  MarketOrder,
  MarketOrderStatus,
} from './entities/market-order.entity';
import { ShopCoupon } from './entities/shop-coupon.entity';
import {
  ProfileItem,
  ProfileItemCategory,
} from './entities/profile-item.entity';
import { MemberItem } from './entities/member-item.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { CreateProductDto } from './dto/shop.dto';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';

/**
 * 즉시차감 마켓 서비스.
 *
 * purchase() 흐름 (한 트랜잭션):
 *   1) 상품 활성/재고/구매한도 검증
 *   2) 재고 원자적 차감 (UPDATE shop_products SET stock = stock - q WHERE id = ? AND stock >= q)
 *   3) LedgerService.burn(userId, totalPrice) — 사용자 → SINK
 *   4) MarketOrder 생성 (COMPLETED)
 *   5) VOUCHER 카테고리면 ShopCoupon FIFO 할당
 *
 * cancel(): mint 환불 + 재고 복구
 * markDelivered(): 관리자 액션 (상태만 변경)
 *
 * ClanMember.totalPoints / PointLog는 더 이상 사용하지 않는다.
 * 프로필 아이템(purchaseProfileItem)은 ClanMember 기반 레거시 그대로 유지 (Phase 5 정리).
 */
@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @InjectRepository(ShopProduct)
    private productsRepository: Repository<ShopProduct>,
    @InjectRepository(MarketOrder)
    private ordersRepository: Repository<MarketOrder>,
    @InjectRepository(ShopCoupon)
    private couponsRepository: Repository<ShopCoupon>,
    @InjectRepository(ProfileItem)
    private profileItemRepo: Repository<ProfileItem>,
    @InjectRepository(MemberItem)
    private memberItemRepo: Repository<MemberItem>,
    @InjectRepository(ClanMember)
    private clanMemberRepo: Repository<ClanMember>,
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  // ==================== 상품 ====================

  async createProduct(dto: CreateProductDto, clanId: string) {
    const product = this.productsRepository.create({
      ...dto,
      clanId,
    });
    return this.productsRepository.save(product);
  }

  async findAll(clanId?: string) {
    if (clanId) {
      return this.productsRepository.find({ where: { clanId } });
    }
    return this.productsRepository.find();
  }

  // ==================== 마켓 주문 ====================

  /**
   * 즉시차감 구매.
   * 마켓 게이트 검증은 컨트롤러의 MarketGateGuard가 수행한다.
   */
  async purchase(userId: string, productId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be a positive integer');
    }

    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(ShopProduct, {
        where: { id: productId },
      });
      if (!product) throw new NotFoundException('Product not found');
      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException('Product not active');
      }
      if (product.stock < quantity) {
        throw new BadRequestException('Out of stock');
      }

      // 구매한도 검증 (사용자별 누적, CANCELLED 제외).
      if (product.purchaseLimit > 0) {
        const row = await manager
          .createQueryBuilder(MarketOrder, 'o')
          .where('o.productId = :productId', { productId })
          .andWhere('o.buyerId = :userId', { userId })
          .andWhere('o.status != :cancelled', {
            cancelled: MarketOrderStatus.CANCELLED,
          })
          .select('COALESCE(SUM(o.quantity), 0)', 'total')
          .getRawOne<{ total: string }>();
        const current = parseInt(row?.total ?? '0', 10);
        if (current + quantity > product.purchaseLimit) {
          throw new BadRequestException(
            `Purchase limit exceeded. Max ${product.purchaseLimit} per person (you have ${current})`,
          );
        }
      }

      // 재고 원자적 차감.
      const result = await manager
        .createQueryBuilder()
        .update(ShopProduct)
        .set({
          stock: () => `stock - ${quantity}`,
          totalSold: () => `total_sold + ${quantity}`,
        })
        .where('id = :id AND stock >= :q', { id: productId, q: quantity })
        .execute();

      if (!result.affected || result.affected === 0) {
        throw new BadRequestException('Out of stock');
      }

      const unitPrice = BigInt(product.price);
      const totalPrice = unitPrice * BigInt(quantity);

      // 사용자 → SINK 소각.
      await this.ledger.burn(
        userId,
        totalPrice,
        POINT_TX_REASON.MARKET_BUY,
        {
          refType: 'MarketOrder',
          memo: `product=${product.id} qty=${quantity}`,
          manager,
        },
      );

      // 주문 생성.
      const order = manager.create(MarketOrder, {
        productId: product.id,
        buyerId: userId,
        quantity,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString(),
        status: MarketOrderStatus.COMPLETED,
      });
      const saved = await manager.save(order);

      // VOUCHER 카테고리 자동 쿠폰 할당.
      if (product.category === ProductCategory.VOUCHER) {
        const coupons = await manager.find(ShopCoupon, {
          where: { productId: product.id, isUsed: false },
          take: quantity,
          order: { createdAt: 'ASC' },
        });
        if (coupons.length < quantity) {
          throw new BadRequestException('Not enough coupons available');
        }
        for (const coupon of coupons) {
          coupon.isUsed = true;
          coupon.assignedToUserId = userId;
          await manager.save(coupon);
        }
      }

      // 재고 0 도달 시 상태 갱신.
      const updatedProduct = await manager.findOne(ShopProduct, {
        where: { id: product.id },
      });
      if (updatedProduct && updatedProduct.stock <= 0) {
        updatedProduct.status = ProductStatus.OUT_OF_STOCK;
        await manager.save(updatedProduct);
      }

      return saved;
    });
  }

  async markDelivered(orderId: string, adminNote?: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(MarketOrder, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== MarketOrderStatus.COMPLETED) {
        throw new BadRequestException(
          `Cannot mark delivered: status=${order.status}`,
        );
      }
      order.status = MarketOrderStatus.DELIVERED;
      order.deliveredAt = new Date();
      if (adminNote) order.adminNote = adminNote;
      return manager.save(order);
    });
  }

  async cancelOrder(orderId: string, adminNote?: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(MarketOrder, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === MarketOrderStatus.CANCELLED) {
        throw new BadRequestException('Already cancelled');
      }
      if (order.status === MarketOrderStatus.DELIVERED) {
        throw new BadRequestException('Cannot cancel a delivered order');
      }

      // 환불 (SINK → 구매자).
      const refundAmount = BigInt(order.totalPrice);
      if (refundAmount > 0n) {
        await this.ledger.mint(
          order.buyerId,
          refundAmount,
          POINT_TX_REASON.MARKET_REFUND,
          {
            refType: 'MarketOrder',
            refId: order.id,
            memo: 'cancel',
            manager,
          },
        );
      }

      // 재고 복구.
      await manager
        .createQueryBuilder()
        .update(ShopProduct)
        .set({
          stock: () => `stock + ${order.quantity}`,
          totalSold: () => `total_sold - ${order.quantity}`,
        })
        .where('id = :id', { id: order.productId })
        .execute();

      // VOUCHER 할당 쿠폰 해제 (구매자에게 할당된 미사용 쿠폰 일부 반환).
      const product = await manager.findOne(ShopProduct, {
        where: { id: order.productId },
      });
      if (product && product.category === ProductCategory.VOUCHER) {
        const coupons = await manager.find(ShopCoupon, {
          where: { productId: order.productId, assignedToUserId: order.buyerId, isUsed: true },
          take: order.quantity,
        });
        for (const coupon of coupons) {
          coupon.isUsed = false;
          coupon.assignedToUserId = null as unknown as string;
          await manager.save(coupon);
        }
      }

      order.status = MarketOrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      if (adminNote) order.adminNote = adminNote;
      return manager.save(order);
    });
  }

  async findOrdersByUser(userId: string) {
    return this.ordersRepository.find({
      where: { buyerId: userId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllOrders() {
    return this.ordersRepository.find({
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMyCoupons(userId: string) {
    return this.couponsRepository.find({
      where: { assignedToUserId: userId },
      relations: ['product'],
    });
  }

  // ==================== 프로필 아이템 (레거시 — Phase 5에서 재검토) ====================

  async getProfileItems(category?: ProfileItemCategory): Promise<ProfileItem[]> {
    const where: { isActive: boolean; category?: ProfileItemCategory } = {
      isActive: true,
    };
    if (category) where.category = category;
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

  /**
   * 프로필 아이템 구매 — 사용자 잔액(LedgerService)에서 소각.
   * ClanMember 의존은 memberId 식별용으로만 유지.
   */
  async purchaseProfileItem(
    memberId: string,
    clanId: string,
    itemId: string,
  ): Promise<MemberItem> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(ProfileItem, {
        where: { id: itemId, isActive: true },
      });
      if (!item) throw new NotFoundException('아이템을 찾을 수 없습니다.');

      const existing = await manager.findOne(MemberItem, {
        where: { memberId, itemId },
      });
      if (existing) throw new BadRequestException('이미 보유한 아이템입니다.');

      const clanMember = await manager.findOne(ClanMember, {
        where: { id: memberId, clanId },
      });
      if (!clanMember) throw new NotFoundException('클랜 멤버를 찾을 수 없습니다.');

      await this.ledger.burn(
        clanMember.userId,
        BigInt(item.price),
        POINT_TX_REASON.MARKET_BUY,
        {
          refType: 'ProfileItem',
          refId: item.id,
          memo: 'profile-item',
          manager,
        },
      );

      const memberItem = manager.create(MemberItem, {
        memberId,
        itemId,
        purchasedAt: new Date(),
      });
      return manager.save(memberItem);
    });
  }
}
