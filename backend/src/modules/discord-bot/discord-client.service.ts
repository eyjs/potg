import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Events, GatewayIntentBits, MessageFlags, REST } from 'discord.js';
import { CommandRegistry } from './command-registry';
import {
  SLASH_COMMAND_TOKEN,
  type SlashCommand,
} from './interfaces/slash-command.interface';

/**
 * Discord.js 클라이언트 라이프사이클 관리.
 *
 * DISCORD_BOT_ENABLED !== 'true' 면 연결을 수행하지 않고 부팅 가능.
 * 슬래시 명령은 DISCORD_GUILD_ID 기반 길드 등록(즉시 반영).
 */
@Injectable()
export class DiscordClientService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(DiscordClientService.name);
  private client?: Client;

  constructor(
    private readonly config: ConfigService,
    private readonly registry: CommandRegistry,
    @Optional()
    @Inject(SLASH_COMMAND_TOKEN)
    private readonly commands: SlashCommand[] = [],
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const cmd of this.commands ?? []) {
      this.registry.register(cmd);
    }

    const enabled = this.config.get<string>('DISCORD_BOT_ENABLED') === 'true';
    if (!enabled) {
      this.logger.log(
        `Discord bot disabled (DISCORD_BOT_ENABLED=false). Registered ${this.registry.list().length} command(s) in-process only.`,
      );
      return;
    }

    const token = this.config.get<string>('DISCORD_BOT_TOKEN');
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const guildId = this.config.get<string>('DISCORD_GUILD_ID') || undefined;

    if (!token || !clientId) {
      this.logger.warn(
        'DISCORD_BOT_ENABLED=true 이지만 DISCORD_BOT_TOKEN 또는 DISCORD_CLIENT_ID 미설정 — 봇을 시작하지 않습니다.',
      );
      return;
    }

    try {
      const rest = new REST({ version: '10' }).setToken(token);
      await this.registry.publish(rest, clientId, guildId);
    } catch (err) {
      this.logger.error(
        `슬래시 명령 등록 실패: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    this.client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    this.client.once(Events.ClientReady, (c) => {
      this.logger.log(`Discord bot ready as ${c.user.tag}`);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (guildId && interaction.guildId !== guildId) {
        await interaction.reply({
          content: '이 봇은 등록된 길드에서만 사용 가능합니다.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await this.registry.dispatch(interaction);
    });

    try {
      await this.client.login(token);
    } catch (err) {
      this.logger.error(
        `Discord 로그인 실패: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = undefined;
    }
  }
}
