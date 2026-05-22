import { Injectable } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { LedgerService } from '../../ledger/ledger.service';

@Injectable()
export class BalanceCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('잔액')
    .setDescription('나의 포인트 잔액을 확인합니다');

  constructor(
    private readonly members: DiscordMemberService,
    private readonly ledger: LedgerService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const { user, isNew } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });
    const balance = await this.ledger.getBalance(user.id);
    const lines = [
      `**${user.nickname ?? user.username}** 님의 잔액`,
      `\`\`\`${balance.toString()} P\`\`\``,
    ];
    if (isNew) {
      lines.push('🎉 첫 사용을 환영합니다! 가입 시드가 지급되었습니다.');
    }
    await interaction.editReply(lines.join('\n'));
  }
}
