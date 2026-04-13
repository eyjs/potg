import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';
import { SendPointDto } from './dto/send-point.dto';

/** Daily limits for point rewards by reason prefix */
const DAILY_LIMITS: Record<string, number> = {
  COMMUNITY_POST: 5,
  COMMUNITY_COMMENT: 20,
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(ClanMember)
    private clanMemberRepository: Repository<ClanMember>,
    @InjectRepository(PointLog)
    private pointLogRepository: Repository<PointLog>,
    private dataSource: DataSource,
  ) {}

  async sendPoints(senderId: string, sendDto: SendPointDto) {
    if (senderId === sendDto.recipientId) {
      throw new BadRequestException('Cannot send points to yourself');
    }

    return this.dataSource.transaction(async (manager) => {
      const sender = await manager.findOne(ClanMember, {
        where: { userId: senderId, clanId: sendDto.clanId },
      });
      const recipient = await manager.findOne(ClanMember, {
        where: { userId: sendDto.recipientId, clanId: sendDto.clanId },
      });

      if (!sender) throw new BadRequestException('Sender not found in clan');
      if (!recipient)
        throw new BadRequestException('Recipient not found in clan');
      if (sender.totalPoints < sendDto.amount)
        throw new BadRequestException('Insufficient points');

      // Transfer points
      sender.totalPoints -= sendDto.amount;
      recipient.totalPoints += sendDto.amount;

      await manager.save(sender);
      await manager.save(recipient);

      // Log for sender
      const senderLog = manager.create(PointLog, {
        userId: senderId,
        clanId: sendDto.clanId,
        amount: -sendDto.amount,
        reason: `SEND_TO:${sendDto.recipientId}${sendDto.message ? ` - ${sendDto.message}` : ''}`,
      });
      await manager.save(senderLog);

      // Log for recipient
      const recipientLog = manager.create(PointLog, {
        userId: sendDto.recipientId,
        clanId: sendDto.clanId,
        amount: sendDto.amount,
        reason: `RECEIVE_FROM:${senderId}${sendDto.message ? ` - ${sendDto.message}` : ''}`,
      });
      await manager.save(recipientLog);

      return {
        success: true,
        amount: sendDto.amount,
        newBalance: sender.totalPoints,
      };
    });
  }

  async getHistory(userId: string, clanId: string) {
    return this.pointLogRepository.find({
      where: { userId, clanId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Add activity points to a clan member with optional daily limit enforcement.
   * Used for community post/comment rewards.
   */
  async addPoints(
    userId: string,
    clanId: string,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean; newBalance: number; message?: string }> {
    const reasonPrefix = reason.split(':')[0];
    const dailyLimit = DAILY_LIMITS[reasonPrefix];

    if (dailyLimit !== undefined) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayCount = await this.pointLogRepository.count({
        where: {
          userId,
          clanId,
          reason: reason.startsWith(reasonPrefix) ? undefined : reason,
          createdAt: Between(todayStart, todayEnd),
        },
      });

      // Count all logs with the same prefix today
      const countQuery = await this.pointLogRepository
        .createQueryBuilder('log')
        .where('log.userId = :userId', { userId })
        .andWhere('log.clanId = :clanId', { clanId })
        .andWhere('log.reason LIKE :prefix', { prefix: `${reasonPrefix}%` })
        .andWhere('log.createdAt BETWEEN :start AND :end', {
          start: todayStart,
          end: todayEnd,
        })
        .getCount();

      if (countQuery >= dailyLimit) {
        this.logger.debug(
          `Daily limit reached for ${reasonPrefix}: ${countQuery}/${dailyLimit} (user: ${userId})`,
        );
        const member = await this.clanMemberRepository.findOne({
          where: { userId, clanId },
        });
        return {
          success: false,
          newBalance: member?.totalPoints ?? 0,
          message: `일일 포인트 획득 상한에 도달했습니다 (${dailyLimit}회/일)`,
        };
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(ClanMember, {
        where: { userId, clanId },
      });

      if (!member) {
        throw new BadRequestException('클랜 멤버를 찾을 수 없습니다.');
      }

      member.totalPoints += amount;
      await manager.save(member);

      const log = manager.create(PointLog, {
        userId,
        clanId,
        amount,
        reason,
      });
      await manager.save(log);

      return { success: true, newBalance: member.totalPoints };
    });
  }

  /**
   * Add both activity points and scrim points for scrim results.
   * Used when confirming scrim results.
   */
  async addScrimPoints(
    userId: string,
    clanId: string,
    activityPoints: number,
    scrimPoints: number,
    reason: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(ClanMember, {
        where: { userId, clanId },
      });

      if (!member) {
        throw new BadRequestException('클랜 멤버를 찾을 수 없습니다.');
      }

      member.totalPoints += activityPoints;
      member.scrimPoints += scrimPoints;
      await manager.save(member);

      const log = manager.create(PointLog, {
        userId,
        clanId,
        amount: activityPoints,
        reason,
      });
      await manager.save(log);
    });
  }

  /**
   * Get activity points ranking for a clan (ordered by totalPoints).
   */
  async getActivityRanking(
    clanId: string,
    limit = 20,
  ): Promise<
    {
      userId: string;
      nickname: string | null;
      battleTag: string;
      avatarUrl: string | null;
      totalPoints: number;
      scrimPoints: number;
      rank: number;
    }[]
  > {
    const members = await this.clanMemberRepository
      .createQueryBuilder('cm')
      .leftJoinAndSelect('cm.user', 'user')
      .where('cm.clanId = :clanId', { clanId })
      .orderBy('cm.totalPoints', 'DESC')
      .take(limit)
      .getMany();

    return members.map((m, index) => ({
      userId: m.userId,
      nickname: m.user?.nickname ?? null,
      battleTag: m.user?.battleTag ?? '',
      avatarUrl: m.user?.avatarUrl ?? null,
      totalPoints: m.totalPoints,
      scrimPoints: m.scrimPoints,
      rank: index + 1,
    }));
  }

  /**
   * Get scrim points ranking for a clan (ordered by scrimPoints).
   */
  async getScrimRanking(
    clanId: string,
    limit = 20,
  ): Promise<
    {
      userId: string;
      nickname: string | null;
      battleTag: string;
      avatarUrl: string | null;
      totalPoints: number;
      scrimPoints: number;
      rank: number;
    }[]
  > {
    const members = await this.clanMemberRepository
      .createQueryBuilder('cm')
      .leftJoinAndSelect('cm.user', 'user')
      .where('cm.clanId = :clanId', { clanId })
      .andWhere('cm.scrimPoints > 0')
      .orderBy('cm.scrimPoints', 'DESC')
      .take(limit)
      .getMany();

    return members.map((m, index) => ({
      userId: m.userId,
      nickname: m.user?.nickname ?? null,
      battleTag: m.user?.battleTag ?? '',
      avatarUrl: m.user?.avatarUrl ?? null,
      totalPoints: m.totalPoints,
      scrimPoints: m.scrimPoints,
      rank: index + 1,
    }));
  }
}
