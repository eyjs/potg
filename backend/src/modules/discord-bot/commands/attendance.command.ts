import { Injectable } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { AttendanceRewardService } from '../attendance-reward.service';

@Injectable()
export class AttendanceCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('출석')
    .setDescription('일일 출석체크 (1일 1회)');

  constructor(private readonly reward: AttendanceRewardService) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await this.reward.claimDaily({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
      source: 'slash',
    });

    if (result.alreadyClaimed) {
      await interaction.editReply(
        `오늘 이미 출석체크를 완료했습니다.\n현재 잔액: **${result.balanceAfter.toString()} P**`,
      );
      return;
    }

    await interaction.editReply(
      `✅ 출석 완료! \`+${result.amount} P\` 지급되었습니다.\n현재 잔액: **${result.balanceAfter.toString()} P**`,
    );
  }
}
