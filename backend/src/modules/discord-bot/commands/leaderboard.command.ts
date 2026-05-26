import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Repository } from 'typeorm';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { User } from '../../users/entities/user.entity';

const DEFAULT_TOP = 10;
const MAX_TOP = 25;

@Injectable()
export class LeaderboardCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('리더보드')
    .setDescription('포인트 상위 랭킹을 조회합니다')
    .addIntegerOption((opt) =>
      opt
        .setName('top')
        .setDescription(`표시할 인원 (기본 ${DEFAULT_TOP}, 최대 ${MAX_TOP})`)
        .setMinValue(1)
        .setMaxValue(MAX_TOP)
        .setRequired(false),
    );

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const top = interaction.options.getInteger('top') ?? DEFAULT_TOP;

    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.username', 'u.nickname', 'u.pointsBalance'])
      .orderBy('u.pointsBalance', 'DESC')
      .limit(top)
      .getMany();

    if (rows.length === 0) {
      await interaction.editReply('아직 등록된 사용자가 없습니다.');
      return;
    }

    const lines = rows.map((u, i) => {
      const rank = String(i + 1).padStart(2, ' ');
      const name = (u.nickname ?? u.username ?? 'unknown').padEnd(16, ' ');
      const balance = `${BigInt(u.pointsBalance ?? '0').toString()} P`;
      return `\`${rank}. ${name}\` ${balance}`;
    });

    await interaction.editReply(
      `**🏆 포인트 리더보드 (Top ${top})**\n` + lines.join('\n'),
    );
  }
}
