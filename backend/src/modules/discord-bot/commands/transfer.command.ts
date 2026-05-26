import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { DiscordMemberService } from '../discord-member.service';
import { LedgerService } from '../../ledger/ledger.service';
import { POINT_TX_REASON } from '../../ledger/ledger.constants';

/**
 * 사용자 간 포인트 송금 (P2P).
 *
 * 흐름:
 *   1. 호출자 / 대상 모두 findOrCreate (대상이 봇 미가입이면 자동 가입 + SEED)
 *   2. 본인 송금 / 0 이하 / 잔액 부족 거부
 *   3. LedgerService.transfer (P2P_SEND reason) — SELECT FOR UPDATE 로 시리얼화
 *   4. 양쪽 잔액 응답에 표시
 */
@Injectable()
export class TransferCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('송금')
    .setDescription('다른 사용자에게 포인트 송금')
    .addUserOption((o) =>
      o.setName('대상').setDescription('받을 사람').setRequired(true),
    )
    .addIntegerOption((o) =>
      o
        .setName('금액')
        .setDescription('보낼 P (정수, 1 이상)')
        .setMinValue(1)
        .setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('메모').setDescription('수신자에게 표시될 메모 (선택)'),
    );

  constructor(
    private readonly members: DiscordMemberService,
    private readonly ledger: LedgerService,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetDiscord = interaction.options.getUser('대상', true);
    const amount = interaction.options.getInteger('금액', true);
    const memo = interaction.options.getString('메모') ?? null;

    if (targetDiscord.id === interaction.user.id) {
      throw new BadRequestException('자기 자신에게는 송금할 수 없습니다.');
    }
    if (targetDiscord.bot) {
      throw new BadRequestException('봇에게는 송금할 수 없습니다.');
    }

    // 호출자 + 대상 모두 자동 가입.
    const [{ user: sender }, { user: receiver }] = await Promise.all([
      this.members.findOrCreate({
        discordId: interaction.user.id,
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
      }),
      this.members.findOrCreate({
        discordId: targetDiscord.id,
        username: targetDiscord.username,
        avatarUrl: targetDiscord.displayAvatarURL({ size: 256 }),
      }),
    ]);

    await this.ledger.transfer({
      fromAccount: sender.id,
      toAccount: receiver.id,
      amount: BigInt(amount),
      reason: POINT_TX_REASON.P2P_SEND,
      refType: 'P2P',
      memo: memo
        ? `${memo} (from discord:${interaction.user.id})`
        : `from discord:${interaction.user.id}`,
    });

    const [senderBalance, receiverBalance] = await Promise.all([
      this.ledger.getBalance(sender.id),
      this.ledger.getBalance(receiver.id),
    ]);

    await interaction.editReply(
      [
        `✅ 송금 완료`,
        `<@${targetDiscord.id}> 님에게 \`${amount} P\` 전송`,
        memo ? `메모: ${memo}` : null,
        `내 잔액: ${senderBalance.toString()} P`,
        `상대 잔액: ${receiverBalance.toString()} P`,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    );

    // 수신자에게 best-effort DM 알림.
    try {
      await targetDiscord.send(
        [
          `💸 <@${interaction.user.id}> 님이 \`${amount} P\` 를 보냈습니다.`,
          memo ? `메모: ${memo}` : null,
          `현재 잔액: ${receiverBalance.toString()} P`,
        ]
          .filter((line): line is string => line !== null)
          .join('\n'),
      );
    } catch {
      // DM 차단 등은 silent
    }
  }
}
