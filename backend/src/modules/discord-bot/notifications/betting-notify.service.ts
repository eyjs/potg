import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType, EmbedBuilder } from 'discord.js';
import { DiscordClientService } from '../discord-client.service';

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
