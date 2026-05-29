import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  Auction,
  AuctionStatus,
  BiddingPhase,
} from './entities/auction.entity';
import {
  AuctionParticipant,
  AuctionRole,
} from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { AuctionsBiddingService } from './services/auctions-bidding.service';
import {
  AuctionsRoomStateService,
  RoomState,
} from './services/auctions-room-state.service';

export type { RoomState };

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
    private readonly biddingService: AuctionsBiddingService,
    private readonly roomStateService: AuctionsRoomStateService,
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

  /**
   * 경매를 조회하고 호출자가 creator인지 검증한다.
   * 비-트랜잭션 path 전용 — relations 포함된 findOne을 사용한다.
   *
   * @throws BadRequestException — 경매 미존재 또는 creator 불일치
   */
  private async loadAsCreator(
    auctionId: string,
    adminId: string,
    forbiddenMsg: string,
  ): Promise<Auction> {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException(forbiddenMsg);
    return auction;
  }

  /**
   * 트랜잭션 내에서 경매를 조회하고 creator인지 검증.
   * EntityManager 기반이라 relations 없이 row만 lock으로 가져온다.
   */
  private async loadAsCreatorTx(
    manager: EntityManager,
    auctionId: string,
    adminId: string,
    forbiddenMsg: string,
  ): Promise<Auction> {
    // pessimistic_write: 마스터 변이 작업을 입찰/낙찰과 동일 경매 행에서 직렬화
    const auction = await manager.findOne(Auction, {
      where: { id: auctionId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!auction) throw new BadRequestException('경매를 찾을 수 없습니다.');
    if (auction.creatorId !== adminId)
      throw new BadRequestException(forbiddenMsg);
    return auction;
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
    const auction = await this.loadAsCreator(
      auctionId,
      adminId,
      '경매 마스터만 매물을 등록할 수 있습니다.',
    );
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException(
        '대기 중인 경매에서만 매물을 등록할 수 있습니다.',
      );

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
    const auction = await this.loadAsCreator(
      auctionId,
      adminId,
      '경매 마스터만 매물을 등록할 수 있습니다.',
    );
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException(
        '대기 중인 경매에서만 매물을 등록할 수 있습니다.',
      );

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
  async removeParticipant(
    auctionId: string,
    adminId: string,
    targetUserId: string,
  ) {
    const auction = await this.loadAsCreator(
      auctionId,
      adminId,
      '경매 마스터만 참가자를 제거할 수 있습니다.',
    );
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException(
        '대기 중인 경매에서만 참가자를 제거할 수 있습니다.',
      );

    const participant = await this.participantsRepository.findOne({
      where: { auctionId, userId: targetUserId },
    });
    if (!participant)
      throw new BadRequestException('참가자를 찾을 수 없습니다.');

    await this.participantsRepository.remove(participant);
    return { removed: true, userId: targetUserId };
  }

  // 팀장(캡틴) 추가 (팀 생성)
  async addCaptain(auctionId: string, adminId: string, captainUserId: string) {
    const auction = await this.loadAsCreator(
      auctionId,
      adminId,
      '경매 마스터만 팀장을 추가할 수 있습니다.',
    );
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException(
        '대기 중인 경매에서만 팀장을 추가할 수 있습니다.',
      );

    // Check team count limit
    const captains = await this.participantsRepository.count({
      where: { auctionId, role: AuctionRole.CAPTAIN },
    });
    if (captains >= auction.teamCount)
      throw new BadRequestException(
        `최대 ${auction.teamCount}팀까지만 가능합니다.`,
      );

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
  async removeCaptain(
    auctionId: string,
    adminId: string,
    captainUserId: string,
  ) {
    const auction = await this.loadAsCreator(
      auctionId,
      adminId,
      '경매 마스터만 팀장을 제거할 수 있습니다.',
    );
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException(
        '대기 중인 경매에서만 팀장을 제거할 수 있습니다.',
      );

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
    settings: {
      teamCount?: number;
      startingPoints?: number;
      turnTimeLimit?: number;
    },
  ) {
    const auction = await this.loadAsCreator(
      auctionId,
      adminId,
      '경매 마스터만 설정을 변경할 수 있습니다.',
    );
    if (auction.status !== AuctionStatus.PENDING)
      throw new BadRequestException(
        '대기 중인 경매만 설정을 변경할 수 있습니다.',
      );

    if (settings.teamCount !== undefined)
      auction.teamCount = settings.teamCount;
    if (settings.startingPoints !== undefined) {
      auction.startingPoints = settings.startingPoints;
      // Update all captains' points
      await this.participantsRepository.update(
        { auctionId, role: AuctionRole.CAPTAIN },
        { currentPoints: settings.startingPoints },
      );
    }
    if (settings.turnTimeLimit !== undefined)
      auction.turnTimeLimit = settings.turnTimeLimit;

    return this.auctionsRepository.save(auction);
  }

  /**
   * 경매 삭제.
   *
   * 허용 status:
   *   - PENDING/CANCELLED: setup 단계 또는 취소된 경매 정리
   *   - COMPLETED: 마스터가 결과를 "버리기" 로 선택한 경우 (이력 누적 방지)
   *
   * 차단 status:
   *   - ONGOING/PAUSED/ASSIGNING: 진행 중에는 reset/complete 만 허용
   *     (실수로 진행 중 경매가 사라지는 사고 방지)
   */
  async deleteAuction(auctionId: string, adminId: string) {
    const auction = await this.loadAsCreator(
      auctionId,
      adminId,
      '경매 마스터만 삭제할 수 있습니다.',
    );
    if (
      auction.status !== AuctionStatus.PENDING &&
      auction.status !== AuctionStatus.CANCELLED &&
      auction.status !== AuctionStatus.COMPLETED
    ) {
      throw new BadRequestException(
        '진행 중인 경매는 삭제할 수 없습니다. 먼저 종료하거나 취소하세요.',
      );
    }

    // entity cascade 설정과 무관하게 명시적으로 자식 row 부터 삭제 — 안전 보장
    await this.participantsRepository.delete({ auctionId });
    await this.bidsRepository.delete({ auctionId });
    await this.auctionsRepository.remove(auction);

    return { deleted: true };
  }

  async placeBidWithValidation(
    auctionId: string,
    bidderId: string,
    targetPlayerId: string,
    amount: number,
  ) {
    return this.biddingService.placeBidWithValidation(
      auctionId,
      bidderId,
      targetPlayerId,
      amount,
    );
  }

  async start(auctionId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        userId,
        'Only creator can start auction',
      );
      if (auction.status !== AuctionStatus.PENDING)
        throw new BadRequestException('Auction already started or finished');

      auction.status = AuctionStatus.ONGOING;
      await manager.save(auction);

      return auction;
    });
  }

  async selectPlayer(auctionId: string, userId: string, playerId: string) {
    return this.biddingService.selectPlayer(auctionId, userId, playerId);
  }

  async confirmCurrentBid(auctionId: string, adminId: string) {
    return this.biddingService.confirmCurrentBid(auctionId, adminId);
  }

  async passCurrentPlayer(auctionId: string, adminId: string) {
    return this.biddingService.passCurrentPlayer(auctionId, adminId);
  }

  async autoConfirmOnTimeout(auctionId: string) {
    return this.biddingService.autoConfirmOnTimeout(auctionId);
  }

  async checkAutoConfirm(
    auctionId: string,
  ): Promise<{ shouldAutoConfirm: boolean; reason?: string }> {
    return this.biddingService.checkAutoConfirm(auctionId);
  }

  async getRoomState(auctionId: string): Promise<RoomState> {
    return this.roomStateService.getRoomState(auctionId);
  }

  /**
   * 진행 중 경매를 초기 상태로 리셋한다.
   *
   * 초기화: 매물 배정 (assignedTeamCaptainId/soldPrice/wasUnsold), 팀장 잔여 포인트,
   *         currentBiddingPlayerId, biddingPhase, 전체 bids
   * 유지:   teamCount, captains/players 등록, startingPoints/turnTimeLimit/title
   *
   * 마스터만 호출 가능. ONGOING 또는 ASSIGNING phase 에서만 동작.
   */
  async reset(auctionId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        userId,
        '관리자만 경매를 리셋할 수 있습니다.',
      );
      if (
        auction.status !== AuctionStatus.ONGOING &&
        auction.status !== AuctionStatus.ASSIGNING &&
        auction.status !== AuctionStatus.PAUSED
      ) {
        throw new BadRequestException('진행 중인 경매만 리셋할 수 있습니다.');
      }

      // 1) 전체 bids 삭제
      await manager.delete(AuctionBid, { auctionId });

      // 2) participants 재초기화
      const participants = await manager.find(AuctionParticipant, {
        where: { auctionId },
      });
      for (const p of participants) {
        if (p.role === AuctionRole.CAPTAIN) {
          p.currentPoints = auction.startingPoints;
        } else if (p.role === AuctionRole.PLAYER) {
          p.assignedTeamCaptainId = null;
          p.soldPrice = 0;
          p.wasUnsold = false;
        }
      }
      await manager.save(participants);

      // 3) auction 상태 초기화
      auction.status = AuctionStatus.ONGOING;
      auction.biddingPhase = BiddingPhase.WAITING;
      auction.currentBiddingPlayerId = null;
      auction.currentBiddingEndTime = null;
      auction.timerPaused = false;
      auction.pausedTimeRemaining = null;
      await manager.save(auction);

      return auction;
    });
  }

  async complete(auctionId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        userId,
        'Only creator can complete auction',
      );
      if (
        auction.status !== AuctionStatus.ONGOING &&
        auction.status !== AuctionStatus.ASSIGNING
      )
        throw new BadRequestException('Auction not in completable state');

      auction.status = AuctionStatus.COMPLETED;
      await manager.save(auction);

      return auction;
    });
  }

  // ========== Master Control Methods ==========

  async pauseAuction(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 일시정지할 수 있습니다.',
      );
      if (auction.status !== AuctionStatus.ONGOING)
        throw new BadRequestException(
          '진행 중인 경매만 일시정지할 수 있습니다.',
        );

      auction.status = AuctionStatus.PAUSED;

      // Save remaining timer if in bidding
      if (auction.currentBiddingEndTime) {
        const remaining = Math.max(
          0,
          Math.floor(
            (auction.currentBiddingEndTime.getTime() - Date.now()) / 1000,
          ),
        );
        auction.pausedTimeRemaining = remaining;
      }

      await manager.save(auction);
      return auction;
    });
  }

  async resumeAuction(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 재개할 수 있습니다.',
      );
      if (auction.status !== AuctionStatus.PAUSED)
        throw new BadRequestException('일시정지된 경매만 재개할 수 있습니다.');

      auction.status = AuctionStatus.ONGOING;

      // Restore timer if we have remaining time
      if (
        auction.pausedTimeRemaining !== null &&
        auction.currentBiddingPlayerId
      ) {
        auction.currentBiddingEndTime = new Date(
          Date.now() + auction.pausedTimeRemaining * 1000,
        );
      }
      auction.pausedTimeRemaining = null;

      await manager.save(auction);
      return auction;
    });
  }

  async pauseTimer(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 타이머를 정지할 수 있습니다.',
      );
      if (auction.timerPaused) {
        throw new BadRequestException('타이머가 이미 정지되어 있습니다.');
      }

      // Save remaining time
      if (auction.currentBiddingEndTime) {
        const remaining = Math.max(
          0,
          Math.floor(
            (auction.currentBiddingEndTime.getTime() - Date.now()) / 1000,
          ),
        );
        auction.pausedTimeRemaining = remaining;
      }
      auction.timerPaused = true;

      await manager.save(auction);
      return auction;
    });
  }

  async resumeTimer(auctionId: string, adminId: string) {
    return this.dataSource.transaction(async (manager) => {
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 타이머를 재개할 수 있습니다.',
      );
      if (!auction.timerPaused) {
        throw new BadRequestException('타이머가 정지 상태가 아닙니다.');
      }

      // Restore timer
      if (auction.pausedTimeRemaining !== null) {
        auction.currentBiddingEndTime = new Date(
          Date.now() + auction.pausedTimeRemaining * 1000,
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
      await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 낙찰을 취소할 수 있습니다.',
      );

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
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 다음 매물로 진행할 수 있습니다.',
      );

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
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 배정 단계로 이동할 수 있습니다.',
      );

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
      const auction = await this.loadAsCreatorTx(
        manager,
        auctionId,
        adminId,
        '관리자만 수동 배정할 수 있습니다.',
      );
      if (auction.status !== AuctionStatus.ASSIGNING)
        throw new BadRequestException(
          '수동 배정은 배정 단계에서만 가능합니다.',
        );

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
}
