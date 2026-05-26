import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Repository } from 'typeorm';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { ShopService } from '../../shop/shop.service';
import { LedgerService } from '../../ledger/ledger.service';
import {
  ProductStatus,
  ShopProduct,
} from '../../shop/entities/shop-product.entity';
import { MarketGateService } from '../../../common/services/market-gate.service';

@Injectable()
export class BuyCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('구매')
    .setDescription('상품을 구매합니다 (마켓 게이트 통과 필요)')
    .addStringOption((o) =>
      o.setName('상품').setDescription('상품 ID').setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName('수량')
        .setDescription('구매 수량 (기본 1)')
        .setMinValue(1)
        .setRequired(false),
    );

  constructor(
    private readonly members: DiscordMemberService,
    private readonly shop: ShopService,
    private readonly ledger: LedgerService,
    private readonly gate: MarketGateService,
    @InjectRepository(ShopProduct)
    private readonly productRepo: Repository<ShopProduct>,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const productId = interaction.options.getString('상품', true);
    const quantity = interaction.options.getInteger('수량') ?? 1;

    const { user } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });

    await this.gate.enforce(user.id, user.marketGatePassed);

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    if (product.status !== ProductStatus.ACTIVE) {
      await interaction.editReply('현재 판매중이 아닌 상품입니다.');
      return;
    }

    const order = await this.shop.purchase(user.id, product.id, quantity);
    const balance = await this.ledger.getBalance(user.id);

    await interaction.editReply(
      [
        `✅ **${product.name}** \`x${quantity}\` 구매 완료`,
        `결제: ${order.totalPrice} P`,
        `주문번호: \`${order.id}\``,
        `현재 잔액: ${balance.toString()} P`,
        '관리자가 실물 전달 후 알림드릴 예정입니다.',
      ].join('\n'),
    );
  }
}
