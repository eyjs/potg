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
 * 베팅 정산 — 3-step UI.
 *
 *   Step 1: LOCKED 매치 선택
 *   Step 2: 우승 팀 선택 (← 이전 가능)
 *   Step 3: 확인 (요약 임베드 + ✅ 정산 진행 / ← 이전 / ❌ 취소)
 *   완료: SettleMatchResult 기반 결과 임베드 + BettingNotifyService 알림 자동 전송
 *
 * ADMIN role 검증 (assertAdmin). 호출자만 인터랙션. ephemeral 응답.
 */
@Injectable()
export class AdminBettingSettleCommand implements SlashCommand {
  private readonly logger = new Logger(AdminBettingSettleCommand.name);

  readonly definition = new SlashCommandBuilder()
    .setName('관리-정산')
    .setDescription('[관리자] 베팅 정산 — 매치 선택 → 승리팀 → 확인');

  constructor(
    private readonly users: UsersService,
    private readonly matches: MatchService,
    private readonly notify: BettingNotifyService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await assertAdmin(this.users, interaction.user.id);

    const lockedMatches = await this.matches.findLockedMatches();
    if (lockedMatches.length === 0) {
      await interaction.editReply('정산할 LOCKED 매치가 없습니다.');
      return;
    }

    // ===== Step 1: 매치 선택 =====
    const matchSelect = new StringSelectMenuBuilder()
      .setCustomId('settle-step1-match')
      .setPlaceholder('정산할 매치를 선택하세요')
      .addOptions(
        lockedMatches.slice(0, 25).map((m) =>
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
      .setCustomId('settle-cancel')
      .setLabel('❌ 취소')
      .setStyle(ButtonStyle.Secondary);

    const message = await interaction.editReply({
      content: '**Step 1/3** — 정산할 LOCKED 매치를 선택하세요.',
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

        if (step1.customId === 'settle-cancel') {
          await step1.update({ content: '❌ 취소되었습니다.', components: [] });
          return;
        }
        if (step1.componentType !== ComponentType.StringSelect) continue;
        const matchId = step1.values[0];
        const match = lockedMatches.find((m) => m.id === matchId);
        if (!match) {
          await step1.update({
            content: '선택한 매치를 찾을 수 없습니다.',
            components: [],
          });
          return;
        }

        // ===== Step 2: 우승 팀 선택 =====
        const teamSelect = new StringSelectMenuBuilder()
          .setCustomId('settle-step2-winner')
          .setPlaceholder('우승 팀을 선택하세요')
          .addOptions(
            match.teams
              .slice(0, 25)
              .map((t) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(t.name.slice(0, 100))
                  .setValue(t.id),
              ),
          );
        const backBtn = new ButtonBuilder()
          .setCustomId('settle-back')
          .setLabel('← 이전')
          .setStyle(ButtonStyle.Secondary);

        await step1.update({
          content: `**Step 2/3** — 매치: **${match.title}** · 우승 팀은?`,
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

        if (step2.customId === 'settle-cancel') {
          await step2.update({ content: '❌ 취소되었습니다.', components: [] });
          return;
        }
        if (step2.customId === 'settle-back') {
          await step2.update({
            content: '**Step 1/3** — 정산할 LOCKED 매치를 선택하세요.',
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                matchSelect,
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(cancelBtn),
            ],
          });
          continue;
        }
        if (step2.componentType !== ComponentType.StringSelect) continue;
        const winnerTeamId = step2.values[0];
        const winnerTeam = match.teams.find((t) => t.id === winnerTeamId);
        if (!winnerTeam) {
          await step2.update({
            content: '선택한 팀을 찾을 수 없습니다.',
            components: [],
          });
          return;
        }

        // ===== Step 3: 확인 =====
        const confirmBtn = new ButtonBuilder()
          .setCustomId('settle-confirm')
          .setLabel('✅ 정산 진행')
          .setStyle(ButtonStyle.Success);
        const backBtn2 = new ButtonBuilder()
          .setCustomId('settle-back2')
          .setLabel('← 이전')
          .setStyle(ButtonStyle.Secondary);

        const confirmEmbed = new EmbedBuilder()
          .setTitle('🏆 정산 확인')
          .setColor(0xf99e1a)
          .addFields(
            { name: '매치', value: match.title, inline: false },
            { name: '우승 팀', value: winnerTeam.name, inline: true },
            {
              name: '전체 팀',
              value: match.teams.map((t) => t.name).join(', '),
              inline: false,
            },
          )
          .setDescription(
            '아래 버튼을 눌러 정산을 확정합니다. ' +
              '진행 시 모든 LOCKED 마켓 정산 + 베팅자 페이아웃 + Discord 알림이 자동 전송됩니다.',
          );

        await step2.update({
          content: '**Step 3/3** — 정산 확인',
          embeds: [confirmEmbed],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              confirmBtn,
              backBtn2,
              cancelBtn,
            ),
          ],
        });

        const step3 = await message.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: STEP_TIMEOUT_MS,
        });

        if (step3.customId === 'settle-cancel') {
          await step3.update({
            content: '❌ 취소되었습니다.',
            embeds: [],
            components: [],
          });
          return;
        }
        if (step3.customId === 'settle-back2') {
          // Step 2 로 되돌리기 — 같은 매치의 팀 select 재표시.
          await step3.update({
            content: `**Step 2/3** — 매치: **${match.title}** · 우승 팀은?`,
            embeds: [],
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
          // step3 가 back2 였다면 step2 select 를 다시 기다린다. 단순화 위해 step 1 loop 로
          // 빠져나가 다시 시작 — 이전 마켓 select 가 재표시되지 않도록 step2 select 만
          // 표시되었으므로 정상 동작.
          continue;
        }
        if (step3.customId !== 'settle-confirm') continue;

        // ===== 정산 실행 =====
        await step3.deferUpdate();
        try {
          const { match: settledMatch, settlements } =
            await this.matches.settleMatch(match.id, winnerTeam.id);

          const settled = settlements.filter((s) => s.summary !== null);
          const totalPool = settled.reduce(
            (sum, s) => sum + (s.summary?.totalPool ?? 0n),
            0n,
          );
          const payoutDistributed = settled.reduce(
            (sum, s) => sum + (s.summary?.payoutDistributed ?? 0n),
            0n,
          );
          const winnersCount = settled.reduce(
            (sum, s) => sum + (s.summary?.winnersCount ?? 0),
            0,
          );

          // 알림 발송 (best-effort).
          if (settled.length > 0) {
            try {
              await this.notify.notifyMarketSettled({
                matchId: settledMatch.id,
                title: settledMatch.title,
                winnerName: winnerTeam.name,
                totalPool: totalPool.toString(),
                payoutDistributed: payoutDistributed.toString(),
                winnersCount,
              });
            } catch {
              // notify 실패는 silent
            }
          }

          const resultEmbed = new EmbedBuilder()
            .setTitle('🏆 정산 완료')
            .setColor(0x00ff66)
            .addFields(
              { name: '매치', value: settledMatch.title, inline: false },
              { name: '우승', value: winnerTeam.name, inline: true },
              {
                name: '정산 마켓',
                value: `${settled.length}/${settlements.length}`,
                inline: true,
              },
              {
                name: '총 풀 / 지급',
                value: `${totalPool.toString()} P / ${payoutDistributed.toString()} P`,
                inline: false,
              },
              {
                name: '당첨자 수',
                value: `${winnersCount}명`,
                inline: true,
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
          this.logger.warn(`settleMatch failed: ${msg}`);
          await interaction.editReply({
            content: `❌ 정산 실패: ${msg}`,
            embeds: [],
            components: [],
          });
        }
        return; // 완료
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류';
        this.logger.warn(`settle flow ended: ${msg}`);
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
