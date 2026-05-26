import { Injectable, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { ShopService } from '../../shop/shop.service';
import { LedgerService } from '../../ledger/ledger.service';
import { MarketGateService } from '../../../common/services/market-gate.service';

const STEP_TIMEOUT_MS = 15 * 60 * 1000;
const MODAL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 상품 구매 — 2-step UI.
 *
 *   Step 1: 활성 상품 선택 (StringSelectMenu)
 *   Step 2: 수량 입력 (Modal)
 *   완료: 주문 카드 임베드
 *
 * 마켓 게이트 미통과 시 Step 0 에서 거부 (기존 정책 유지).
 */
@Injectable()
export class BuyCommand implements SlashCommand {
  private readonly logger = new Logger(BuyCommand.name);

  readonly definition = new SlashCommandBuilder()
    .setName('구매')
    .setDescription('상품 구매 — 상품 선택 → 수량 입력');

  constructor(
    private readonly members: DiscordMemberService,
    private readonly shop: ShopService,
    private readonly ledger: LedgerService,
    private readonly gate: MarketGateService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { user } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });

    await this.gate.enforce(user.id, user.marketGatePassed);

    const products = await this.shop.findActiveProducts();
    if (products.length === 0) {
      await interaction.editReply('현재 판매 중인 상품이 없습니다.');
      return;
    }

    const balance = await this.ledger.getBalance(user.id);
    const productSelect = new StringSelectMenuBuilder()
      .setCustomId('buy-step1-product')
      .setPlaceholder('구매할 상품을 선택하세요')
      .addOptions(
        products.slice(0, 25).map((p) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(p.name.slice(0, 100))
            .setDescription(
              `${p.price} P · 재고 ${p.stock}${
                p.purchaseLimit > 0 ? ` · 한도 ${p.purchaseLimit}` : ''
              }`.slice(0, 100),
            )
            .setValue(p.id),
        ),
      );
    const cancelBtn = new ButtonBuilder()
      .setCustomId('buy-cancel')
      .setLabel('❌ 취소')
      .setStyle(ButtonStyle.Secondary);

    const message = await interaction.editReply({
      content: `**Step 1/2** — 구매할 상품을 선택하세요. (잔액: ${balance.toString()} P)`,
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          productSelect,
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn),
      ],
    });

    try {
      const step1 = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: STEP_TIMEOUT_MS,
      });

      if (step1.customId === 'buy-cancel') {
        await step1.update({ content: '❌ 취소되었습니다.', components: [] });
        return;
      }
      if (step1.componentType !== ComponentType.StringSelect) return;

      const productId = step1.values[0];
      const product = products.find((p) => p.id === productId);
      if (!product) {
        await step1.update({
          content: '선택한 상품을 찾을 수 없습니다.',
          components: [],
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`buy-qty-${Date.now()}`)
        .setTitle(`${product.name.slice(0, 40)} 구매`);
      const qtyInput = new TextInputBuilder()
        .setCustomId('qty')
        .setLabel(
          `수량 (단가 ${product.price}P · 재고 ${product.stock})`.slice(0, 45),
        )
        .setPlaceholder('1')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(6)
        .setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(qtyInput),
      );

      await step1.showModal(modal);

      let submit;
      try {
        submit = await step1.awaitModalSubmit({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            i.customId === modal.data.custom_id,
          time: MODAL_TIMEOUT_MS,
        });
      } catch {
        await interaction.editReply({
          content: '⏱️ 수량 입력 시간이 초과되어 취소되었습니다.',
          components: [],
        });
        return;
      }

      const rawQty = submit.fields.getTextInputValue('qty').trim();
      const qty = Number(rawQty);
      if (!Number.isInteger(qty) || qty <= 0) {
        await submit.reply({
          content: `❌ 잘못된 수량입니다: "${rawQty}". 1 이상 정수만 가능.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await submit.deferUpdate();
      try {
        const order = await this.shop.purchase(user.id, product.id, qty);
        const newBalance = await this.ledger.getBalance(user.id);

        const embed = new EmbedBuilder()
          .setTitle('🛒 구매 완료')
          .setColor(0x00ff66)
          .addFields(
            { name: '상품', value: product.name, inline: false },
            { name: '수량', value: `${qty} 개`, inline: true },
            { name: '결제', value: `${order.totalPrice} P`, inline: true },
            {
              name: '잔액',
              value: `${balance.toString()} → ${newBalance.toString()} P`,
              inline: false,
            },
            { name: '주문번호', value: `\`${order.id}\``, inline: false },
          )
          .setFooter({ text: '관리자가 실물 전달 후 알림드릴 예정입니다.' })
          .setTimestamp();

        await interaction.editReply({
          content: '',
          embeds: [embed],
          components: [],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류';
        this.logger.warn(`purchase failed: ${msg}`);
        await interaction.editReply({
          content: `❌ 구매 실패: ${msg}`,
          components: [],
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      this.logger.warn(`buy flow ended: ${msg}`);
      try {
        await interaction.editReply({
          content: '⏱️ 시간이 초과되어 취소되었습니다.',
          components: [],
        });
      } catch {
        // 이미 응답 닫힘
      }
    }
  }
}
