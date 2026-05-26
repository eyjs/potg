import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  Guild,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  VoiceBasedChannel,
  VoiceChannel,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';

const MIN_GROUPS = 2;
const MAX_GROUPS = 4;
const CONFIRM_WINDOW_MS = 10_000;

/**
 * 음성채널 멤버를 무작위로 N그룹 분할.
 *
 * 핵심 정책: **현재 채널을 재사용한다.**
 *   - 그룹 1 (호출자의 현재 채널 멤버들)은 현재 채널에 그대로 머문다 (이동 0회).
 *   - 그룹 2~N 만 빈 채널로 이동한다 — 필요한 빈 채널 수 = groupCount - 1.
 *   - 예: 5명 모인 "오버워치 1" 채널에서 /팀나누기 →
 *         2~3명은 "오버워치 1" 그대로, 나머지는 "오버워치 2" 로 이동.
 *
 * 안전장치:
 *   - 채널 멤버 2명 이상이면 ❌ 취소 버튼 + 10초 컨펌 윈도우 노출 (테러 방지).
 *     멤버 중 누구라도 ❌ 누르면 취소 / timeout = no objection 으로 진행.
 *   - 봇 자기 자신은 분할 대상에서 제외.
 *   - 봇 Move Members 권한 없거나 빈 채널 부족이면 결과만 표시 + 안내.
 *
 * 빈 채널 탐색 우선순위:
 *   1. 현재 채널과 같은 카테고리의 빈 음성채널 (position 오름차순)
 *   2. 위가 없으면 길드 전체의 빈 음성채널
 */
@Injectable()
export class TeamSplitCommand implements SlashCommand {
  private readonly logger = new Logger(TeamSplitCommand.name);

