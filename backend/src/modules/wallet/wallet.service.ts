import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import {
  POINT_TX_REASON,
  SINK_ACCOUNT_ID,
} from '../ledger/ledger.constants';

/**
 * 사용자 지갑 — LedgerService 위임자 (잔여 기능: 적립 + 랭킹).
 *
 * - addPoints: posts/scrim-results 등 내부 mint 진입점 (LedgerService.mint 위임)
 * - getActivityRanking: /wallet/ranking/activity 공개 endpoint 백엔드
 *
 * P2P 송금/잔액 조회/이력 조회는 사용자 페이지 폐기와 함께 제거됨 (Phase 5-A/5-D-cleanup).
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * 활동 포인트 랭킹 — pointsBalance 기준 상위 N.
   * SINK 계정은 제외.
   */
  async getActivityRanking(limit = 20): Promise<
    {
      userId: string;
      nickname: string | null;
      battleTag: string;
      avatarUrl: string | null;
      pointsBalance: string;
      rank: number;
    }[]
  > {
    const users = await this.userRepository
      .createQueryBuilder('u')
      .where('u.id != :sink', { sink: SINK_ACCOUNT_ID })
      .orderBy('CAST(u.points_balance AS BIGINT)', 'DESC')
      .limit(limit)
      .getMany();

    return users.map((u, idx) => ({
      userId: u.id,
      nickname: u.nickname ?? null,
      battleTag: u.battleTag ?? '',
      avatarUrl: u.avatarUrl ?? null,
      pointsBalance: u.pointsBalance ?? '0',
      rank: idx + 1,
    }));
  }

  /**
   * 적립 (mint). posts/scrim-results의 활동 보상 진입점.
   */
  async addPoints(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: string }> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive integer');
    }
    await this.ledger.mint(
      userId,
      BigInt(amount),
      reason || POINT_TX_REASON.ADMIN_ADJUST,
      {
        refType: 'WalletAdd',
      },
    );
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return { success: true, newBalance: user?.pointsBalance ?? '0' };
  }
}
