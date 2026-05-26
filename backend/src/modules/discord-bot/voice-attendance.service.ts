import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Events, type VoiceState } from 'discord.js';
import { DiscordClientService } from './discord-client.service';
import { AttendanceRewardService } from './attendance-reward.service';

const POLL_INTERVAL_MS = 60_000; // 1분 주기로 in-channel 사용자 체크
const CLIENT_ATTACH_RETRY_INTERVAL_MS = 1_000;
const CLIENT_ATTACH_MAX_RETRIES = 300; // 1초 × 300 = 5분. 그 이상이면 봇 토큰/네트워크 영구 문제로 판단

interface VoicePresence {
  /** 봇이 인지한 첫 입장 시각 (ms epoch). 봇 재시작 후 또는 새로 입장한 시점. */
  joinedAt: number;
  username: string;
  avatarUrl: string;
  /** 이번 입장 세션에서 출석 보상을 이미 지급했는지 (재입장 방지 — 일일 멱등은 ledger에서). */
  rewardClaimed: boolean;
}

/**
 * 음성채널 자동 출석.
 *
 * 동작:
 *   - VoiceStateUpdate 이벤트로 입장/이동/퇴장 추적 (in-memory Map<discordId, VoicePresence>)
 *   - 1분 주기 polling으로 in-channel 사용자의 누적 체류시간을 체크
 *   - DISCORD_VOICE_ATTENDANCE_MIN_MINUTES(default 10) 도달 + 오늘 미출석 → AttendanceRewardService.claimDaily
 *   - 봇 자기 자신 / bot user는 제외
 *
 * 운영 메모:
 *   - in-memory Map은 봇 재시작 시 소실. 재시작 시점에 음성에 있는 유저는 그 시점부터 시간 카운트
 *   - 출석 멱등성은 PointTx ATTENDANCE 행으로 보장 (`AttendanceRewardService`)
 *   - 사용자 DM 알림은 silent 실패 (DM 차단 등 흔함)
 */