  readonly definition = new SlashCommandBuilder()
    .setName('팀나누기')
    .setDescription('현재 음성채널 인원을 랜덤 분할 후 빈 채널로 자동 이동')
    .addIntegerOption((o) =>
      o
        .setName('그룹수')
        .setDescription(`나눌 그룹 수 (${MIN_GROUPS}~${MAX_GROUPS}, 기본 2)`)
        .setMinValue(MIN_GROUPS)
        .setMaxValue(MAX_GROUPS),
    );

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      throw new BadRequestException('서버에서만 사용할 수 있습니다.');
    }

    const groupCount = interaction.options.getInteger('그룹수') ?? MIN_GROUPS;
    const currentVoice = interaction.member.voice.channel;
    if (!currentVoice) {
      await interaction.reply({
        content: '먼저 음성채널에 입장한 후 이 명령을 사용하세요.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const members = Array.from(currentVoice.members.values()).filter(
      (m) => !m.user.bot,
    );
    if (members.length < groupCount) {
      await interaction.reply({
        content: `음성채널 인원(${members.length}명)이 그룹 수(${groupCount})보다 적습니다.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 컨펌 단계 — 본인 1명이면 즉시 진행, 2명 이상이면 ❌ 버튼 + 10초 윈도우.
    if (members.length >= 2) {
      const confirmed = await this.askConfirmation(
        interaction,
        members,
        currentVoice,
      );
      if (!confirmed) return;
    } else {
      await interaction.deferReply();
    }

    // 셔플 + 분할.
    const shuffled = shuffle(members);
    const groups: GuildMember[][] = Array.from(
      { length: groupCount },
      () => [],
    );
    shuffled.forEach((m, idx) => groups[idx % groupCount].push(m));

    // 빈 채널 탐색.
    const emptyVoiceChannels = this.findEmptyVoiceChannels(
      interaction.guild,
      currentVoice,
    );
    const needed = groupCount - 1;
    const haveEnoughChannels = emptyVoiceChannels.length >= needed;
    const botMember = interaction.guild.members.me;
    const canMove =
      botMember?.permissions.has(PermissionFlagsBits.MoveMembers) ?? false;

    let moveError: string | null = null;
    let moved = false;
    if (!canMove) {
      moveError =
        '봇에 "멤버 이동" 권한이 없습니다. 결과만 표시합니다 (수동 이동 필요).';
    } else if (!haveEnoughChannels) {
      moveError = `비어있는 음성채널이 부족합니다 (필요 ${needed}개 / 가능 ${emptyVoiceChannels.length}개). 결과만 표시합니다.`;
    } else {
      const targets: VoiceChannel[] = [
        currentVoice as VoiceChannel,
        ...emptyVoiceChannels.slice(0, needed),
      ];
      await this.moveMembers(groups, targets);
      moved = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('🎲 팀 나누기')
      .setColor(0xf99e1a)
      .setDescription(
        [
          `출발 채널: <#${currentVoice.id}>`,
          `참가 인원: ${members.length}명 → ${groupCount}그룹`,
          moved ? '✅ 빈 음성채널로 자동 이동 완료' : null,
          moveError,
        ]
          .filter((line): line is string => !!line)
          .join('\n'),
      );

    groups.forEach((group, idx) => {
      let channelLabel = '';
      if (idx === 0) {
        channelLabel = ` (<#${currentVoice.id}>)`;
      } else if (moved) {
        const target = emptyVoiceChannels[idx - 1];
        channelLabel = ` (<#${target.id}>)`;
      }
      embed.addFields({
        name: `그룹 ${idx + 1}${channelLabel}`,
        value:
          group.length > 0
            ? group.map((m) => `<@${m.id}>`).join(', ')
            : '_(비어있음)_',
      });
    });

    await interaction.editReply({ embeds: [embed], components: [] });
  }

  /**
   * 채널 멤버에게 ❌ 취소 버튼 + 카운트다운 노출.
   * @returns true=진행 (timeout 또는 동의), false=취소됨 (누구든 ❌)
   */
  private async askConfirmation(
    interaction: ChatInputCommandInteraction<'cached'>,
    members: GuildMember[],
    currentVoice: VoiceBasedChannel,
  ): Promise<boolean> {
    const memberIds = new Set(members.map((m) => m.id));
    const mentions = members.map((m) => `<@${m.id}>`).join(' ');

    const cancelButton = new ButtonBuilder()
      .setCustomId('team-split-cancel')
      .setLabel('❌ 취소')
      .setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      cancelButton,
    );

    // 채널에 공개 메시지 — 채널 멤버 누구든 ❌ 누를 수 있도록.
    const message = await interaction.reply({
      content:
        `🎲 <@${interaction.user.id}> 님이 **팀나누기**를 요청했습니다.\n` +
        `대상: ${mentions}\n` +
        `${Math.floor(CONFIRM_WINDOW_MS / 1000)}초 안에 누구든 ❌ 누르면 취소됩니다. (이의 없으면 자동 진행)\n` +
        `📍 채널: <#${currentVoice.id}>`,
      components: [row],
      withResponse: true,
    });

    try {
      const collected = await message.resource?.message?.awaitMessageComponent({
        filter: (i) => memberIds.has(i.user.id),
        componentType: ComponentType.Button,
        time: CONFIRM_WINDOW_MS,
      });
      // 누군가 ❌ 누름.
      await collected?.update({
        content: `❌ <@${collected.user.id}> 님이 팀나누기를 취소했습니다.`,
        components: [],
      });
      return false;
    } catch {
      // timeout = no objection → 진행.
      await interaction.editReply({
        content:
          `🎲 <@${interaction.user.id}> 님의 팀나누기 진행 중...\n` +
          `대상: ${mentions}`,
        components: [],
      });
      return true;
    }
  }

  /**
   * 현재 채널과 같은 카테고리의 빈 음성채널 우선, 없으면 길드 전체.
   * position 오름차순. 현재 채널 제외.
   */
  private findEmptyVoiceChannels(
    guild: Guild,
    currentChannel: VoiceBasedChannel,
  ): VoiceChannel[] {
    const allEmptyVoice = guild.channels.cache
      .filter(
        (c): c is VoiceChannel =>
          c.type === ChannelType.GuildVoice &&
          c.id !== currentChannel.id &&
          c.members.size === 0,
      )
      .sort((a, b) => a.position - b.position);

    const sameCategory = allEmptyVoice.filter(
      (c) => c.parentId === currentChannel.parentId,
    );
    if (sameCategory.size > 0) {
      return Array.from(sameCategory.values());
    }
    return Array.from(allEmptyVoice.values());
  }

  /** 각 그룹의 멤버를 대응 채널로 이동 (현재 채널과 같은 그룹은 자동 스킵). */
  private async moveMembers(
    groups: GuildMember[][],
    targets: VoiceChannel[],
  ): Promise<void> {
    for (let i = 0; i < groups.length; i += 1) {
      const target = targets[i];
      for (const member of groups[i]) {
        if (member.voice.channelId === target.id) continue;
        try {
          await member.voice.setChannel(target);
        } catch (err) {
          this.logger.warn(
            `Failed to move ${member.id} → ${target.id}: ${(err as Error).message}`,
          );
        }
      }
    }
  }
}

/** Fisher–Yates 셔플 (복사본 반환). */
function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
