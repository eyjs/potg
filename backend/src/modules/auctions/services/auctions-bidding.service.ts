import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  Auction,
  AuctionStatus,
  BiddingPhase,
} from '../entities/auction.entity';
import {
  AuctionParticipant,
  AuctionRole,
} from '../entities/auction-participant.entity';
import { AuctionBid } from '../entities/auction-bid.entity';

/**
 * 경매 입찰 도메인.
 *
 * 모든 메서드는 DataSource.transaction으로 원자성을 보장한다.
 * 외부에서는 AuctionsService(facade)를 통해 호출되며 직접 의존하지 않는다.
 *
 * 다루는 비즈니스:
 *  모든 변이 메서드는 경매 행에 pessimistic_write 잠금을 걸어 직렬화한다.
 *
 *  - selectPlayer        : 마스터가 다음 입찰 대상 선수 지정
 *  - placeBidWithValidation : 정식 입찰 — 활성 입찰 합산 후 잔액 검증, 타이머 연장
 *  - confirmCurrentBid   : 최고가 입찰 낙찰 확정 (마스터) — 멱등 (중복 시 confirmed:false)
 *  - passCurrentPlayer   : 유찰 처리
 *  - autoConfirmOnTimeout: 타이머 만료 시 자동 낙찰 — 멱등
 *  - checkAutoConfirm    : 경쟁자 잔액 검증 후 자동 낙찰 가능 여부 판정
 */
@Injectable()
export class AuctionsBiddingService {
  constructor(
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
    private dataSource: DataSource,
  ) {}

  /**
   * 트랜잭션 내에서 경매를 조회하고 creator인지 검증.
   */
  private async loadAsCreatorTx(
    manager: EntityManager,
    auctionId: string,
    adminId: string,
    forbiddenMsg: string,
  ): Promise<Auction> {
    // pessimistic_write: 동일 경매에 대한 모든 변이 작업을 직렬화 (자동/수동/타이머 낙찰 경합 방지)
    const auction = await manager.findOne(Auction, {
      where: { id: auctionId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException(forbiddenMsg);
    return auction;
  }

  async selectPlayer(auctionId: string, userId: string, playerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        userId,
        'Only creator can select player',
      );
      if (auction.status !== AuctionStatus.ONGOING)
        throw new BadRequestException('Auction is not ongoing');

      const player = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: playerId, role: AuctionRole.PLAYER },
      });

      if (!player) {
        throw new BadRequestException('선수를 찾을 수 없습니다.');
      }

      if (player.assignedTeamCaptainId) {
        throw new BadRequestException('이미 팀에 배정된 선수입니다.');
      }

      auction.currentBiddingPlayerId = playerId;
      auction.currentBiddingEndTime = new Date(
        Date.now() + auction.turnTimeLimit * 1000,
      );
      auction.biddingPhase = BiddingPhase.BIDDING;
      await manager.save(auction);

