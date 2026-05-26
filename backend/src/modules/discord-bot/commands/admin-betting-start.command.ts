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
 * 관리자가 자유 입력으로 베팅 마켓 시작.
 *
 * 흐름:
 *   1. Match 생성 (title=이름, status=DRAFT)
 *   2. 옵션 개수만큼 Team 생성
 *   3. openBetting → status=BETTING_OPEN
 *   4. BettingMarket 생성 (WIN type)
 *   5. 알림 채널 임베드
 *
 * 응답에 Match ID 표시 → 유저는 /베팅에서 사용.
 */
@Injectable()
export class AdminBettingStartCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('관리-베팅시작')
    .setDescription('[관리자] 새 베팅 마켓 생성')
    .addStringOption((o) =>
      o.setName('이름').setDescription('베팅 이름').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('옵션1').setDescription('첫 번째 옵션').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('옵션2').setDescription('두 번째 옵션').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('옵션3').setDescription('세 번째 옵션 (선택)'),
    )
    .addStringOption((o) =>
      o.setName('옵션4').setDescription('네 번째 옵션 (선택)'),
    );

  constructor(
    private readonly users: UsersService,
    private readonly matches: MatchService,
    private readonly notify: BettingNotifyService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await assertAdmin(this.users, interaction.user.id);

    const title = interaction.options.getString('이름', true);
    const options = [
      interaction.options.getString('옵션1', true),
      interaction.options.getString('옵션2', true),
      interaction.options.getString('옵션3') ?? null,
      interaction.options.getString('옵션4') ?? null,
    ].filter((o): o is string => !!o);

    // 단일 트랜잭션: Match + Teams + BETTING_OPEN + Market.
    // 중간 실패 시 전체 롤백되어 orphan 데이터 잔존 없음.
    const { match, teams, market } = await this.matches.createBettingScenario({
      title,
      options,
    });

    await this.notify.notifyMarketCreated({
      matchId: match.id,
      title,
      options: teams.map((t) => ({ teamId: t.id, name: t.name })),
    });

    const teamLines = teams
      .map((t, i) => `${i + 1}. \`${t.name}\` — teamId: \`${t.id}\``)
      .join('\n');

    await interaction.editReply(
      [
        `✅ 베팅 시작: **${title}**`,
        `Match ID: \`${match.id}\``,
        `Market ID: \`${market.id}\``,
        '',
        '**옵션 / Team ID** (유저 베팅 시 teamId 사용)',
        teamLines,
      ].join('\n'),
    );
  }
}
