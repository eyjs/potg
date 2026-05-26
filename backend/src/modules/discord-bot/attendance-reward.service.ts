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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Discord 사용자 정보로 출석 보상 시도. 멱등.
   *
   * 동시성 보장:
   *   슬래시 /출석 와 음성 자동 출석이 동시에 트리거되어도 한 번만 지급된다.
   *   - 한 트랜잭션 내에서 User row 를 SELECT FOR UPDATE 로 잠금
   *   - 동일 KST 일자의 ATTENDANCE PointTx 존재 여부를 잠금 후 재검사
   *   - 통과 시 LedgerService.mint 를 같은 트랜잭션으로 호출
   *   - 두 번째 호출자는 first commit 후 재검사에서 already > 0 → alreadyClaimed
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
    // 가입 + SEED 지급은 자체 트랜잭션 (별 도메인 사이드이펙트).
    const { user } = await this.members.findOrCreate({
      discordId: input.discordId,
      username: input.username,
      avatarUrl: input.avatarUrl,
    });

    return this.dataSource.transaction(async (manager) => {
      // 1. User row 잠금 — 같은 user 의 동시 claimDaily 시리얼화.
      await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :id', { id: user.id })
        .getOne();

      // 2. 잠금 상태에서 오늘 출석 행 재검사.
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
        };
      }

      // 3. 보상 금액 조회.
      const amount = await this.systemConfig.getNumber(
        DAILY_ATTENDANCE_AMOUNT_KEY,
        DEFAULT_DAILY_AMOUNT,
      );
      if (amount <= 0) {
        throw new BadRequestException('출석 보상이 0으로 설정되어 있습니다.');
      }

      // 4. mint 를 같은 트랜잭션으로 호출 — User row 는 이미 우리가 잠금 보유 중.
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

      // 5. 갱신된 잔액 조회 (같은 트랜잭션 안에서 신뢰 가능).
      const updated = await manager
        .getRepository(User)
        .findOne({ where: { id: user.id } });
      const balance = BigInt(updated?.pointsBalance ?? '0');

      this.logger.log(
        `Attendance reward via ${input.source}: discord=${input.discordId} +${amount}P balance=${balance}`,
      );
      return {
        awarded: true,
        amount,
        balanceAfter: balance,
        alreadyClaimed: false,
      };
    });
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
