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

    const lines = [
      `✅ 출석 완료! \`+${result.amount} P\` 지급되었습니다.`,
      `🔥 연속 ${result.streakDays}일`,
    ];
    if (result.streakBonus > 0) {
      lines.push(
        `🎁 **${result.streakDays}연속 보너스** \`+${result.streakBonus} P\` 추가 지급!`,
      );
    }
    lines.push(`현재 잔액: **${result.balanceAfter.toString()} P**`);

    await interaction.editReply(lines.join('\n'));
  }
}
