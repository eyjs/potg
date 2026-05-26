import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType, EmbedBuilder } from 'discord.js';
import { DiscordClientService } from '../discord-client.service';
import { BettingStakeStatus } from '../../betting/entities/betting-stake.entity';
import type { BettingStake } from '../../betting/entities/betting-stake.entity';

/**
 * 베팅 마켓 생성/마감/정산 결과를 지정 채널에 임베드로 알림.
 *
 * DISCORD_BETTING_NOTIFY_CHANNEL_ID 미설정 시 silent (로그만).
 * 봇이 disabled / not ready 면 silent.
 */
@Injectable()
export class BettingNotifyService {
  private readonly logger = new Logger(BettingNotifyService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly discord: DiscordClientService,
  ) {}

  private get channelId(): string | undefined {
    return (
      this.config.get<string>('DISCORD_BETTING_NOTIFY_CHANNEL_ID') || undefined
    );
  }

  async notifyMarketCreated(input: {
    matchId: string;
    title: string;
    options: { teamId: string; name: string }[];
  }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🎲 새 베팅 시작')
      .setDescription(`**${input.title}**`)
      .addFields(
        { name: '내전 ID', value: input.matchId, inline: false },
        {
          name: '옵션',
          value: input.options.map((o, i) => `${i + 1}. ${o.name}`).join('\n'),
          inline: false,
        },
      )
      .setColor(0x00c3ff)
      .setTimestamp();
    await this.send(embed);
  }

  async notifyMarketLocked(input: {
    matchId: string;
    title: string;
  }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🔒 베팅 마감')
      .setDescription(`**${input.title}** 베팅이 마감되었습니다.`)
      .addFields({ name: '내전 ID', value: input.matchId, inline: false })
      .setColor(0xf99e1a)
      .setTimestamp();
    await this.send(embed);
  }

  async notifyMarketSettled(input: {
    matchId: string;
    title: string;
    winnerName: string;
    totalPool: string;
    payoutDistributed: string;
    winnersCount: number;
  }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🏆 베팅 정산 완료')
      .setDescription(`**${input.title}**`)
      .addFields(
        { name: '승리', value: input.winnerName, inline: true },
        { name: '당첨자 수', value: String(input.winnersCount), inline: true },
        {
          name: '풀 / 지급',
          value: `${input.totalPool}P / ${input.payoutDistributed}P`,
          inline: false,
        },
      )
      .setColor(0x00ff66)
      .setTimestamp();
    await this.send(embed);
  }

  /**
   * 매치 정산 후 베팅자 각자에게 결과 DM 발송 (best-effort).
   *
   * - stakes 는 user 관계가 로드되어 있어야 함 (BettingService.findStakesForMatchSettlement)
   * - 봇 not ready 또는 DM 차단은 silent fail
   * - 정산되지 않은 (status === PLACED) stake 는 스킵
   *
   * @param stakes 정산 처리가 완료된 BettingStake 행 (user.discordId 포함)
   * @param matchTitle DM 메시지에 표시할 매치 제목
   * @param winnerLabel WIN 마켓: 우승 팀명 / RANK 마켓: "1등" 형태
   */
  async notifyStakeResultsToBettors(
    stakes: BettingStake[],
    matchTitle: string,
  ): Promise<{ sent: number; skipped: number; failed: number }> {
    if (!this.discord.isReady()) {
      this.logger.debug('Discord not ready, skipping stake DM');
      return { sent: 0, skipped: stakes.length, failed: 0 };
    }
    const client = this.discord.getClient();
    if (!client) return { sent: 0, skipped: stakes.length, failed: 0 };

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const stake of stakes) {
      // 정산 안 된 stake 는 스킵 (이론상 발생 안하지만 방어).
      if (stake.status === BettingStakeStatus.PLACED) {
        skipped += 1;
        continue;
      }
      const discordId = stake.user?.discordId;
      if (!discordId) {
        skipped += 1;
        continue;
      }

      const isWon = stake.status === BettingStakeStatus.WON;
      const isRefunded = stake.status === BettingStakeStatus.REFUNDED;
      const payout = BigInt(stake.payout ?? '0');
      const stakeAmount = BigInt(stake.stake);
      const profit = payout - stakeAmount;

      const embed = new EmbedBuilder()
        .setTitle(
          isWon ? '🎉 베팅 당첨' : isRefunded ? '↩️ 베팅 환불' : '💔 베팅 낙첨',
        )
        .setColor(isWon ? 0x00ff66 : isRefunded ? 0xf99e1a : 0x808080)
        .addFields(
          { name: '매치', value: matchTitle, inline: false },
          { name: '선택', value: `\`${stake.side}\``, inline: true },
          { name: '베팅', value: `${stakeAmount.toString()} P`, inline: true },
        );

      if (isWon) {
        embed.addFields(
          { name: '지급', value: `${payout.toString()} P`, inline: true },
          {
            name: '손익',
            value: `${profit >= 0n ? '+' : ''}${profit.toString()} P`,
            inline: true,
          },
        );
      } else if (isRefunded) {
        embed.addFields({
          name: '환불',
          value: `${payout.toString()} P`,
          inline: true,
        });
      } else {
        embed.addFields({
          name: '손실',
          value: `-${stakeAmount.toString()} P`,
          inline: true,
        });
      }

      embed.setTimestamp();

      try {
        const user = await client.users.fetch(discordId);
        await user.send({ embeds: [embed] });
        sent += 1;
      } catch (err) {
        // DM 차단 / fetch 실패 — silent.
        this.logger.debug(
          `Stake DM failed for ${discordId}: ${(err as Error).message}`,
        );
        failed += 1;
      }
    }

    this.logger.log(
      `Stake DM result for "${matchTitle}": sent=${sent} skipped=${skipped} failed=${failed}`,
    );
    return { sent, skipped, failed };
  }

  private async send(embed: EmbedBuilder): Promise<void> {
    const channelId = this.channelId;
    if (!channelId) {
      this.logger.debug(
        'DISCORD_BETTING_NOTIFY_CHANNEL_ID not set, skipping notify',
      );
      return;
    }
    if (!this.discord.isReady()) {
      this.logger.warn('Discord client not ready, skipping notify');
      return;
    }
    const client = this.discord.getClient();
    if (!client) return;

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        this.logger.warn(
          `Notify channel ${channelId} is not a guild text channel`,
        );
        return;
      }
      await channel.send({ embeds: [embed] });
    } catch (err) {
      this.logger.error(
        `Failed to send notify: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
