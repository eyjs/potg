import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Auction, AuctionStatus, BiddingPhase } from './entities/auction.entity';
import {
  AuctionParticipant,
  AuctionRole,
} from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { Scrim, ScrimStatus, RecruitmentType } from '../scrims/entities/scrim.entity';
import { ScrimParticipant, AssignedTeam, ParticipantSource } from '../scrims/entities/scrim-participant.entity';

export interface RoomState {
  auction: {
    id: string;
    title: string;
    status: AuctionStatus;
    biddingPhase: BiddingPhase;
    startingPoints: number;
    turnTimeLimit: number;
    teamCount: number;
    currentBiddingPlayerId: string | null;
    currentBiddingEndTime: Date | null;
    timerPaused: boolean;
    pausedTimeRemaining: number | null;
    creatorId: string;
  };
  participants: {
    id: string;
    userId: string;
    role: AuctionRole;
    currentPoints: number;
    assignedTeamCaptainId: string | null;
    wasUnsold: boolean;
    biddingOrder: number;
    user: {
      id: string;
      battleTag: string | null;
      mainRole: string | null;
    } | null;
  }[];
  currentBid: {
    bidderId: string;
    bidderName: string;
    amount: number;
  } | null;
  currentPlayer: {
    id: string;
    name: string;
    role: string;
  } | null;
  teams: {
    captainId: string;
    captainName: string;
    points: number;
    members: {
      id: string;
      name: string;
      role: string;
      price: number;
      wasUnsold: boolean;
    }[];
  }[];
  unsoldPlayers: {
    id: string;
    name: string;
    role: string;
  }[];
}

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
    @InjectRepository(AuctionParticipant)
    private participantsRepository: Repository<AuctionParticipant>,
    @InjectRepository(AuctionBid)
    private bidsRepository: Repository<AuctionBid>,
    private dataSource: DataSource,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, userId: string) {
    const auction = this.auctionsRepository.create({
      ...createAuctionDto,
      creatorId: userId,
    });
    return this.auctionsRepository.save(auction);
  }

  async findAll() {
    return this.auctionsRepository.find({ relations: ['participants'] });
  }

  async findOne(id: string) {
    return this.auctionsRepository.findOne({
      where: { id },
      relations: ['participants', 'participants.user', 'bids'],
    });
  }

  async join(auctionId: string, userId: string, role: AuctionRole) {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('Auction not found');

    const existing = await this.participantsRepository.findOne({
      where: { auctionId, userId },
    });
    if (existing) throw new BadRequestException('Already joined');

    const participant = this.participantsRepository.create({
      auctionId,
      userId,
      role,
      currentPoints: role === AuctionRole.CAPTAIN ? auction.startingPoints : 0,
    });
    return this.participantsRepository.save(participant);
  }

  // ========== 경매 마스터 기능 (매물/팀 관리) ==========

  // 매물 등록 (클랜원을 경매에 PLAYER로 추가)
  async addPlayer(auctionId: string, adminId: string, targetUserId: string) {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException('경매 마스터만 매물을 등록할 수 있습니다.');
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException('대기 중인 경매에서만 매물을 등록할 수 있습니다.');

    const existing = await this.participantsRepository.findOne({
      where: { auctionId, userId: targetUserId },
    });
    if (existing) throw new BadRequestException('이미 등록된 참가자입니다.');

    const participant = this.participantsRepository.create({
      auctionId,
      userId: targetUserId,
      role: AuctionRole.PLAYER,
      currentPoints: 0,
    });
    return this.participantsRepository.save(participant);
  }

  // 매물 여러명 일괄 등록
  async addPlayers(auctionId: string, adminId: string, userIds: string[]) {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException('경매 마스터만 매물을 등록할 수 있습니다.');
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException('대기 중인 경매에서만 매물을 등록할 수 있습니다.');

    const results: AuctionParticipant[] = [];
    for (const userId of userIds) {
      const existing = await this.participantsRepository.findOne({
        where: { auctionId, userId },
      });
      if (existing) continue; // Skip already registered

      const participant = this.participantsRepository.create({
        auctionId,
        userId,
        role: AuctionRole.PLAYER,
        currentPoints: 0,
      });
      results.push(await this.participantsRepository.save(participant));
    }
    return results;
  }

  // 매물/참가자 제거
  async removeParticipant(auctionId: string, adminId: string, targetUserId: string) {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException('경매 마스터만 참가자를 제거할 수 있습니다.');
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException('대기 중인 경매에서만 참가자를 제거할 수 있습니다.');

    const participant = await this.participantsRepository.findOne({
      where: { auctionId, userId: targetUserId },
    });
    if (!participant) throw new BadRequestException('참가자를 찾을 수 없습니다.');

    await this.participantsRepository.remove(participant);
    return { removed: true, userId: targetUserId };
  }

  // 팀장(캡틴) 추가 (팀 생성)
  async addCaptain(auctionId: string, adminId: string, captainUserId: string) {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException('경매 마스터만 팀장을 추가할 수 있습니다.');
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException('대기 중인 경매에서만 팀장을 추가할 수 있습니다.');

    // Check team count limit
    const captains = await this.participantsRepository.count({
      where: { auctionId, role: AuctionRole.CAPTAIN },
    });
    if (captains >= auction.teamCount)
      throw new BadRequestException(`최대 ${auction.teamCount}팀까지만 가능합니다.`);

    // Check if user is already in the auction
    const existing = await this.participantsRepository.findOne({
      where: { auctionId, userId: captainUserId },
    });

    if (existing) {
      // If already a player, upgrade to captain
      if (existing.role === AuctionRole.PLAYER) {
        existing.role = AuctionRole.CAPTAIN;
        existing.currentPoints = auction.startingPoints;
        return this.participantsRepository.save(existing);
      }
      throw new BadRequestException('이미 등록된 참가자입니다.');
    }

    const participant = this.participantsRepository.create({
      auctionId,
      userId: captainUserId,
      role: AuctionRole.CAPTAIN,
      currentPoints: auction.startingPoints,
    });
    return this.participantsRepository.save(participant);
  }

  // 팀장 제거 (팀 삭제)
  async removeCaptain(auctionId: string, adminId: string, captainUserId: string) {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException('경매 마스터만 팀장을 제거할 수 있습니다.');
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException('대기 중인 경매에서만 팀장을 제거할 수 있습니다.');

    const captain = await this.participantsRepository.findOne({
      where: { auctionId, userId: captainUserId, role: AuctionRole.CAPTAIN },
    });
    if (!captain) throw new BadRequestException('팀장을 찾을 수 없습니다.');

    await this.participantsRepository.remove(captain);
    return { removed: true, userId: captainUserId };
  }

  // 경매 설정 업데이트
  async updateAuctionSettings(
    auctionId: string,
    adminId: string,
    settings: { teamCount?: number; startingPoints?: number; turnTimeLimit?: number },
  ) {
    const auction = await this.auctionsRepository.findOne({ where: { id: auctionId } });
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException('경매 마스터만 설정을 변경할 수 있습니다.');
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException('대기 중인 경매만 설정을 변경할 수 있습니다.');

    if (settings.teamCount !== undefined) auction.teamCount = settings.teamCount;
    if (settings.startingPoints !== undefined) {
      auction.startingPoints = settings.startingPoints;
      // Update all captains' points
      await this.participantsRepository.update(
        { auctionId, role: AuctionRole.CAPTAIN },
        { currentPoints: settings.startingPoints },
      );
    }
    if (settings.turnTimeLimit !== undefined) auction.turnTimeLimit = settings.turnTimeLimit;

    return this.auctionsRepository.save(auction);
  }

  // 경매 삭제
  async deleteAuction(auctionId: string, adminId: string) {
    const auction = await this.auctionsRepository.findOne({ where: { id: auctionId } });
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException('경매 마스터만 삭제할 수 있습니다.');
    if (auction.status !== AuctionStatus.PENDING && auction.status !== AuctionStatus.CANCELLED)
      throw new BadRequestException('대기 중이거나 취소된 경매만 삭제할 수 있습니다.');

    // Delete all participants and bids (cascade should handle this)
    await this.participantsRepository.delete({ auctionId });
    await this.bidsRepository.delete({ auctionId });
    await this.auctionsRepository.remove(auction);

    return { deleted: true };
  }

  async placeBid(
    auctionId: string,
    bidderId: string,
    targetPlayerId: string,
    amount: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const participant = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: bidderId },
      });
      if (!participant || participant.role !== AuctionRole.CAPTAIN) {
        throw new BadRequestException('Only captains can bid');
      }
      if (participant.currentPoints < amount) {
        throw new BadRequestException('Not enough points');
      }

      const bid = manager.create(AuctionBid, {
        auctionId,
        bidderId,
        targetPlayerId,
        amount,
      });

      await manager.save(bid);

      participant.currentPoints -= amount;
      await manager.save(participant);

      return bid;
    });
  }

  async placeBidWithValidation(
    auctionId: string,
    bidderId: string,
    targetPlayerId: string,
    amount: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
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

      // Find current highest bid for this player in this auction round
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

      // Calculate total committed points (previous active bids + new bid)
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

      // Deactivate previous bids from this bidder for this player
      await manager.update(
        AuctionBid,
        { auctionId, bidderId, targetPlayerId, isActive: true },
        { isActive: false },
      );

      // Create new bid
      const bid = manager.create(AuctionBid, {
        auctionId,
        bidderId,
        targetPlayerId,
        amount,
        isActive: true,
      });

      await manager.save(bid);

      // Update auction end time (extend timer on bid)
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

  async start(auctionId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });
      if (!auction) throw new BadRequestException('Auction not found');
      if (auction.creatorId !== userId)
        throw new BadRequestException('Only creator can start auction');
      if (auction.status !== AuctionStatus.PENDING)
        throw new BadRequestException('Auction already started or finished');

      auction.status = AuctionStatus.ONGOING;
      await manager.save(auction);

      return auction;
    });
  }

  async selectPlayer(auctionId: string, userId: string, playerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });
      if (!auction) throw new BadRequestException('Auction not found');
      if (auction.creatorId !== userId)
        throw new BadRequestException('Only creator can select player');
      if (auction.status !== AuctionStatus.ONGOING)
        throw new BadRequestException('Auction is not ongoing');

      // Verify player exists and is not already assigned
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

  async confirmCurrentBid(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 낙찰을 확정할 수 있습니다.');
      if (!auction.currentBiddingPlayerId)
        throw new BadRequestException('현재 입찰 중인 선수가 없습니다.');

      // Find highest active bid
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

      // Assign player to captain's team
      const player = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: auction.currentBiddingPlayerId },
      });

      if (player) {
        player.assignedTeamCaptainId = highestBid.bidderId;
        player.soldPrice = highestBid.amount;
        await manager.save(player);
      }

      // Deduct points from captain (final deduction)
      const captain = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: highestBid.bidderId },
      });

      if (captain) {
        // Deduct the winning bid amount from captain's points
        captain.currentPoints -= highestBid.amount;
        await manager.save(captain);

        // Deactivate all bids for this player
        const previousBids = await manager.find(AuctionBid, {
          where: {
            auctionId,
            bidderId: highestBid.bidderId,
            targetPlayerId: auction.currentBiddingPlayerId,
            isActive: true,
          },
        });

        for (const bid of previousBids) {
          bid.isActive = false;
          await manager.save(bid);
        }
      }

      // Set to SOLD phase (wait for master to click Next)
      const playerId = auction.currentBiddingPlayerId;
      auction.biddingPhase = BiddingPhase.SOLD;
      auction.currentBiddingEndTime = null;
      await manager.save(auction);

      return {
        playerId,
        captainId: highestBid.bidderId,
        amount: highestBid.amount,
      };
    });
  }

  async passCurrentPlayer(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 유찰 처리할 수 있습니다.');
      if (!auction.currentBiddingPlayerId)
        throw new BadRequestException('현재 입찰 중인 선수가 없습니다.');

      // Deactivate all bids for this player
      await manager.update(
        AuctionBid,
        {
          auctionId,
          targetPlayerId: auction.currentBiddingPlayerId,
          isActive: true,
        },
        { isActive: false },
      );

      // Mark player as passed (optional: could track in participant)
      auction.currentBiddingPlayerId = null;
      auction.currentBiddingEndTime = null;
      await manager.save(auction);

      return { passed: true };
    });
  }

  async autoConfirmOnTimeout(auctionId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (
        !auction ||
        auction.status !== AuctionStatus.ONGOING ||
        !auction.currentBiddingPlayerId
      ) {
        return { confirmed: false };
      }

      // Find highest active bid
      const highestBid = await manager.findOne(AuctionBid, {
        where: {
          auctionId,
          targetPlayerId: auction.currentBiddingPlayerId,
          isActive: true,
        },
        order: { amount: 'DESC' },
      });

      if (!highestBid) {
        // No bids, pass player
        auction.currentBiddingPlayerId = null;
        auction.currentBiddingEndTime = null;
        await manager.save(auction);
        return { confirmed: false };
      }

      // Confirm highest bid
      const player = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: auction.currentBiddingPlayerId },
      });

      if (player) {
        player.assignedTeamCaptainId = highestBid.bidderId;
        player.soldPrice = highestBid.amount;
        await manager.save(player);
      }

      // Deduct points from winning captain
      const captain = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: highestBid.bidderId },
      });

      if (captain) {
        captain.currentPoints -= highestBid.amount;
        await manager.save(captain);
      }

      // Deactivate bids
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
        confirmed: true,
        playerId,
        captainId: highestBid.bidderId,
        amount: highestBid.amount,
      };
    });
  }

  async checkAutoConfirm(auctionId: string): Promise<{ shouldAutoConfirm: boolean; reason?: string }> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: ['participants', 'bids'],
    });

    if (!auction || auction.status !== AuctionStatus.ONGOING || !auction.currentBiddingPlayerId) {
      return { shouldAutoConfirm: false };
    }

    const participants = auction.participants || [];
    const bids = auction.bids || [];

    // Find highest active bid for current player
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

    // Get all captains except the current highest bidder
    const captains = participants.filter(
      (p) => p.role === AuctionRole.CAPTAIN && p.userId !== currentBidderId,
    );

    if (captains.length === 0) {
      // Only one captain, auto-confirm
      return { shouldAutoConfirm: true, reason: '경쟁자 없음 - 자동 낙찰' };
    }

    // Check if any captain can afford to outbid
    // Calculate each captain's available points (considering their active bids)
    let anyCanBid = false;

    for (const captain of captains) {
      const captainActiveBids = bids.filter(
        (b) => b.bidderId === captain.userId && b.isActive,
      );

      // Points committed to other players (not the current one being auctioned)
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
      return { shouldAutoConfirm: true, reason: '모든 경쟁자 포인트 부족 - 자동 낙찰' };
    }

    return { shouldAutoConfirm: false };
  }

  async getRoomState(auctionId: string): Promise<RoomState> {
    const auction = await this.auctionsRepository.findOne({
      where: { id: auctionId },
      relations: ['participants', 'participants.user', 'bids'],
    });

    if (!auction) {
      throw new BadRequestException('경매를 찾을 수 없습니다.');
    }

    const participants = auction.participants || [];
    const bids = auction.bids || [];

    // Build teams from captains
    const captains = participants.filter((p) => p.role === AuctionRole.CAPTAIN);
    const teams = captains.map((captain) => {
      const teamMembers = participants.filter(
        (p) =>
          p.role === AuctionRole.PLAYER &&
          p.assignedTeamCaptainId === captain.userId,
      );

      return {
        captainId: captain.userId,
        captainName: captain.user?.battleTag || '캡틴',
        points: captain.currentPoints,
        members: teamMembers.map((m) => ({
          id: m.userId,
          name: m.user?.battleTag?.split('#')[0] || '선수',
          role: m.user?.mainRole?.toLowerCase() || 'flex',
          price: m.soldPrice || 0,
          wasUnsold: m.wasUnsold,
        })),
      };
    });

    // Current bid
    let currentBid: { bidderId: string; bidderName: string; amount: number } | null = null;
    if (auction.currentBiddingPlayerId) {
      const highestBid = bids
        .filter(
          (b) =>
            b.targetPlayerId === auction.currentBiddingPlayerId && b.isActive,
        )
        .sort((a, b) => b.amount - a.amount)[0];

      if (highestBid) {
        const bidder = participants.find((p) => p.userId === highestBid.bidderId);
        currentBid = {
          bidderId: highestBid.bidderId,
          bidderName: bidder?.user?.battleTag || '익명',
          amount: highestBid.amount,
        };
      }
    }

    // Current player
    let currentPlayer: { id: string; name: string; role: string } | null = null;
    if (auction.currentBiddingPlayerId) {
      const player = participants.find(
        (p) => p.userId === auction.currentBiddingPlayerId,
      );
      if (player) {
        currentPlayer = {
          id: player.userId,
          name: player.user?.battleTag?.split('#')[0] || '선수',
          role: player.user?.mainRole?.toLowerCase() || 'flex',
        };
      }
    }

    // Get unsold players
    const unsoldPlayers = participants
      .filter((p) => p.role === AuctionRole.PLAYER && !p.assignedTeamCaptainId)
      .map((p) => ({
        id: p.userId,
        name: p.user?.battleTag?.split('#')[0] || '선수',
        role: p.user?.mainRole?.toLowerCase() || 'flex',
      }));

    return {
      auction: {
        id: auction.id,
        title: auction.title,
        status: auction.status,
        biddingPhase: auction.biddingPhase,
        startingPoints: auction.startingPoints,
        turnTimeLimit: auction.turnTimeLimit,
        teamCount: auction.teamCount,
        currentBiddingPlayerId: auction.currentBiddingPlayerId,
        currentBiddingEndTime: auction.currentBiddingEndTime,
        timerPaused: auction.timerPaused,
        pausedTimeRemaining: auction.pausedTimeRemaining,
        creatorId: auction.creatorId,
      },
      participants: participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        currentPoints: p.currentPoints,
        assignedTeamCaptainId: p.assignedTeamCaptainId,
        wasUnsold: p.wasUnsold,
        biddingOrder: p.biddingOrder,
        user: p.user
          ? {
              id: p.user.id,
              battleTag: p.user.battleTag,
              mainRole: p.user.mainRole,
            }
          : null,
      })),
      currentBid,
      currentPlayer,
      teams,
      unsoldPlayers,
    };
  }

  async complete(auctionId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });
      if (!auction) throw new BadRequestException('Auction not found');
      if (auction.creatorId !== userId)
        throw new BadRequestException('Only creator can complete auction');
      if (auction.status !== AuctionStatus.ONGOING && auction.status !== AuctionStatus.ASSIGNING)
        throw new BadRequestException('Auction not in completable state');

      auction.status = AuctionStatus.COMPLETED;
      await manager.save(auction);

      return auction;
    });
  }

  // ========== Master Control Methods ==========

  async pauseAuction(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 일시정지할 수 있습니다.');
      if (auction.status !== AuctionStatus.ONGOING)
        throw new BadRequestException('진행 중인 경매만 일시정지할 수 있습니다.');

      auction.status = AuctionStatus.PAUSED;

      // Save remaining timer if in bidding
      if (auction.currentBiddingEndTime) {
        const remaining = Math.max(0, Math.floor(
          (auction.currentBiddingEndTime.getTime() - Date.now()) / 1000
        ));
        auction.pausedTimeRemaining = remaining;
      }

      await manager.save(auction);
      return auction;
    });
  }

  async resumeAuction(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 재개할 수 있습니다.');
      if (auction.status !== AuctionStatus.PAUSED)
        throw new BadRequestException('일시정지된 경매만 재개할 수 있습니다.');

      auction.status = AuctionStatus.ONGOING;

      // Restore timer if we have remaining time
      if (auction.pausedTimeRemaining !== null && auction.currentBiddingPlayerId) {
        auction.currentBiddingEndTime = new Date(
          Date.now() + auction.pausedTimeRemaining * 1000
        );
      }
      auction.pausedTimeRemaining = null;

      await manager.save(auction);
      return auction;
    });
  }

  async pauseTimer(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 타이머를 정지할 수 있습니다.');

      if (auction.timerPaused) {
        throw new BadRequestException('타이머가 이미 정지되어 있습니다.');
      }

      // Save remaining time
      if (auction.currentBiddingEndTime) {
        const remaining = Math.max(0, Math.floor(
          (auction.currentBiddingEndTime.getTime() - Date.now()) / 1000
        ));
        auction.pausedTimeRemaining = remaining;
      }
      auction.timerPaused = true;

      await manager.save(auction);
      return auction;
    });
  }

  async resumeTimer(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 타이머를 재개할 수 있습니다.');

      if (!auction.timerPaused) {
        throw new BadRequestException('타이머가 정지 상태가 아닙니다.');
      }

      // Restore timer
      if (auction.pausedTimeRemaining !== null) {
        auction.currentBiddingEndTime = new Date(
          Date.now() + auction.pausedTimeRemaining * 1000
        );
      }
      auction.timerPaused = false;
      auction.pausedTimeRemaining = null;

      await manager.save(auction);
      return auction;
    });
  }

  async undoSoldPlayer(auctionId: string, adminId: string, playerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 낙찰을 취소할 수 있습니다.');

      const player = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: playerId, role: AuctionRole.PLAYER },
      });

      if (!player) throw new BadRequestException('선수를 찾을 수 없습니다.');
      if (!player.assignedTeamCaptainId)
        throw new BadRequestException('배정되지 않은 선수입니다.');

      // Refund points to the captain
      const captain = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: player.assignedTeamCaptainId },
      });

      if (captain && !player.wasUnsold) {
        captain.currentPoints += player.soldPrice;
        await manager.save(captain);
      }

      // Reset player assignment
      player.assignedTeamCaptainId = null;
      player.soldPrice = 0;
      player.wasUnsold = false;
      await manager.save(player);

      return { playerId, refunded: true };
    });
  }

  async nextPlayer(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 다음 매물로 진행할 수 있습니다.');

      // Clear current bidding state (move from SOLD to WAITING)
      auction.biddingPhase = BiddingPhase.WAITING;
      auction.currentBiddingPlayerId = null;
      auction.currentBiddingEndTime = null;

      await manager.save(auction);
      return auction;
    });
  }

  async enterAssignmentPhase(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 배정 단계로 이동할 수 있습니다.');

      auction.status = AuctionStatus.ASSIGNING;
      auction.biddingPhase = BiddingPhase.WAITING;
      auction.currentBiddingPlayerId = null;
      auction.currentBiddingEndTime = null;

      await manager.save(auction);
      return auction;
    });
  }

  async manualAssignPlayer(
    auctionId: string,
    adminId: string,
    playerId: string,
    captainId: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 수동 배정할 수 있습니다.');
      if (auction.status !== AuctionStatus.ASSIGNING)
        throw new BadRequestException('수동 배정은 배정 단계에서만 가능합니다.');

      const player = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: playerId, role: AuctionRole.PLAYER },
      });

      if (!player) throw new BadRequestException('선수를 찾을 수 없습니다.');
      if (player.assignedTeamCaptainId)
        throw new BadRequestException('이미 배정된 선수입니다.');

      const captain = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: captainId, role: AuctionRole.CAPTAIN },
      });

      if (!captain) throw new BadRequestException('캡틴을 찾을 수 없습니다.');

      // Assign with 0P price and mark as unsold
      player.assignedTeamCaptainId = captainId;
      player.soldPrice = 0;
      player.wasUnsold = true;
      await manager.save(player);

      return { playerId, captainId, wasUnsold: true };
    });
  }

  async createScrimFromAuction(auctionId: string, adminId: string, scheduledDate: Date) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, {
        where: { id: auctionId },
        relations: ['participants', 'participants.user'],
      });

      if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
      if (auction.creatorId !== adminId)
        throw new BadRequestException('관리자만 스크림을 생성할 수 있습니다.');
      if (auction.status !== AuctionStatus.COMPLETED)
        throw new BadRequestException('완료된 경매에서만 스크림을 생성할 수 있습니다.');

      // Get clannId from auction creator
      // For now, we'll need to get the clan from the user's membership
      // This is a simplified version - in reality you'd get the clanId from the auction

      const scrim = manager.create(Scrim, {
        title: `${auction.title} 스크림`,
        hostId: adminId,
        status: ScrimStatus.SCHEDULED,
        recruitmentType: RecruitmentType.AUCTION,
        scheduledDate,
        auctionId: auction.id,
      });

      await manager.save(scrim);

      // Create scrim participants from auction result
      const participants = auction.participants || [];
      const captains = participants.filter((p) => p.role === AuctionRole.CAPTAIN);

      for (let i = 0; i < captains.length; i++) {
        const captain = captains[i];
        const teamAssignment = i === 0 ? AssignedTeam.TEAM_A : AssignedTeam.TEAM_B;

        // Add captain
        const captainParticipant = manager.create(ScrimParticipant, {
          scrimId: scrim.id,
          userId: captain.userId,
          assignedTeam: teamAssignment,
          source: ParticipantSource.AUCTION,
        });
        await manager.save(captainParticipant);

        // Add team members
        const members = participants.filter(
          (p) => p.assignedTeamCaptainId === captain.userId,
        );
        for (const member of members) {
          const memberParticipant = manager.create(ScrimParticipant, {
            scrimId: scrim.id,
            userId: member.userId,
            assignedTeam: teamAssignment,
            source: ParticipantSource.AUCTION,
          });
          await manager.save(memberParticipant);
        }
      }

      // Update auction with linked scrim
      auction.linkedScrimId = scrim.id;
      await manager.save(auction);

      return scrim;
    });
  }
}