@Injectable()
export class VoiceAttendanceService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(VoiceAttendanceService.name);
  private readonly presence = new Map<string, VoicePresence>();
  private pollTimer?: NodeJS.Timeout;
  private attachTimer?: NodeJS.Timeout;
  private attachRetries = 0;
  private voiceListener?: (oldState: VoiceState, newState: VoiceState) => void;

  constructor(
    private readonly config: ConfigService,
    private readonly discord: DiscordClientService,
    private readonly reward: AttendanceRewardService,
  ) {}

  private get minStayMs(): number {
    const min =
      this.config.get<number>('DISCORD_VOICE_ATTENDANCE_MIN_MINUTES') ?? 10;
    return Number(min) * 60_000;
  }

  onApplicationBootstrap(): void {
    if (!this.discord.isEnabled()) {
      this.logger.log(
        'Discord bot disabled — voice attendance tracking skipped.',
      );
      return;
    }

    // DiscordClientService 의 client 가 준비될 때까지 대기.
    // onApplicationBootstrap 시점엔 client.login()이 비동기로 진행 중일 수 있으므로
    // 짧은 polling 으로 client 가 ready 되면 핸들러를 부착한다.
    // 토큰 무효 등으로 영구 실패 시 CLIENT_ATTACH_MAX_RETRIES 후 포기 (무한 polling 방지).
    this.scheduleAttach();
  }

  private scheduleAttach(): void {
    const client = this.discord.getClient();
    if (client) {
      this.attachListeners(client);
      return;
    }

    if (this.attachRetries >= CLIENT_ATTACH_MAX_RETRIES) {
      this.logger.error(
        `Discord client not ready after ${CLIENT_ATTACH_MAX_RETRIES} retries — voice attendance disabled. Check DISCORD_BOT_TOKEN.`,
      );
      return;
    }
    this.attachRetries += 1;
    this.attachTimer = setTimeout(
      () => this.scheduleAttach(),
      CLIENT_ATTACH_RETRY_INTERVAL_MS,
    );
  }

  private attachListeners(
    client: NonNullable<ReturnType<DiscordClientService['getClient']>>,
  ): void {
    this.voiceListener = (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState).catch((err) => {
        this.logger.error(
          `VoiceStateUpdate handler failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
      });
    };
    client.on(Events.VoiceStateUpdate, this.voiceListener);
    this.logger.log(
      `Voice attendance tracking enabled (min stay ${this.minStayMs / 60_000} min)`,
    );

    this.pollTimer = setInterval(() => {
      this.checkAccumulated().catch((err) => {
        this.logger.error(
          `Voice poll failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
      });
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.attachTimer) {
      clearTimeout(this.attachTimer);
      this.attachTimer = undefined;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    // VoiceStateUpdate 리스너 detach (재시작/hot-reload 시 누적 방지)
    const client = this.discord.getClient();
    if (client && this.voiceListener) {
      client.off(Events.VoiceStateUpdate, this.voiceListener);
      this.voiceListener = undefined;
    }
    this.presence.clear();
  }

  private async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const discordId = member.id;
    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;

    // 입장 (null → channel)
    if (!oldChannel && newChannel) {
      this.presence.set(discordId, {
        joinedAt: Date.now(),
        username: member.user.username,
        avatarUrl: member.user.displayAvatarURL({ size: 256 }),
        rewardClaimed: false,
      });
      this.logger.debug(`Voice JOIN: ${discordId} → ${newChannel}`);
      return;
    }

    // 퇴장 (channel → null)
    if (oldChannel && !newChannel) {
      const presence = this.presence.get(discordId);
      this.presence.delete(discordId);
      if (!presence) return;
      const stayMs = Date.now() - presence.joinedAt;
      this.logger.debug(
        `Voice LEAVE: ${discordId} stayed ${Math.floor(stayMs / 1000)}s`,
      );
      if (!presence.rewardClaimed && stayMs >= this.minStayMs) {
        await this.tryAward(discordId, presence);
      }
      return;
    }

    // 채널 이동 (channel A → channel B): joinedAt 유지
  }

  /**
   * 주기적으로 현재 음성채널에 머무는 사용자의 누적 시간을 체크하여,
   * 최소 체류 시간에 도달하면 즉시 출석 보상을 지급한다 (퇴장 전이라도).
   */
  private async checkAccumulated(): Promise<void> {
    const now = Date.now();
    for (const [discordId, presence] of this.presence.entries()) {
      if (presence.rewardClaimed) continue;
      if (now - presence.joinedAt < this.minStayMs) continue;
      await this.tryAward(discordId, presence);
    }
  }

  private async tryAward(
    discordId: string,
    presence: VoicePresence,
  ): Promise<void> {
    try {
      const result = await this.reward.claimDaily({
        discordId,
        username: presence.username,
        avatarUrl: presence.avatarUrl,
        source: 'voice',
      });
      presence.rewardClaimed = true; // 이번 세션 중복 호출 방지
      if (result.awarded) {
        this.logger.log(
          `Voice attendance awarded: discord=${discordId} +${result.amount}P streak=${result.streakDays}${result.streakBonus > 0 ? ` +bonus${result.streakBonus}P` : ''}`,
        );
        await this.notifyUser(discordId, result);
      }
    } catch (err) {
      this.logger.error(
        `Failed to award voice attendance for ${discordId}: ${(err as Error).message}`,
      );
    }
  }

  private async notifyUser(
    discordId: string,
    result: {
      amount: number;
      balanceAfter: bigint;
      streakDays: number;
      streakBonus: number;
    },
  ): Promise<void> {
    const client = this.discord.getClient();
    if (!client) return;
    try {
      const user = await client.users.fetch(discordId);
      const lines = [
        `🎙️ 음성채널 출석 완료! \`+${result.amount} P\``,
        `🔥 연속 ${result.streakDays}일`,
      ];
      if (result.streakBonus > 0) {
        lines.push(
          `🎁 **${result.streakDays}연속 보너스** \`+${result.streakBonus} P\``,
        );
      }
      lines.push(`잔액: **${result.balanceAfter.toString()} P**`);
      await user.send(lines.join('\n'));
    } catch {
      // DM 차단 등은 silent
    }
  }
}
