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
import { LedgerService } from '../../ledger/ledger.service';

@Injectable()
export class RankPredictCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('순위예측')
    .setDescription('내전 순위(1~4등)에 베팅합니다')
    .addStringOption((o) =>
      o.setName('내전').setDescription('내전 ID').setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName('등수')
        .setDescription('예측 순위 (1~4)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(4),
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
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const matchId = interaction.options.getString('내전', true);
    const rank = interaction.options.getInteger('등수', true);
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

    const market = await this.marketRepo.findOne({
      where: {
        matchId: match.id,
        type: BettingMarketType.RANK,
        status: BettingMarketStatus.OPEN,
      },
    });
    if (!market) {
      await interaction.editReply('현재 베팅 가능한 RANK 마켓이 없습니다.');
      return;
    }

    const stake = await this.betting.placeStake(market.id, user.id, {
      side: String(rank),
      amount,
    });
    const balance = await this.ledger.getBalance(user.id);

    await interaction.editReply(
      [
        `✅ **${rank}등** 에 \`${amount} P\` 순위 예측 완료.`,
        `누적 베팅: ${stake.stake} P`,
        `현재 잔액: ${balance.toString()} P`,
      ].join('\n'),
    );
  }
}
