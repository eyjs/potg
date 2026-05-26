import { Injectable } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { BettingService } from '../../betting/betting.service';
import { MatchService } from '../../matches/match.service';

/**
 * 진행 중인 OPEN 베팅 마켓 목록.
 * `/베팅` 명령에서 사용할 Match ID / Team ID를 알아보기 위함.
 */
@Injectable()
export class OpenMarketsCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('최근베팅')
    .setDescription('진행 중인 베팅 목록 (베팅 가능한 마켓)');

  constructor(
    private readonly betting: BettingService,
    private readonly matches: MatchService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const markets = await this.betting.findOpenMarkets();
    if (markets.length === 0) {
      await interaction.editReply('현재 진행 중인 베팅이 없습니다.');
      return;
    }

    // 각 마켓의 Match + Teams 정보를 모아서 임베드 구성.
    const lines = await Promise.all(
      markets.map(async (market) => {
        const match = await this.matches.findOneWithTeams(market.matchId);
        const teams = match.teams
          .map((t) => `  - ${t.name} \`teamId: ${t.id}\``)
          .join('\n');
        return [
          `**${match.title}** (${market.type})`,
          `Match ID: \`${match.id}\``,
          `풀: ${market.totalPool} P / Rake: ${market.rakeBps / 100}%`,
          '팀:',
          teams,
        ].join('\n');
      }),
    );

    const embed = new EmbedBuilder()
      .setTitle('🎲 진행 중인 베팅')
      .setDescription(lines.join('\n\n'))
      .setColor(0x00c3ff)
      .setFooter({
        text: '/베팅 <matchId> <teamId> <금액> 으로 베팅하세요',
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
