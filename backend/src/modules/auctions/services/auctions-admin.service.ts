import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Like, Repository } from 'typeorm';
import { Auction, AuctionStatus } from '../entities/auction.entity';
import { AuctionRole } from '../entities/auction-participant.entity';
import { User } from '../../users/entities/user.entity';
import { PointTx } from '../../ledger/entities/point-tx.entity';
import { LedgerService } from '../../ledger/ledger.service';
import { POINT_TX_REASON } from '../../ledger/ledger.constants';

/** 멱등 키: 같은 경매·사용자에 두 번 지급되지 않도록 보장. */
function payoutKey(auctionId: string, userId: string): string {
  return `${POINT_TX_REASON.AUCTION_PAYOUT}:${auctionId}:${userId}`;
}

const REWARD_ROLES = [AuctionRole.PLAYER, AuctionRole.CAPTAIN];

export interface AuctionHistoryRow {
  id: string;
  title: string;
  completedAt: Date;
  teamCount: number;
  playerCount: number;
  recruitedCount: number;
  captainCount: number;
  creatorId: string;
  creatorName: string;
}

/**
 * 완료된 경매 이력 조회 + 참가자 정액 보상 지급(관리자).
 *
 * 보상은 LedgerService.mint 로만 발행하며, idempotencyKey 로 중복 지급을 차단한다.
 */
@Injectable()
export class AuctionsAdminService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionsRepository: Repository<Auction>,
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  /** 완료된 경매 목록 (최근 종료순). */
  async listCompleted(): Promise<AuctionHistoryRow[]> {
    const auctions = await this.auctionsRepository.find({
      where: { status: AuctionStatus.COMPLETED },
      relations: ['participants'],
      order: { updatedAt: 'DESC' },
    });

    const creatorNames = await this.resolveUserNames(
      auctions.map((a) => a.creatorId),
    );

    return auctions.map((a) => {
      const players = a.participants.filter(
        (p) => p.role === AuctionRole.PLAYER,
      );
      return {
        id: a.id,
        title: a.title,
        completedAt: a.updatedAt,
        teamCount: a.teamCount,
        playerCount: players.length,
        recruitedCount: players.filter((p) => p.assignedTeamCaptainId).length,
        captainCount: a.participants.filter(
          (p) => p.role === AuctionRole.CAPTAIN,
        ).length,
        creatorId: a.creatorId,
        creatorName: creatorNames.get(a.creatorId) ?? '알 수 없음',
      };
    });
  }

  /** 완료된 경매 상세 — 팀별 영입 + 참가자별 보상 지급 여부. */
  async detail(auctionId: string) {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: ['participants', 'participants.user'],
    });
    if (!auction) {
      throw new NotFoundException('경매를 찾을 수 없습니다.');
    }
    if (auction.status !== AuctionStatus.COMPLETED) {
      throw new BadRequestException('완료된 경매만 조회할 수 있습니다.');
    }

    const paid = await this.findPaidPayouts(auctionId);

    const participants = auction.participants
      .filter((p) => REWARD_ROLES.includes(p.role))
      .map((p) => ({
        userId: p.userId,
        name: p.user?.battleTag ?? p.user?.username ?? '알 수 없음',
        mainRole: p.user?.mainRole ?? null,
        avatarUrl: p.user?.avatarUrl ?? null,
        role: p.role,
        assignedTeamCaptainId: p.assignedTeamCaptainId,
        soldPrice: p.soldPrice,
        wasUnsold: p.wasUnsold,
        rewarded: paid.has(p.userId),
        rewardAmount: paid.get(p.userId) ?? null,
      }));

    const creatorNames = await this.resolveUserNames([auction.creatorId]);

    return {
      id: auction.id,
      title: auction.title,
      status: auction.status,
      completedAt: auction.updatedAt,
      startingPoints: auction.startingPoints,
      teamCount: auction.teamCount,
      creatorId: auction.creatorId,
      creatorName: creatorNames.get(auction.creatorId) ?? '알 수 없음',
      participants,
      payout: {
        totalRecipients: participants.length,
        paidCount: participants.filter((p) => p.rewarded).length,
      },
    };
  }

  /**
   * 완료된 경매의 전체 참가자(PLAYER+CAPTAIN)에게 1인당 정액 지급.
   * 이미 지급된 사용자는 건너뛴다(멱등). 트랜잭션으로 원자성 보장.
   */
  async payoutParticipants(auctionId: string, amountPerUser: number) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
        relations: ['participants'],
      });
      if (!auction) {
        throw new NotFoundException('경매를 찾을 수 없습니다.');
      }
      if (auction.status !== AuctionStatus.COMPLETED) {
        throw new BadRequestException('완료된 경매만 지급할 수 있습니다.');
      }

      const recipients = auction.participants.filter((p) =>
        REWARD_ROLES.includes(p.role),
      );
      const amount = BigInt(amountPerUser);

      let paid = 0;
      let skipped = 0;
      for (const p of recipients) {
        const key = payoutKey(auctionId, p.userId);
        const exists = await manager.getRepository(PointTx).findOne({
          where: { idempotencyKey: key },
        });
        if (exists) {
          skipped++;
          continue;
        }
        await this.ledger.mint(
          p.userId,
          amount,
          POINT_TX_REASON.AUCTION_PAYOUT,
          {
            refType: 'Auction',
            refId: auctionId,
            idempotencyKey: key,
            memo: `auction payout ${amountPerUser}P`,
            manager,
          },
        );
        paid++;
      }

      return {
        auctionId,
        amountPerUser,
        recipients: recipients.length,
        paid,
        skipped,
      };
    });
  }

  /** 경매별 이미 지급된 참가자 userId → 지급액 맵. */
  private async findPaidPayouts(
    auctionId: string,
  ): Promise<Map<string, string>> {
    const rows = await this.dataSource.getRepository(PointTx).find({
      where: {
        idempotencyKey: Like(
          `${POINT_TX_REASON.AUCTION_PAYOUT}:${auctionId}:%`,
        ),
      },
    });
    const map = new Map<string, string>();
    for (const tx of rows) {
      // key 형식: AUCTION_PAYOUT:{auctionId}:{userId}
      const userId = tx.idempotencyKey?.split(':')[2];
      if (userId) {
        map.set(userId, tx.amount);
      }
    }
    return map;
  }

  /** userId 목록 → 표시명(battleTag ?? username) 맵. */
  private async resolveUserNames(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)].filter(Boolean);
    if (unique.length === 0) {
      return new Map();
    }
    const users = await this.dataSource.getRepository(User).find({
      where: { id: In(unique) },
    });
    return new Map(
      users.map((u) => [u.id, u.battleTag ?? u.username ?? '알 수 없음']),
    );
  }
}
