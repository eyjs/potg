import { Injectable, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { UsersService } from '../../users/users.service';
import { MatchService } from '../../matches/match.service';
import { assertAdmin } from '../utils/admin-guard';
import { BettingNotifyService } from '../notifications/betting-notify.service';

const STEP_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * 베팅 마감 — 2-step UI.
 *
 *   Step 1: BETTING_OPEN 매치 선택
 *   Step 2: 확인 버튼 → MatchService.lockMatch
 *
 * lockMatch가 자동으로 모든 OPEN 마켓을 LOCKED로 전파한다.
 */
@Injectable()
export class AdminBettingLockCommand implements SlashCommand {
  private readonly logger = new Logger(AdminBettingLockCommand.name);

  readonly definition = new SlashCommandBuilder()
    .setName('관리-베팅마감')
    .setDescription('[관리자] 베팅 마감 — 매치 선택 → 확인');

  constructor(
    private readonly users: UsersService,
    private readonly matches: MatchService,
    private readonly notify: BettingNotifyService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await assertAdmin(this.users, interaction.user.id);

    const openMatches = await this.matches.findBettingOpenMatches();
    if (openMatches.length === 0) {
      await interaction.editReply('마감할 BETTING_OPEN 매치가 없습니다.');
      return;
    }

    const matchSelect = new StringSelectMenuBuilder()
      .setCustomId('lock-step1-match')
      .setPlaceholder('마감할 매치를 선택하세요')
      .addOptions(
        openMatches.slice(0, 25).map((m) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(m.title.slice(0, 100))
            .setDescription(
              `${m.createdAt.toISOString().slice(0, 10)} · ${m.teams.length}팀`.slice(
                0,
                100,
              ),
            )
            .setValue(m.id),
        ),
      );
    const cancelBtn = new ButtonBuilder()
      .setCustomId('lock-cancel')
      .setLabel('❌ 취소')
      .setStyle(ButtonStyle.Secondary);

    const message = await interaction.editReply({
      content: '**Step 1/2** — 마감할 BETTING_OPEN 매치를 선택하세요.',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          matchSelect,
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

        if (step1.customId === 'lock-cancel') {
          await step1.update({ content: '❌ 취소되었습니다.', components: [] });
          return;
        }
        if (step1.componentType !== ComponentType.StringSelect) continue;

        const matchId = step1.values[0];
        const match = openMatches.find((m) => m.id === matchId);
        if (!match) {
          await step1.update({
            content: '선택한 매치를 찾을 수 없습니다.',
            components: [],
          });
          return;
        }

        // ===== Step 2: 확인 =====
        const confirmBtn = new ButtonBuilder()
          .setCustomId('lock-confirm')
          .setLabel('🔒 마감 진행')
          .setStyle(ButtonStyle.Danger);
        const backBtn = new ButtonBuilder()
          .setCustomId('lock-back')
          .setLabel('← 이전')
          .setStyle(ButtonStyle.Secondary);

        const confirmEmbed = new EmbedBuilder()
          .setTitle('🔒 베팅 마감 확인')
          .setColor(0xf99e1a)
          .addFields(
            { name: '매치', value: match.title, inline: false },
            {
              name: '팀',
              value: match.teams.map((t) => t.name).join(', '),
              inline: false,
            },
          )
          .setDescription(
            '진행 시 이 매치의 모든 OPEN 마켓이 즉시 LOCKED 상태로 전환되며 ' +
              '더 이상 베팅을 받지 않습니다. 이후 `/관리-정산`으로 정산을 진행하세요.',
          );

        await step1.update({
          content: '**Step 2/2** — 마감 확인',
          embeds: [confirmEmbed],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              confirmBtn,
              backBtn,
              cancelBtn,
            ),
          ],
        });

        const step2 = await message.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: STEP_TIMEOUT_MS,
        });

        if (step2.customId === 'lock-cancel') {
          await step2.update({
            content: '❌ 취소되었습니다.',
            embeds: [],
            components: [],
          });
          return;
        }
        if (step2.customId === 'lock-back') {
          await step2.update({
            content: '**Step 1/2** — 마감할 BETTING_OPEN 매치를 선택하세요.',
            embeds: [],
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                matchSelect,
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn),
            ],
          });
          continue;
        }
        if (step2.customId !== 'lock-confirm') continue;

        await step2.deferUpdate();
        try {
          const locked = await this.matches.lockMatch(match.id);
          await this.notify.notifyMarketLocked({
            matchId: locked.id,
            title: locked.title,
          });

          const resultEmbed = new EmbedBuilder()
            .setTitle('🔒 베팅 마감 완료')
            .setColor(0x00ff66)
            .addFields(
              { name: '매치', value: locked.title, inline: false },
              { name: 'Match ID', value: `\`${locked.id}\``, inline: false },
              {
                name: '다음',
                value: '`/관리-정산` 으로 결과 등록 + 정산 진행',
                inline: false,
              },
            )
            .setTimestamp();

          await interaction.editReply({
            content: '',
            embeds: [resultEmbed],
            components: [],
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류';
          this.logger.warn(`lockMatch failed: ${msg}`);
          await interaction.editReply({
            content: `❌ 마감 실패: ${msg}`,
            embeds: [],
            components: [],
          });
        }
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류';
        this.logger.warn(`lock flow ended: ${msg}`);
        try {
          await interaction.editReply({
            content: '⏱️ 시간이 초과되어 취소되었습니다.',
            embeds: [],
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
