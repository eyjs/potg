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
import { BettingNotifyService } from '../notifications/betting-notify.service';

/**
 * 베팅 마감. MatchService.lockMatch 가 자동으로 모든 OPEN 마켓을 LOCKED로 전이.
 */
@Injectable()
export class AdminBettingLockCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('관리-베팅마감')
    .setDescription('[관리자] 베팅 마감 (Match LOCKED + 모든 마켓 LOCKED)')
    .addStringOption((o) =>
      o.setName('matchid').setDescription('Match ID').setRequired(true),
    );

  constructor(
    private readonly users: UsersService,
    private readonly matches: MatchService,
    private readonly notify: BettingNotifyService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await assertAdmin(this.users, interaction.user.id);

    const matchId = interaction.options.getString('matchid', true);
    const match = await this.matches.lockMatch(matchId);

    await this.notify.notifyMarketLocked({
      matchId: match.id,
      title: match.title,
    });

    await interaction.editReply(
      `🔒 베팅 마감: **${match.title}** (id: \`${match.id}\`)`,
    );
  }
}
