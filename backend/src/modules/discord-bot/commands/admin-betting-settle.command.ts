import { Injectable } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { UsersService } from '../../users/users.service';
import { MatchService } from '../../matches/match.service';
import { assertAdmin } from '../utils/admin-guard';

/**
 * 베팅 정산 — 수동 fallback.
 *
 * 일반적으로는 웹 admin에서 내전 결과 등록 시 자동 정산 (Stage 5 예정).
 * 이 명령은 비상 수단 또는 자유 베팅 정산용.
 */
@Injectable()
export class AdminBettingSettleCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('관리-정산')
    .setDescription('[관리자] 베팅 정산 (Match SETTLED + 마켓 정산)')
    .addStringOption((o) =>
      o.setName('matchid').setDescription('Match ID').setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('승리팀')
        .setDescription('승리한 팀의 Team ID')
        .setRequired(true),
    );

  constructor(
    private readonly users: UsersService,
    private readonly matches: MatchService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await assertAdmin(this.users, interaction.user.id);

    const matchId = interaction.options.getString('matchid', true);
    const winnerTeamId = interaction.options.getString('승리팀', true);

    const match = await this.matches.settleMatch(matchId, winnerTeamId);

    await interaction.editReply(
      [
        `🏆 정산 완료: **${match.title}**`,
        `Match ID: \`${match.id}\``,
        `Winner Team ID: \`${winnerTeamId}\``,
        '',
        '베팅 풀 분배 + 사용자 잔액 갱신 완료. 알림은 자동 전송됩니다.',
      ].join('\n'),
    );
  }
}
