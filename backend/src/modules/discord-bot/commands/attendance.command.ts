import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Repository } from 'typeorm';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { LedgerService } from '../../ledger/ledger.service';
import { POINT_TX_REASON } from '../../ledger/ledger.constants';
import { PointTx } from '../../ledger/entities/point-tx.entity';
import { SystemConfigService } from '../../system-config/system-config.service';

const DAILY_ATTENDANCE_AMOUNT_KEY = 'DAILY_ATTENDANCE_AMOUNT';
const DEFAULT_DAILY_AMOUNT = 50;

@Injectable()
export class AttendanceCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('출석')
    .setDescription('일일 출석체크 (1일 1회)');

  constructor(
    private readonly members: DiscordMemberService,
    private readonly ledger: LedgerService,
    private readonly systemConfig: SystemConfigService,
    @InjectRepository(PointTx)
    private readonly pointTxRepo: Repository<PointTx>,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const { user } = await this.members.findOrCreate({
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    });

    const today = startOfTodayUtc();
    const already = await this.pointTxRepo
      .createQueryBuilder('tx')
      .where('tx.to_account = :uid', { uid: user.id })
      .andWhere('tx.reason = :r', { r: POINT_TX_REASON.ATTENDANCE })
      .andWhere('tx.created_at >= :d', { d: today })
      .getCount();

    if (already > 0) {
      await interaction.editReply('오늘 이미 출석체크를 완료했습니다.');
      return;
    }

    const amount = await this.systemConfig.getNumber(
      DAILY_ATTENDANCE_AMOUNT_KEY,
      DEFAULT_DAILY_AMOUNT,
    );
    if (amount <= 0) {
      throw new BadRequestException('출석 보상이 0으로 설정되어 있습니다.');
    }

    await this.ledger.mint(user.id, BigInt(amount), POINT_TX_REASON.ATTENDANCE, {
      refType: 'User',
      refId: user.id,
      memo: `discord:${interaction.user.id}`,
    });

    const balance = await this.ledger.getBalance(user.id);
    await interaction.editReply(
      `✅ 출석 완료! \`+${amount} P\` 지급되었습니다.\n현재 잔액: **${balance.toString()} P**`,
    );
  }
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
