import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { PointTx } from '../ledger/entities/point-tx.entity';
import { User } from '../users/entities/user.entity';
import { SystemConfigService } from '../system-config/system-config.service';
import { DiscordMemberService } from './discord-member.service';

const DAILY_ATTENDANCE_AMOUNT_KEY = 'DAILY_ATTENDANCE_AMOUNT';
const DEFAULT_DAILY_AMOUNT = 50;

const STREAK_3_BONUS_KEY = 'STREAK_3_BONUS';
const STREAK_5_BONUS_KEY = 'STREAK_5_BONUS';
const STREAK_10_BONUS_KEY = 'STREAK_10_BONUS';
const DEFAULT_STREAK_BONUSES: Record<number, number> = {
  3: 100,
  5: 300,
  10: 500,
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const KST_TIMEZONE = 'Asia/Seoul';

export interface AttendanceClaimResult {
  awarded: boolean;
  amount: number;
  balanceAfter: bigint;
  /** 이미 출석한 경우 true. */
  alreadyClaimed: boolean;
  /** 오늘 출석을 포함한 연속 일수 (awarded=true 일 때만 의미). */
  streakDays: number;
  /** 이번 출석으로 도달한 streak 마일스톤(3/5/10) 보너스. 없으면 0. */
  streakBonus: number;
}

/**
 * 일일 출석 보상 공통 로직.
 *
 * `/출석` 슬래시 명령과 음성채널 자동 출석에서 공유한다.
 *
 * 동시성 보장:
 *   - User row SELECT FOR UPDATE 로 시리얼화
 *   - 같은 KST 일자의 ATTENDANCE PointTx 존재 여부를 잠금 후 재검사
 *
 * 연속 출석 보너스:
 *   - 보상 mint 직후 KST 일자별로 ATTENDANCE 행을 group by 하여 streak 계산
 *   - 오늘을 포함한 streak 가 3/5/10 인 경우 SystemConfig 키 (STREAK_N_BONUS)
 *     의 추가 보너스를 STREAK_BONUS reason 으로 mint
 *   - 11일째 이후는 추가 보너스 없음 (10일 cycle)
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
    private readonly dataSource: DataSource,
  ) {}

  async claimDaily(input: {
    discordId: string;
    username: string;
    avatarUrl?: string;
    source: 'slash' | 'voice';
  }): Promise<AttendanceClaimResult> {
    const { user } = await this.members.findOrCreate({
      discordId: input.discordId,
      username: input.username,
      avatarUrl: input.avatarUrl,
    });

    return this.dataSource.transaction(async (manager) => {
      // 1. User row 잠금.
      await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :id', { id: user.id })
        .getOne();

      // 2. 오늘 출석 행 재검사.
      const today = startOfTodayKst();
      const already = await manager
        .getRepository(PointTx)
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
          streakDays: 0,
          streakBonus: 0,
        };
      }

      // 3. 기본 보상.
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
          manager,
        },
      );

      // 4. 연속 출석 streak 계산 + 보너스.
      const streakDays = await this.calculateStreakDays(manager, user.id);
      const streakBonus = await this.maybeApplyStreakBonus(
        manager,
        user.id,
        streakDays,
      );

      // 5. 갱신된 잔액.
      const updated = await manager
        .getRepository(User)
        .findOne({ where: { id: user.id } });
      const balance = BigInt(updated?.pointsBalance ?? '0');

      this.logger.log(
        `Attendance ${input.source}: discord=${input.discordId} +${amount}P streak=${streakDays}${streakBonus > 0 ? ` +bonus${streakBonus}P` : ''} balance=${balance}`,
      );
      return {
        awarded: true,
        amount,
        balanceAfter: balance,
        alreadyClaimed: false,
        streakDays,
        streakBonus,
      };
    });
  }

  /**
   * 오늘을 포함한 연속 KST 일자 수 계산.
   * 최근 11일치 ATTENDANCE PointTx 행만 조회 (10일 cycle + 안전 마진).
   */
  private async calculateStreakDays(
    manager: import('typeorm').EntityManager,
    userId: string,
  ): Promise<number> {
    const sinceDate = new Date();
    sinceDate.setUTCDate(sinceDate.getUTCDate() - 11);

    const rows = await manager
      .getRepository(PointTx)
      .createQueryBuilder('tx')
      .select(
        `DISTINCT to_char(tx.created_at AT TIME ZONE '${KST_TIMEZONE}', 'YYYY-MM-DD')`,
        'day',
      )
      .where('tx.to_account = :uid', { uid: userId })
      .andWhere('tx.reason = :r', { r: POINT_TX_REASON.ATTENDANCE })
      .andWhere('tx.created_at >= :since', { since: sinceDate })
      .orderBy('day', 'DESC')
      .getRawMany<{ day: string }>();

    const daySet = new Set(rows.map((r) => r.day));

    // 오늘부터 역순으로 연속 일자 카운트.
    let streak = 0;
    const cursor = new Date(Date.now() + KST_OFFSET_MS);
    for (let i = 0; i < 11; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      if (daySet.has(key)) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  /**
   * streak 가 3/5/10 마일스톤이면 SystemConfig 값을 읽어 추가 mint.
   * @returns 지급한 보너스 금액 (없으면 0)
   */
  private async maybeApplyStreakBonus(
    manager: import('typeorm').EntityManager,
    userId: string,
    streakDays: number,
  ): Promise<number> {
    if (streakDays !== 3 && streakDays !== 5 && streakDays !== 10) {
      return 0;
    }
    const key =
      streakDays === 3
        ? STREAK_3_BONUS_KEY
        : streakDays === 5
          ? STREAK_5_BONUS_KEY
          : STREAK_10_BONUS_KEY;
    const bonus = await this.systemConfig.getNumber(
      key,
      DEFAULT_STREAK_BONUSES[streakDays],
    );
    if (bonus <= 0) return 0;

    await this.ledger.mint(
      userId,
      BigInt(bonus),
      POINT_TX_REASON.STREAK_BONUS,
      {
        refType: 'User',
        refId: userId,
        memo: `streak=${streakDays}`,
        manager,
      },
    );
    return bonus;
  }
}

/**
 * KST 자정 기준 오늘 시작 시각 (UTC Date 객체).
 */
function startOfTodayKst(): Date {
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const kstMidnight = Date.UTC(
    nowKst.getUTCFullYear(),
    nowKst.getUTCMonth(),
    nowKst.getUTCDate(),
  );
  return new Date(kstMidnight - KST_OFFSET_MS);
}
