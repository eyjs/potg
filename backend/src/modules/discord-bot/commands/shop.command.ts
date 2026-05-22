import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Repository } from 'typeorm';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { LedgerService } from '../../ledger/ledger.service';
import {
  ProductStatus,
  ShopProduct,
} from '../../shop/entities/shop-product.entity';
import { buildProductCard } from '../builders/components-v2.builder';

const PAGE_SIZE = 5;

@Injectable()
export class ShopCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('상점')
    .setDescription('마켓 상품을 열람합니다')
    .addIntegerOption((o) =>
      o
        .setName('페이지')
        .setDescription(`표시할 페이지 (기본 1, 페이지당 ${PAGE_SIZE}개)`)
        .setMinValue(1)
        .setRequired(false),
    );

  constructor(
    private readonly members: DiscordMemberService,
    private readonly ledger: LedgerService,
    @InjectRepository(ShopProduct)
    private readonly productRepo: Repository<ShopProduct>,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const page = interaction.options.getInteger('페이지') ?? 1;
    const skip = (page - 1) * PAGE_SIZE;

    const { user } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });

    const [products, total] = await this.productRepo.findAndCount({
      where: { status: ProductStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      skip,
      take: PAGE_SIZE,
    });

    if (total === 0) {
      await interaction.editReply('현재 판매중인 상품이 없습니다.');
      return;
    }

    if (products.length === 0) {
      await interaction.editReply(
        `해당 페이지에 상품이 없습니다. 총 ${total}개 / 페이지당 ${PAGE_SIZE}개.`,
      );
      return;
    }

    const balance = await this.ledger.getBalance(user.id);
    const cards = products.map((p) =>
      buildProductCard(p, {
        userBalance: balance,
        gatePassed: user.marketGatePassed,
      }),
    );

    await interaction.editReply({
      content: `🛒 **마켓 상점** (페이지 ${page}, 총 ${total}개)\n잔액: \`${balance.toString()} P\``,
      embeds: cards.map((c) => c.embed),
      components: cards.flatMap((c) => c.components),
    });
  }
}
