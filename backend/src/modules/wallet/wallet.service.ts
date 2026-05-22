import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PointTx } from '../ledger/entities/point-tx.entity';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON, SINK_ACCOUNT_ID } from '../ledger/ledger.constants';
import { SendPointDto } from './dto/send-point.dto';

/**
 * 사용자 지갑 — LedgerService 위임자.
 *
 * - 잔액 = user.points_balance (Ledger가 갱신하는 캐시)
 * - 이력 = PointTx (from/to 어느 쪽이든 user.id 매치)
 * - 전송 = LedgerService.transfer 위임
 *
 * ClanMember/PointLog 의존은 모두 제거됨.
 * activity ranking은 user.pointsBalance 기준 단순 정렬로 재구성.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PointTx)
    private readonly pointTxRepository: Repository<PointTx>,
    private readonly ledger: LedgerService,
  ) {}

  async getBalance(userId: string): Promise<{
    userId: string;
    balance: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { userId: user.id, balance: user.pointsBalance ?? '0' };
  }

  async sendPoints(senderId: string, dto: SendPointDto) {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Cannot send points to yourself');
    }
    if (!Number.isInteger(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('amount must be a positive integer');
    }

    const recipient = await this.userRepository.findOne({
      where: { id: dto.recipientId },
    });
    if (!recipient) throw new BadRequestException('Recipient not found');

    const tx = await this.ledger.transfer({
      fromAccount: senderId,
      toAccount: dto.recipientId,
      amount: BigInt(dto.amount),
      reason: 'P2P_SEND',
      refType: 'WalletSend',
      memo: dto.message,
    });

    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    return {
      success: true,
      amount: dto.amount,
      txId: tx.id,
      newBalance: sender?.pointsBalance ?? '0',
    };
  }

  async getHistory(userId: string, limit = 100): Promise<PointTx[]> {
    return this.pointTxRepository
      .createQueryBuilder('tx')
      .where('tx.from_account = :id', { id: userId })
      .orWhere('tx.to_account = :id', { id: userId })
      .orderBy('tx.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

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
   * 적립 (mint). reason 접두사별 일일 상한은 추후 SystemConfig로 이관 (Phase 4).
   */
  async addPoints(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: string }> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive integer');
    }
    await this.ledger.mint(userId, BigInt(amount), reason || POINT_TX_REASON.ADMIN_ADJUST, {
      refType: 'WalletAdd',
    });
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return { success: true, newBalance: user?.pointsBalance ?? '0' };
  }
}
