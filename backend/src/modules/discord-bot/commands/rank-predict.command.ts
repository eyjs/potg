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
import { BettingService } from '../../betting/betting.service';
import { BettingMarketType } from '../../betting/entities/betting-market.entity';
import { MatchService } from '../../matches/match.service';
import { LedgerService } from '../../ledger/ledger.service';

const STEP_TIMEOUT_MS = 15 * 60 * 1000;
const MODAL_TIMEOUT_MS = 5 * 60 * 1000;
const RANK_OPTIONS = ['1', '2', '3', '4'] as const;

/**
 * 순위 예측 — 3-step UI.
 *
 *   Step 1: RANK 마켓 선택 (StringSelectMenu)
 *   Step 2: 등수 선택 (1~4, StringSelectMenu, ← 이전 가능)
 *   Step 3: 금액 입력 (Modal)
 *   완료: 베팅 카드 임베드
 */
@Injectable()
export class RankPredictCommand implements SlashCommand {
  private readonly logger = new Logger(RankPredictCommand.name);

  readonly definition = new SlashCommandBuilder()
    .setName('순위예측')
    .setDescription('등수(1~4) 예측 — 마켓 → 등수 → 금액');

  constructor(
    private readonly members: DiscordMemberService,
    private readonly betting: BettingService,
    private readonly matches: MatchService,
    private readonly ledger: LedgerService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { user } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });

    const markets = await this.betting.findOpenMarkets(25, {
      type: BettingMarketType.RANK,
    });
    if (markets.length === 0) {
      await interaction.editReply('현재 진행 중인 RANK 베팅이 없습니다.');
      return;
    }

    // 마켓 → Match 사전 로드.
    const matchesById = new Map<
      string,
      Awaited<ReturnType<MatchService['findOneWithTeams']>>
    >();
    for (const m of markets) {
      const match = await this.matches.findOneWithTeams(m.matchId);
      matchesById.set(m.id, match);
    }

    const marketSelect = new StringSelectMenuBuilder()
      .setCustomId('rank-step1-market')
      .setPlaceholder('순위 예측할 마켓을 선택하세요')
      .addOptions(
        markets.slice(0, 25).map((m) => {
          const match = matchesById.get(m.id);
          return new StringSelectMenuOptionBuilder()
            .setLabel(match?.title.slice(0, 100) ?? m.id)
            .setDescription(
              `풀 ${m.totalPool}P · ${match?.teams.length ?? 0}팀`.slice(
                0,
                100,
              ),
            )
            .setValue(m.id);
        }),
      );
    const cancelBtn = new ButtonBuilder()
      .setCustomId('rank-cancel')
      .setLabel('❌ 취소')
      .setStyle(ButtonStyle.Secondary);

    const balance = await this.ledger.getBalance(user.id);
    const message = await interaction.editReply({
      content: `**Step 1/3** — RANK 마켓을 선택하세요. (잔액: ${balance.toString()} P)`,
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          marketSelect,
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn),
      ],
    });

    while (true) {
      try {
        const step1 = await message.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: STEP_TIMEOUT_MS,
        });

        if (step1.customId === 'rank-cancel') {
          await step1.update({ content: '❌ 취소되었습니다.', components: [] });
          return;
        }
        if (step1.componentType !== ComponentType.StringSelect) continue;

        const market = markets.find((m) => m.id === step1.values[0]);
        const match = market ? matchesById.get(market.id) : undefined;
        if (!market || !match) {
          await step1.update({
            content: '선택한 마켓을 찾을 수 없습니다.',
            components: [],
          });
          return;
        }

        // ===== Step 2: 등수 선택 =====
        const rankSelect = new StringSelectMenuBuilder()
          .setCustomId('rank-step2-rank')
          .setPlaceholder('예측할 등수를 선택하세요')
          .addOptions(
            RANK_OPTIONS.map((r) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${r}등`)
                .setValue(r),
            ),
          );
        const backBtn = new ButtonBuilder()
          .setCustomId('rank-back')
          .setLabel('← 이전')
          .setStyle(ButtonStyle.Secondary);

        await step1.update({
          content: `**Step 2/3** — 매치: **${match.title}** · 몇 등 예측?`,
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              rankSelect,
            ),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              backBtn,
              cancelBtn,
            ),
          ],
        });

        const step2 = await message.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: STEP_TIMEOUT_MS,
        });

        if (step2.customId === 'rank-cancel') {
          await step2.update({ content: '❌ 취소되었습니다.', components: [] });
          return;
        }
        if (step2.customId === 'rank-back') {
          await step2.update({
            content: `**Step 1/3** — RANK 마켓을 선택하세요. (잔액: ${(await this.ledger.getBalance(user.id)).toString()} P)`,
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                marketSelect,
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn),
            ],
          });
          continue;
        }
        if (step2.componentType !== ComponentType.StringSelect) continue;
        const rank = step2.values[0];

        // ===== Step 3: 금액 Modal =====
        const currentBalance = await this.ledger.getBalance(user.id);
        const modal = new ModalBuilder()
          .setCustomId(`rank-amount-${Date.now()}`)
          .setTitle(`${rank}등 예측 금액`);
        const amountInput = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(`금액 (P) — 잔액 ${currentBalance.toString()} P`)
          .setPlaceholder('100')
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(10)
          .setRequired(true);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput),
        );

        await step2.showModal(modal);

        let submit;
        try {
          submit = await step2.awaitModalSubmit({
            filter: (i) =>
              i.user.id === interaction.user.id &&
              i.customId === modal.data.custom_id,
            time: MODAL_TIMEOUT_MS,
          });
        } catch {
          await interaction.editReply({
            content: '⏱️ 금액 입력 시간이 초과되어 취소되었습니다.',
            components: [],
          });
          return;
        }

        const rawAmount = submit.fields.getTextInputValue('amount').trim();
        const amount = Number(rawAmount);
        if (!Number.isInteger(amount) || amount <= 0) {
          await submit.reply({
            content: `❌ 잘못된 금액입니다: "${rawAmount}". 1 이상 정수만 가능.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await submit.deferUpdate();
        try {
          const stake = await this.betting.placeStake(market.id, user.id, {
            side: rank,
            amount,
          });
          const newBalance = await this.ledger.getBalance(user.id);

          const embed = new EmbedBuilder()
            .setTitle('🎟️ 순위 예측 완료')
            .setColor(0x00ff66)
            .addFields(
              { name: '마켓', value: match.title, inline: false },
              { name: '예측', value: `${rank}등`, inline: true },
              { name: '베팅', value: `${amount} P`, inline: true },
              {
                name: '잔액',
                value: `${currentBalance.toString()} → ${newBalance.toString()} P`,
                inline: false,
              },
              {
                name: '누적 stake (이 마켓 · 이 등수)',
                value: `${stake.stake} P`,
                inline: false,
              },
              { name: '티켓', value: `\`${stake.id}\``, inline: false },
            )
            .setTimestamp();

          await interaction.editReply({
            content: '',
            embeds: [embed],
            components: [],
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류';
          this.logger.warn(`placeStake (RANK) failed: ${msg}`);
          await interaction.editReply({
            content: `❌ 베팅 실패: ${msg}`,
            components: [],
          });
        }
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류';
        this.logger.warn(`rank flow ended: ${msg}`);
        try {
          await interaction.editReply({
            content: '⏱️ 시간이 초과되어 취소되었습니다.',
            components: [],
          });
        } catch {
          // 이미 응답 닫힘
        }
        return;
      }
    }
  }
}
