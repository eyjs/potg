import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Repository } from 'typeorm';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { BettingService } from '../../betting/betting.service';
import {
  BettingMarket,
  BettingMarketStatus,
  BettingMarketType,
} from '../../betting/entities/betting-market.entity';
import { Match } from '../../matches/entities/match.entity';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { Team } from '../../matches/entities/team.entity';
import { LedgerService } from '../../ledger/ledger.service';

@Injectable()
export class BetCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('베팅')
    .setDescription('내전 승패(WIN)에 베팅합니다')
    .addStringOption((o) =>
      o
        .setName('내전')
        .setDescription('베팅할 내전 ID')
        .setRequired(true)
        .setAutocomplete(false),
    )
    .addStringOption((o) =>
      o.setName('팀').setDescription('베팅할 팀 ID').setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName('금액')
        .setDescription('베팅 금액 (P)')
        .setMinValue(1)
        .setRequired(true),
    );

  constructor(
    private readonly members: DiscordMemberService,
    private readonly betting: BettingService,
    private readonly ledger: LedgerService,
    @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    @InjectRepository(BettingMarket)
    private readonly marketRepo: Repository<BettingMarket>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const matchId = interaction.options.getString('내전', true);
    const teamId = interaction.options.getString('팀', true);
    const amount = interaction.options.getInteger('금액', true);

    const { user } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });

    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('내전을 찾을 수 없습니다.');
    if (match.status !== MatchStatus.BETTING_OPEN) {
      await interaction.editReply(
        `현재 베팅을 받지 않는 내전입니다. (상태: ${match.status})`,
      );
      return;
    }

    const team = await this.teamRepo.findOne({
      where: { id: teamId, matchId: match.id },
    });
    if (!team) {
      await interaction.editReply('해당 내전에 속한 팀이 아닙니다.');
      return;
    }

    const market = await this.marketRepo.findOne({
      where: {
        matchId: match.id,
        type: BettingMarketType.WIN,
        status: BettingMarketStatus.OPEN,
      },
    });
    if (!market) {
      await interaction.editReply('현재 베팅 가능한 WIN 마켓이 없습니다.');
      return;
    }

    const stake = await this.betting.placeStake(market.id, user.id, {
      side: team.id,
      amount,
    });
    const balance = await this.ledger.getBalance(user.id);

    await interaction.editReply(
      [
        `✅ **${team.name}** 에 \`${amount} P\` 베팅 완료.`,
        `누적 베팅: ${stake.stake} P`,
        `현재 잔액: ${balance.toString()} P`,
      ].join('\n'),
    );
  }
}
