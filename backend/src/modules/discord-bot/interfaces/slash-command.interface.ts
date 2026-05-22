import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export type SlashCommandDefinition =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

/**
 * 슬래시 명령 핸들러 인터페이스.
 * Nest provider로 구현하고 CommandRegistry에 자동 수집된다.
 */
export interface SlashCommand {
  /** discord.js SlashCommandBuilder 정의 — 이름은 한국어 가능 */
  readonly definition: SlashCommandDefinition;

  /** 인터랙션 실행. ephemeral 응답 기본. */
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export const SLASH_COMMAND_TOKEN = Symbol.for('POTG_SLASH_COMMAND');