      return auction;
    });
  }

  async placeBidWithValidation(
    auctionId: string,
    bidderId: string,
    targetPlayerId: string,
    amount: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      // pessimistic_write: 동시 입찰의 잔여 포인트 lost-update 방지 (경매 단위 직렬화)
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!auction) {
        throw new BadRequestException('경매를 찾을 수 없습니다.');
      }

      if (auction.status !== AuctionStatus.ONGOING) {
        throw new BadRequestException('경매가 진행 중이 아닙니다.');
      }

      if (auction.currentBiddingPlayerId !== targetPlayerId) {
        throw new BadRequestException('현재 입찰 대상 선수가 아닙니다.');
      }

      const participant = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: bidderId },
        relations: ['user'],
      });

      if (!participant || participant.role !== AuctionRole.CAPTAIN) {
        throw new BadRequestException('캡틴만 입찰할 수 있습니다.');
      }

      const currentHighestBid = await manager.findOne(AuctionBid, {
        where: { auctionId, targetPlayerId, isActive: true },
        order: { amount: 'DESC' },
      });

      const minBidAmount = currentHighestBid ? currentHighestBid.amount + 1 : 1;

      if (amount < minBidAmount) {
        throw new BadRequestException(
          `최소 ${minBidAmount}P 이상 입찰해야 합니다.`,
        );
      }

      const activeBids = await manager.find(AuctionBid, {
        where: { auctionId, bidderId, isActive: true },
      });

      const otherBidsTotal = activeBids
        .filter((b) => b.targetPlayerId !== targetPlayerId)
        .reduce((sum, b) => sum + b.amount, 0);

      const requiredPoints = otherBidsTotal + amount;

      if (participant.currentPoints < requiredPoints) {
        throw new BadRequestException('포인트가 부족합니다.');
      }

      await manager.update(
        AuctionBid,
        { auctionId, bidderId, targetPlayerId, isActive: true },
        { isActive: false },
      );

      const bid = manager.create(AuctionBid, {
        auctionId,
        bidderId,
        targetPlayerId,
        amount,
        isActive: true,
      });

      await manager.save(bid);

      auction.currentBiddingEndTime = new Date(
        Date.now() + auction.turnTimeLimit * 1000,
      );
      await manager.save(auction);

      return {
        bid,
        bidderName: participant.user?.battleTag || '익명',
      };
    });
  }

  async confirmCurrentBid(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 낙찰을 확정할 수 있습니다.',
      );

      // 멱등 가드: 이미 낙찰 처리된 경우(경합으로 자동/타이머 낙찰이 선행) no-op
      if (
        auction.biddingPhase === BiddingPhase.SOLD ||
        !auction.currentBiddingPlayerId
      ) {
        return { confirmed: false as const };
      }

      const highestBid = await manager.findOne(AuctionBid, {
        where: {
          auctionId,
          targetPlayerId: auction.currentBiddingPlayerId,
          isActive: true,
        },
        order: { amount: 'DESC' },
      });

      if (!highestBid) {
        throw new BadRequestException('입찰 내역이 없습니다. 유찰 처리하세요.');
      }

      const player = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: auction.currentBiddingPlayerId },
      });

      // 이미 배정된 선수면 중복 차감 방지 (방어)
      if (player?.assignedTeamCaptainId) {
        return { confirmed: false as const };
      }

      if (player) {
        player.assignedTeamCaptainId = highestBid.bidderId;
        player.soldPrice = highestBid.amount;
        await manager.save(player);
      }

      const captain = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: highestBid.bidderId },
      });

      if (captain) {
        captain.currentPoints -= highestBid.amount;
        await manager.save(captain);
      }

      // 낙찰된 선수에 대한 모든 활성 입찰(승자/패자)을 비활성화 — 패자 포인트 잠금 해제
      await manager.update(
        AuctionBid,
        {
          auctionId,
          targetPlayerId: auction.currentBiddingPlayerId,
          isActive: true,
        },
        { isActive: false },
      );

      const playerId = auction.currentBiddingPlayerId;
      auction.biddingPhase = BiddingPhase.SOLD;
      auction.currentBiddingEndTime = null;
      await manager.save(auction);

      return {
        confirmed: true as const,
        playerId,
        captainId: highestBid.bidderId,
        amount: highestBid.amount,
      };
    });
  }

  async passCurrentPlayer(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 유찰 처리할 수 있습니다.',
      );
      if (!auction.currentBiddingPlayerId)
        throw new BadRequestException('현재 입찰 중인 선수가 없습니다.');

      await manager.update(
        AuctionBid,
        {
          auctionId,
          targetPlayerId: auction.currentBiddingPlayerId,
          isActive: true,
        },
        { isActive: false },
      );

      auction.currentBiddingPlayerId = null;
      auction.currentBiddingEndTime = null;
      await manager.save(auction);

      return { passed: true };
    });
  }

  async autoConfirmOnTimeout(auctionId: string) {
    return this.dataSource.transaction(async (manager) => {
      // pessimistic_write: 수동 confirm / 다른 타이머 만료와의 경합 방지
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });

      // 멱등 가드: 이미 낙찰(SOLD)됐거나 진행 중이 아니면 no-op
      if (
        !auction ||
        auction.status !== AuctionStatus.ONGOING ||
        auction.biddingPhase === BiddingPhase.SOLD ||
        !auction.currentBiddingPlayerId
      ) {
        return { confirmed: false as const };
      }

      const highestBid = await manager.findOne(AuctionBid, {
        where: {
          auctionId,
          targetPlayerId: auction.currentBiddingPlayerId,
          isActive: true,
        },
        order: { amount: 'DESC' },
      });

      if (!highestBid) {
        auction.currentBiddingPlayerId = null;
        auction.currentBiddingEndTime = null;
        await manager.save(auction);
        return { confirmed: false as const };
      }

      const player = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: auction.currentBiddingPlayerId },
      });

      // 이미 배정된 선수면 중복 차감 방지 (방어)
      if (player?.assignedTeamCaptainId) {
        return { confirmed: false as const };
      }

      if (player) {
        player.assignedTeamCaptainId = highestBid.bidderId;
        player.soldPrice = highestBid.amount;
        await manager.save(player);
      }

      const captain = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: highestBid.bidderId },
      });

      if (captain) {
        captain.currentPoints -= highestBid.amount;
        await manager.save(captain);
      }

      await manager.update(
        AuctionBid,
        {
          auctionId,
          targetPlayerId: auction.currentBiddingPlayerId,
          isActive: true,
        },
        { isActive: false },
      );

      const playerId = auction.currentBiddingPlayerId;
      auction.currentBiddingPlayerId = null;
      auction.currentBiddingEndTime = null;
      await manager.save(auction);

      return {
        confirmed: true as const,
        playerId,
        captainId: highestBid.bidderId,
        amount: highestBid.amount,
      };
    });
  }

  async checkAutoConfirm(
    auctionId: string,
  ): Promise<{ shouldAutoConfirm: boolean; reason?: string }> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: ['participants', 'bids'],
    });

    if (
      !auction ||
      auction.status !== AuctionStatus.ONGOING ||
      !auction.currentBiddingPlayerId
    ) {
      return { shouldAutoConfirm: false };
    }

    const participants = auction.participants || [];
    const bids = auction.bids || [];

    const highestBid = bids
      .filter(
        (b) =>
          b.targetPlayerId === auction.currentBiddingPlayerId && b.isActive,
      )
      .sort((a, b) => b.amount - a.amount)[0];

    if (!highestBid) {
      return { shouldAutoConfirm: false };
    }

    const minNextBid = highestBid.amount + 1;
    const currentBidderId = highestBid.bidderId;

    const captains = participants.filter(
      (p) => p.role === AuctionRole.CAPTAIN && p.userId !== currentBidderId,
    );

    if (captains.length === 0) {
      return { shouldAutoConfirm: true, reason: '경쟁자 없음 - 자동 낙찰' };
    }

    let anyCanBid = false;

    for (const captain of captains) {
      const captainActiveBids = bids.filter(
        (b) => b.bidderId === captain.userId && b.isActive,
      );

      const committedPoints = captainActiveBids
        .filter((b) => b.targetPlayerId !== auction.currentBiddingPlayerId)
        .reduce((sum, b) => sum + b.amount, 0);

      const availablePoints = captain.currentPoints - committedPoints;

      if (availablePoints >= minNextBid) {
        anyCanBid = true;
        break;
      }
    }

    if (!anyCanBid) {
      return {
        shouldAutoConfirm: true,
        reason: '모든 경쟁자 포인트 부족 - 자동 낙찰',
      };
    }

    return { shouldAutoConfirm: false };
  }
}
