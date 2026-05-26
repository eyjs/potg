import { Injectable } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';

/**
 * 봇 명령 카탈로그. 사용자 role 에 따라 표시되는 명령이 다름.
 */
@Injectable()
export class HelpCommand implements SlashCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('도움말')
    .setDescription('사용 가능한 봇 명령 목록');

  constructor(private readonly users: UsersService) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await this.users.findByDiscordId(interaction.user.id);
    const isAdmin = user?.role === UserRole.ADMIN;

    const embed = new EmbedBuilder()
      .setTitle('🤖 POTG 봇 명령 안내')
      .setColor(0x00c3ff)
      .addFields(
        {
          name: '💰 포인트 / 잔액',
          value: [
            '`/잔액` — 내 포인트 잔액 확인',
            '`/송금 <대상> <금액>` — 다른 사용자에게 송금',
            '`/리더보드` — 포인트 상위 랭킹',
          ].join('\n'),
        },
        {
          name: '✅ 출석',
          value: [
            '`/출석` — 일일 출석 (1회/일)',
            '🎙️ 음성채널에 일정 시간 머물면 자동 출석',
          ].join('\n'),
        },
        {
          name: '🎲 베팅',
          value: [
            '`/최근베팅` — 진행 중 베팅 목록',
            '`/베팅` — 마켓 → 팀 → 금액 단계별 선택 (인자 없음)',
            '`/순위예측 <내전ID> <등수> <금액>` — 등수 베팅',
          ].join('\n'),
        },
        {
          name: '🛒 상점',
          value: ['`/상점` — 상품 둘러보기', '`/구매` — 상품 구매'].join('\n'),
        },
        {
          name: '🎯 음성채널',
          value: [
            '`/팀나누기 [그룹수] [이동1] [이동2] ...` — 음성채널 인원 무작위 분할',
          ].join('\n'),
        },
      );

    if (isAdmin) {
      embed.addFields({
        name: '🛠 관리자 전용',
        value: [
          '`/관리-베팅시작 <이름> <옵션1> <옵션2> [옵션3] [옵션4]`',
          '`/관리-베팅마감 <matchId>`',
          '`/관리-정산` — 매치 → 우승팀 → 확인 단계별 선택 (인자 없음)',
          '`/관리-포인트조정 <대상> <수량> [사유]`',
        ].join('\n'),
      });
    }

    embed.setFooter({
      text: isAdmin
        ? `관리자 권한으로 표시 중`
        : `봇 명령은 지정 채널 + 봇 DM에서만 작동합니다`,
    });

    await interaction.editReply({ embeds: [embed] });
  }
}
