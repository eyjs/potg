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
import { MatchService } from '../../matches/match.service';
import { LedgerService } from '../../ledger/ledger.service';
import type { Team } from '../../matches/entities/team.entity';

const STEP_TIMEOUT_MS = 15 * 60 * 1000;
const MODAL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 베팅 — 3-step UI.
 *
 *   Step 1: OPEN 마켓 선택 (StringSelectMenu)
 *   Step 2: 팀 선택 (StringSelectMenu, ← 이전 가능)
 *   Step 3: 금액 입력 (Modal)
 *   완료: 베팅 카드 임베드
 *
 * 응답은 모두 ephemeral (호출자만 보임). 각 단계 15분 타임아웃, modal은 5분.
 * 호출자만 인터랙션 허용 (filter).
 */
@Injectable()
export class BetCommand implements SlashCommand {
  private readonly logger = new Logger(BetCommand.name);

  readonly definition = new SlashCommandBuilder()
    .setName('베팅')
    .setDescription('승패 베팅 — 마켓 선택 → 팀 선택 → 금액 입력');

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

    const markets = await this.betting.findOpenMarkets();
    if (markets.length === 0) {
      await interaction.editReply('현재 진행 중인 베팅이 없습니다.');
      return;
    }

    // ===== Step 1: 마켓 선택 =====
    // 마켓의 Match.title 표시 위해 사전 로드.
    const matchesById = new Map<
      string,
      Awaited<ReturnType<MatchService['findOneWithTeams']>>
    >();
    for (const m of markets) {
      const match = await this.matches.findOneWithTeams(m.matchId);
      matchesById.set(m.id, match);
    }

    const marketSelect = new StringSelectMenuBuilder()
      .setCustomId('bet-step1-market')
      .setPlaceholder('베팅할 마켓을 선택하세요')
      .addOptions(
        markets.slice(0, 25).map((m) => {
          const match = matchesById.get(m.id);
          return new StringSelectMenuOptionBuilder()
            .setLabel(match?.title.slice(0, 100) ?? m.id)
            .setDescription(
              `${m.type} · 풀 ${m.totalPool}P · ${match?.teams.length ?? 0}팀`.slice(
                0,
                100,
              ),
            )
            .setValue(m.id);
        }),
      );
    const cancelBtn = new ButtonBuilder()
      .setCustomId('bet-cancel')
      .setLabel('❌ 취소')
      .setStyle(ButtonStyle.Secondary);

    const message = await interaction.editReply({
      content: `**Step 1/3** — 베팅할 마켓을 선택하세요. (현재 잔액: ${(await this.ledger.getBalance(user.id)).toString()} P)`,
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          marketSelect,
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn),
      ],
    });

    let selectedMarketId: string | null = null;
    let selectedTeamId: string | null = null;

    // ===== Step 1 + Step 2 loop (← 이전 지원) =====
    while (true) {
      try {
        const step1 = await message.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: STEP_TIMEOUT_MS,
        });

        if (step1.customId === 'bet-cancel') {
          await step1.update({ content: '❌ 취소되었습니다.', components: [] });
          return;
        }
        if (step1.componentType !== ComponentType.StringSelect) continue;
        selectedMarketId = step1.values[0];
        const market = markets.find((m) => m.id === selectedMarketId);
        if (!market) {
          await step1.update({
            content: '선택한 마켓을 찾을 수 없습니다.',
            components: [],
          });
          return;
        }
        const match = matchesById.get(market.id);
        if (!match) {
          await step1.update({
            content: '매치 정보를 불러올 수 없습니다.',
            components: [],
          });
          return;
        }

        // ===== Step 2: 팀 선택 =====
        const teamSelect = new StringSelectMenuBuilder()
          .setCustomId('bet-step2-team')
          .setPlaceholder('베팅할 팀을 선택하세요')
          .addOptions(
            match.teams
              .slice(0, 25)
              .map((t: Team) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(t.name.slice(0, 100))
                  .setValue(t.id),
              ),
          );
        const backBtn = new ButtonBuilder()
          .setCustomId('bet-back')
          .setLabel('← 이전')
          .setStyle(ButtonStyle.Secondary);

        await step1.update({
          content: `**Step 2/3** — 마켓: **${match.title}** · 어느 팀에 베팅?`,
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              teamSelect,
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

        if (step2.customId === 'bet-cancel') {
          await step2.update({ content: '❌ 취소되었습니다.', components: [] });
          return;
        }
        if (step2.customId === 'bet-back') {
          // Step 1 으로 되돌리기 — 마켓 select 재표시.
          await step2.update({
            content: `**Step 1/3** — 베팅할 마켓을 선택하세요. (잔액: ${(await this.ledger.getBalance(user.id)).toString()} P)`,
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                marketSelect,
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn),
            ],
          });
          continue; // while loop 처음으로
        }
        if (step2.componentType !== ComponentType.StringSelect) continue;
        selectedTeamId = step2.values[0];
        const team = match.teams.find((t) => t.id === selectedTeamId);
        if (!team) {
          await step2.update({
            content: '선택한 팀을 찾을 수 없습니다.',
            components: [],
          });
          return;
        }

        // ===== Step 3: 금액 Modal =====
        const balance = await this.ledger.getBalance(user.id);
        const modal = new ModalBuilder()
          .setCustomId(`bet-amount-${Date.now()}`)
          .setTitle(`${team.name} 베팅 금액`);
        const amountInput = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(`금액 (P) — 잔액 ${balance.toString()} P`)
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
            content: `❌ 잘못된 금액입니다: "${rawAmount}". 1 이상의 정수만 입력 가능.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // placeStake 실행.
        await submit.deferUpdate();
        try {
          const stake = await this.betting.placeStake(market.id, user.id, {
            side: team.id,
            amount,
          });
          const newBalance = await this.ledger.getBalance(user.id);

          const embed = new EmbedBuilder()
            .setTitle('🎟️ 베팅 완료')
            .setColor(0x00ff66)
            .addFields(
              { name: '마켓', value: match.title, inline: false },
              { name: '선택', value: team.name, inline: true },
              { name: '베팅', value: `${amount} P`, inline: true },
              {
                name: '잔액',
                value: `${balance.toString()} → ${newBalance.toString()} P`,
                inline: false,
              },
              {
                name: '누적 stake (이 마켓 · 이 팀)',
                value: `${stake.stake} P`,
                inline: false,
              },
              { name: '티켓', value: `\`${stake.id}\``, inline: false },
            )
            .setFooter({ text: '정산 시 자동 DM 알림 (구현 예정)' })
            .setTimestamp();

          await interaction.editReply({
            content: '',
            embeds: [embed],
            components: [],
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류';
          this.logger.warn(`placeStake failed: ${msg}`);
          await interaction.editReply({
            content: `❌ 베팅 실패: ${msg}`,
            components: [],
          });
        }
        return; // 완료
      } catch (err) {
        // 컬렉터 타임아웃 또는 기타.
        const msg = err instanceof Error ? err.message : '알 수 없는 오류';
        this.logger.warn(`bet flow ended: ${msg}`);
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
