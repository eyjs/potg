import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ShopProduct, ProductStatus } from './entities/shop-product.entity';
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

      // Check user points (ClanMember)
      const clanMember = await manager.findOne(ClanMember, {
        where: { userId, clanId: product.clanId },
      });
      if (!clanMember) throw new BadRequestException('User not in clan');

      const totalPrice = product.price * quantity;
      if (clanMember.totalPoints < totalPrice)
        throw new BadRequestException('Insufficient points');

      // Deduct points
      clanMember.totalPoints -= totalPrice;
      await manager.save(clanMember);

      // Decrease stock
      product.stock -= quantity;
      product.totalSold += quantity;
      await manager.save(product);

      // Create purchase record
      const purchase = manager.create(ShopPurchase, {
        productId,
        userId,
        clanId: product.clanId,
        quantity,
        totalPrice,
        status: PurchaseStatus.APPROVED, // Auto-approve for now, can be PENDING
      });

      return manager.save(purchase);
    });
  }
}
