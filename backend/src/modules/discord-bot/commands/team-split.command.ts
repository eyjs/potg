import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  VoiceChannel,
} from 'discord.js';
import type { SlashCommand } from '../interfaces/slash-command.interface';

const MIN_GROUPS = 2;
const MAX_GROUPS = 4;

/**
 * 음성채널 멤버를 무작위로 N개 그룹으로 분할.
 *
 * 사용:
 *   /팀나누기 — 호출자의 현재 음성채널 멤버를 2그룹으로 무작위 분할, 결과만 표시
 *   /팀나누기 [그룹수] — N개 그룹 (2~4)
 *   /팀나누기 [그룹수] [채널A] [채널B] ...
 *     → 채널이 그룹수만큼 주어지면 각 그룹을 해당 음성채널로 강제 이동.
 *     → 봇이 `Move Members` 권한 필요. 부족하면 결과만 표시하고 안내.
 *
 * 봇 자기 자신은 분할 대상에서 제외.
 */
@Injectable()
export class TeamSplitCommand implements SlashCommand {
  private readonly logger = new Logger(TeamSplitCommand.name);

  readonly definition = new SlashCommandBuilder()
    .setName('팀나누기')
    .setDescription('현재 음성채널 인원을 무작위로 N그룹 분할')
    .addIntegerOption((o) =>
      o
        .setName('그룹수')
        .setDescription(`나눌 그룹 수 (${MIN_GROUPS}~${MAX_GROUPS}, 기본 2)`)
        .setMinValue(MIN_GROUPS)
        .setMaxValue(MAX_GROUPS),
    )
    .addChannelOption((o) =>
      o
        .setName('이동1')
        .setDescription('그룹 1을 이동시킬 음성채널 (선택)')
        .addChannelTypes(ChannelType.GuildVoice),
    )
    .addChannelOption((o) =>
      o
        .setName('이동2')
        .setDescription('그룹 2를 이동시킬 음성채널 (선택)')
        .addChannelTypes(ChannelType.GuildVoice),
    )
    .addChannelOption((o) =>
      o
        .setName('이동3')
        .setDescription('그룹 3을 이동시킬 음성채널 (선택)')
        .addChannelTypes(ChannelType.GuildVoice),
    )
    .addChannelOption((o) =>
      o
        .setName('이동4')
        .setDescription('그룹 4를 이동시킬 음성채널 (선택)')
        .addChannelTypes(ChannelType.GuildVoice),
    );

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.inCachedGuild()) {
      throw new BadRequestException('서버에서만 사용할 수 있습니다.');
    }

    const groupCount = interaction.options.getInteger('그룹수') ?? MIN_GROUPS;

    // 호출자의 현재 음성채널 조회.
    const callerMember = interaction.member;
    const callerVoiceChannel = callerMember.voice.channel;
    if (!callerVoiceChannel) {
      await interaction.editReply(
        '먼저 음성채널에 입장한 후 이 명령을 사용하세요.',
      );
      return;
    }

    // 봇 제외, 음성채널 멤버 수집.
    const members = Array.from(callerVoiceChannel.members.values()).filter(
      (m) => !m.user.bot,
    );
    if (members.length < groupCount) {
      await interaction.editReply(
        `음성채널 인원(${members.length}명)이 그룹 수(${groupCount})보다 적습니다.`,
      );
      return;
    }

    // 목적지 채널 옵션 수집 — 그룹 수와 일치해야 강제 이동.
    const targetChannels: (VoiceChannel | null)[] = [];
    for (let i = 1; i <= groupCount; i += 1) {
      const ch = interaction.options.getChannel(`이동${i}`);
      // ChannelOption + addChannelTypes 로 GuildVoice 만 들어옴.
      targetChannels.push(ch && ch.type === ChannelType.GuildVoice ? ch : null);
    }
    const allTargetsProvided = targetChannels.every((c) => c !== null);

    // 셔플 → N분할.
    const shuffled = shuffle(members);
    const groups: GuildMember[][] = Array.from(
      { length: groupCount },
      () => [],
    );
    shuffled.forEach((member, idx) => {
      groups[idx % groupCount].push(member);
    });

    // 강제 이동 시도.
    let moved = false;
    let moveError: string | null = null;
    if (allTargetsProvided) {
      const botMember = interaction.guild.members.me;
      const canMove =
        botMember?.permissions.has(PermissionFlagsBits.MoveMembers) ?? false;
      if (!canMove) {
        moveError = '봇에 "멤버 이동" 권한이 없어 강제 이동을 건너뜁니다.';
      } else {
        await this.moveMembers(groups, targetChannels);
        moved = true;
      }
    }

    // 결과 임베드.
    const embed = new EmbedBuilder()
      .setTitle('🎲 팀 나누기 결과')
      .setColor(0xf99e1a)
      .setDescription(
        [
          `채널: <#${callerVoiceChannel.id}>`,
          `참가 인원: ${members.length}명 → ${groupCount}그룹`,
          moved ? '✅ 강제 이동 완료' : null,
          moveError,
        ]
          .filter((line): line is string => !!line)
          .join('\n'),
      );

    groups.forEach((group, idx) => {
      const target = targetChannels[idx];
      const header =
        moved && target
          ? `그룹 ${idx + 1} → <#${target.id}>`
          : `그룹 ${idx + 1}`;
      embed.addFields({
        name: header,
        value:
          group.length > 0
            ? group.map((m) => `<@${m.id}>`).join(', ')
            : '_(비어있음)_',
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }

  /**
   * 각 그룹의 멤버를 대응되는 목적지 채널로 이동.
   * 개별 실패는 로깅하고 계속 (전체 실패로 전파하지 않음).
   */
  private async moveMembers(
    groups: GuildMember[][],
    targets: VoiceChannel[],
  ): Promise<void> {
    for (let i = 0; i < groups.length; i += 1) {
      const target = targets[i];
      for (const member of groups[i]) {
        // 이미 목적지에 있으면 스킵.
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

/** Fisher–Yates 셔플 (in-place 변경 회피 위해 복사본 반환). */
function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
