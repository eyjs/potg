import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { PointTx } from '../ledger/entities/point-tx.entity';
import { SystemConfigService } from '../system-config/system-config.service';
import { DiscordMemberService } from './discord-member.service';

const DAILY_ATTENDANCE_AMOUNT_KEY = 'DAILY_ATTENDANCE_AMOUNT';
const DEFAULT_DAILY_AMOUNT = 50;

export interface AttendanceClaimResult {
  awarded: boolean;
  amount: number;
  balanceAfter: bigint;
  /** 이미 출석한 경우 true. */
  alreadyClaimed: boolean;
}

/**
 * 일일 출석 보상 공통 로직.
 *
 * `/출석` 슬래시 명령과 음성채널 자동 출석에서 공유한다.
 * 동일한 멱등성 보장: KST 자정 기준 PointTx ATTENDANCE reason 행이 있으면 이미 출석.
 */
@Injectable()
export class AttendanceRewardService {
  private readonly logger = new Logger(AttendanceRewardService.name);

  constructor(
    private readonly members: DiscordMemberService,
    private readonly ledger: LedgerService,
    private readonly systemConfig: SystemConfigService,
    @InjectRepository(PointTx)
    private readonly pointTxRepo: Repository<PointTx>,
  ) {}

  /**
   * Discord 사용자 정보로 출석 보상 시도. 멱등.
   *
   * @returns awarded=true (지급) / alreadyClaimed=true (오늘 이미 출석)
   */
  async claimDaily(input: {
    discordId: string;
    username: string;
    avatarUrl?: string;
    /** memo로 기록될 출처 — 'slash' | 'voice' */
    source: 'slash' | 'voice';
  }): Promise<AttendanceClaimResult> {
    const { user } = await this.members.findOrCreate({
      discordId: input.discordId,
      username: input.username,
      avatarUrl: input.avatarUrl,
    });

    const today = startOfTodayKst();
    const already = await this.pointTxRepo
      .createQueryBuilder('tx')
      .where('tx.to_account = :uid', { uid: user.id })
      .andWhere('tx.reason = :r', { r: POINT_TX_REASON.ATTENDANCE })
      .andWhere('tx.created_at >= :d', { d: today })
      .getCount();

    if (already > 0) {
      const balance = await this.ledger.getBalance(user.id);
      return {
        awarded: false,
        amount: 0,
        balanceAfter: balance,
        alreadyClaimed: true,
      };
    }

    const amount = await this.systemConfig.getNumber(
      DAILY_ATTENDANCE_AMOUNT_KEY,
      DEFAULT_DAILY_AMOUNT,
    );
    if (amount <= 0) {
      throw new BadRequestException('출석 보상이 0으로 설정되어 있습니다.');
    }

    await this.ledger.mint(
      user.id,
      BigInt(amount),
      POINT_TX_REASON.ATTENDANCE,
      {
        refType: 'User',
        refId: user.id,
        memo: `discord:${input.discordId}:${input.source}`,
      },
    );

    const balance = await this.ledger.getBalance(user.id);
    this.logger.log(
      `Attendance reward via ${input.source}: discord=${input.discordId} +${amount}P balance=${balance}`,
    );
    return {
      awarded: true,
      amount,
      balanceAfter: balance,
      alreadyClaimed: false,
    };
  }
}

/**
 * KST 자정 기준 오늘 시작 시각 (UTC Date 객체).
 */
function startOfTodayKst(): Date {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const kstMidnight = Date.UTC(
    nowKst.getUTCFullYear(),
    nowKst.getUTCMonth(),
    nowKst.getUTCDate(),
  );
  return new Date(kstMidnight - KST_OFFSET_MS);
}
