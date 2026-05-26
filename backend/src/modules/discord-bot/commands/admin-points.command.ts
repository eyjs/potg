import { Injectable } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { UsersService } from '../../users/users.service';
import { LedgerService } from '../../ledger/ledger.service';
import { POINT_TX_REASON } from '../../ledger/ledger.constants';
import { assertAdmin } from '../utils/admin-guard';

/**
 * 관리자 포인트 수동 조정 (mint/burn via LedgerService).
 *
 * delta > 0: mint
 * delta < 0: burn (잔액 부족 시 LedgerService에서 throw)
 */
@Injectable()
export class AdminPointsCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('관리-포인트조정')
    .setDescription('[관리자] 사용자 포인트 mint/burn')
    .addUserOption((o) =>
      o.setName('대상').setDescription('대상 사용자').setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName('수량')
        .setDescription('양수=지급, 음수=차감')
        .setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('사유').setDescription('메모 (감사 추적용)'),
    );

  constructor(
    private readonly users: UsersService,
    private readonly ledger: LedgerService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await assertAdmin(this.users, interaction.user.id);

    const targetDiscord = interaction.options.getUser('대상', true);
    const delta = interaction.options.getInteger('수량', true);
    const memo = interaction.options.getString('사유') ?? 'admin 봇 조정';

    if (!Number.isInteger(delta) || delta === 0) {
      await interaction.editReply('수량은 0이 아닌 정수여야 합니다.');
      return;
    }

    const target = await this.users.findByDiscordId(targetDiscord.id);
    if (!target) {
      await interaction.editReply(
        `대상 사용자가 봇에 가입되지 않았습니다. (discord: ${targetDiscord.username})`,
      );
      return;
    }

    const amount = BigInt(Math.abs(delta));
    if (delta > 0) {
      await this.ledger.mint(target.id, amount, POINT_TX_REASON.ADMIN_ADJUST, {
        refType: 'AdminAdjust',
        refId: target.id,
        memo,
      });
    } else {
      await this.ledger.burn(target.id, amount, POINT_TX_REASON.ADMIN_ADJUST, {
        refType: 'AdminAdjust',
        refId: target.id,
        memo,
      });
    }

    const balance = await this.ledger.getBalance(target.id);
    await interaction.editReply(
      [
        `✅ 포인트 ${delta > 0 ? '지급' : '차감'}`,
        `대상: <@${targetDiscord.id}>`,
        `${delta > 0 ? '+' : ''}${delta} P`,
        `사유: ${memo}`,
        `잔액: ${balance.toString()} P`,
      ].join('\n'),
    );
  }
}
