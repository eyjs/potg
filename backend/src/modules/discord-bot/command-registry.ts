import { Injectable, Logger } from '@nestjs/common';
import { MessageFlags } from 'discord.js';
import type {
  ChatInputCommandInteraction,
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';
import type { SlashCommand } from './interfaces/slash-command.interface';

/**
 * 슬래시 명령 레지스트리.
 * Provider로 주입된 SlashCommand 구현체들을 이름→핸들러 맵으로 관리.
 */
@Injectable()
export class CommandRegistry {
  private readonly logger = new Logger(CommandRegistry.name);
  private readonly commands = new Map<string, SlashCommand>();

  register(command: SlashCommand): void {
    const name = command.definition.name;
    if (this.commands.has(name)) {
      this.logger.warn(`Duplicate slash command name "${name}" — overwriting`);
    }
    this.commands.set(name, command);
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  list(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Discord 길드(또는 글로벌)에 슬래시 명령 일괄 등록.
   *
   * 길드 등록은 즉시 반영, 글로벌 등록은 최대 1시간 지연.
   * 단일 클랜 정책이므로 DISCORD_GUILD_ID 기반 길드 등록을 권장.
   */
  async publish(
    rest: REST,
    clientId: string,
    guildId?: string,
  ): Promise<number> {
    const body: RESTPostAPIApplicationCommandsJSONBody[] = this.list().map(
      (c) => c.definition.toJSON(),
    );

    const { Routes } = await import('discord.js');
    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    await rest.put(route, { body });
    this.logger.log(
      `Published ${body.length} slash command(s) to ${guildId ? `guild ${guildId}` : 'global'}`,
    );
    return body.length;
  }

  async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
    const handler = this.get(interaction.commandName);
    if (!handler) {
      this.logger.warn(`Unknown slash command: ${interaction.commandName}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `등록되지 않은 명령입니다: ${interaction.commandName}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }
    try {
      await handler.execute(interaction);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      this.logger.error(
        `Command "${interaction.commandName}" failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: `오류: ${message}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: `오류: ${message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
}
