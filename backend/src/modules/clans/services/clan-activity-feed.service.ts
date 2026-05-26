import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClanMember } from '../entities/clan-member.entity';
import { Announcement } from '../entities/announcement.entity';
import { PointTx } from '../../ledger/entities/point-tx.entity';
import { ActivityType } from '../interfaces/activity.interface';
import type { ActivityEvent } from '../interfaces/activity.interface';

/**
 * 클랜 활동 피드 조립 서비스.
 *
 * 멤버 가입 / PointTx (포인트 이동) / 공지사항을 병렬 조회하여
 * 단일 정렬된 ActivityEvent[] 스트림으로 반환한다.
 *
 * 읽기 전용 — 트랜잭션 불필요.
 */
@Injectable()
export class ClanActivityFeedService {
  constructor(
    @InjectRepository(ClanMember)
    private clanMembersRepository: Repository<ClanMember>,
    @InjectRepository(Announcement)
    private announcementsRepository: Repository<Announcement>,
    @InjectRepository(PointTx)
    private pointTxRepository: Repository<PointTx>,
  ) {}

  async getActivities(
    clanId: string,
    userId: string,
    limit: number = 20,
  ): Promise<ActivityEvent[]> {
    const membership = await this.clanMembersRepository.findOne({
      where: { clanId, userId },
    });
    if (!membership) {
      throw new ForbiddenException(
        '클랜 멤버만 활동 피드를 조회할 수 있습니다.',
      );
    }

    const memberUserIds = (
      await this.clanMembersRepository.find({
        where: { clanId },
        select: ['userId'],
      })
    ).map((m) => m.userId);

    const [members, pointTxs, announcements] = await Promise.all([
      this.clanMembersRepository.find({
        where: { clanId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      memberUserIds.length === 0
        ? Promise.resolve([])
        : this.pointTxRepository
            .createQueryBuilder('tx')
            .where(
              'tx.from_account IN (:...ids) OR tx.to_account IN (:...ids)',
              { ids: memberUserIds },
            )
            .orderBy('tx.created_at', 'DESC')
            .take(limit)
            .getMany(),
      this.announcementsRepository.find({
        where: { isActive: true },
        relations: ['author'],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
    ]);

    const events: ActivityEvent[] = [
      ...this.buildMemberEvents(members),
      ...this.buildPointTxEvents(pointTxs, new Set(memberUserIds)),
      ...this.buildAnnouncementEvents(announcements),
    ];

    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return events.slice(0, limit);
  }

  private buildMemberEvents(members: ClanMember[]): ActivityEvent[] {
    if (members.length === 0) return [];
    const oldestCreatedAt = Math.min(
      ...members.map((m) => m.createdAt.getTime()),
    );

    return members.map((member) => {
      const isCreator = member.createdAt.getTime() === oldestCreatedAt;
      const type = isCreator
        ? ActivityType.CLAN_CREATE
        : ActivityType.MEMBER_JOIN;
      const tag = member.user?.battleTag ?? '알 수 없음';
      const message = isCreator
        ? `${tag}님이 클랜을 생성했습니다.`
        : `${tag}님이 클랜에 가입했습니다.`;

      return {
        id: member.id,
        type,
        userId: member.userId,
        userBattleTag: member.user?.battleTag ?? '알 수 없음',
        userAvatarUrl: member.user?.avatarUrl ?? null,
        message,
        amount: null,
        createdAt: member.createdAt,
      };
    });
  }

  private buildPointTxEvents(
    pointTxs: PointTx[],
    memberUserIdSet: Set<string>,
  ): ActivityEvent[] {
    const events: ActivityEvent[] = [];
    for (const tx of pointTxs) {
      const isInflow =
        tx.toAccount !== null && memberUserIdSet.has(tx.toAccount);
      const focusUserId = isInflow
        ? (tx.toAccount as string)
        : (tx.fromAccount ?? '');
      if (!focusUserId) continue;
      const amount = Number(tx.amount);
      events.push({
        id: tx.id,
        type: this.resolvePointTxActivityType(tx.reason, isInflow),
        userId: focusUserId,
        userBattleTag: '',
        userAvatarUrl: null,
        message: this.buildPointTxMessage(tx, isInflow),
        amount: isInflow ? amount : -amount,
        createdAt: tx.createdAt,
      });
    }
    return events;
  }

  private buildAnnouncementEvents(
    announcements: Announcement[],
  ): ActivityEvent[] {
    return announcements.map((ann) => ({
      id: ann.id,
      type: ActivityType.ANNOUNCEMENT,
      userId: ann.authorId,
      userBattleTag: ann.author?.battleTag ?? '알 수 없음',
      userAvatarUrl: ann.author?.avatarUrl ?? null,
      message: `공지: ${ann.title}`,
      amount: null,
      createdAt: ann.createdAt,
    }));
  }

  private resolvePointTxActivityType(
    reason: string,
    isInflow: boolean,
  ): ActivityType {
    if (reason === 'BET_PAYOUT') return ActivityType.BET_WIN;
    if (reason === 'BET_STAKE') return ActivityType.BET_LOSS;
    return isInflow ? ActivityType.POINT_RECEIVED : ActivityType.POINT_SENT;
  }

  private buildPointTxMessage(tx: PointTx, isInflow: boolean): string {
    const amount = Number(tx.amount);
    if (tx.reason === 'BET_PAYOUT')
      return `베팅 정산으로 ${amount}P를 획득했습니다.`;
    if (tx.reason === 'BET_STAKE') return `베팅에 ${amount}P를 사용했습니다.`;
    if (tx.reason === 'MARKET_BUY')
      return `상점에서 ${amount}P를 사용했습니다.`;
    if (tx.reason === 'MARKET_REFUND')
      return `상점 환불로 ${amount}P를 받았습니다.`;
    if (tx.reason === 'P2P_SEND') {
      return isInflow ? `${amount}P를 받았습니다.` : `${amount}P를 보냈습니다.`;
    }
    return isInflow ? `${amount}P를 받았습니다.` : `${amount}P를 사용했습니다.`;
  }
}
