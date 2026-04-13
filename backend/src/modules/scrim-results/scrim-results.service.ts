import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ScrimResult, ScrimResultStatus } from './entities/scrim-result.entity';
import { ScrimResultEntry } from './entities/scrim-result-entry.entity';
import { AuctionParticipant, AuctionRole } from '../auctions/entities/auction-participant.entity';
import { Auction, AuctionStatus } from '../auctions/entities/auction.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { WalletService } from '../wallet/wallet.service';
import { CreateScrimResultDto } from './dto/create-scrim-result.dto';
import { UpdateScrimResultDto } from './dto/update-scrim-result.dto';

@Injectable()
export class ScrimResultsService {
  private readonly logger = new Logger(ScrimResultsService.name);

  constructor(
    @InjectRepository(ScrimResult)
    private resultRepo: Repository<ScrimResult>,
    @InjectRepository(ScrimResultEntry)
    private entryRepo: Repository<ScrimResultEntry>,
    @InjectRepository(AuctionParticipant)
    private participantRepo: Repository<AuctionParticipant>,
    @InjectRepository(Auction)
    private auctionRepo: Repository<Auction>,
    @InjectRepository(ClanMember)
    private clanMemberRepo: Repository<ClanMember>,
    private walletService: WalletService,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a scrim result in DRAFT status.
   * Automatically populates entries from auction participants.
   */
  async create(
    dto: CreateScrimResultDto,
    adminUserId: string,
  ): Promise<ScrimResult> {
    const auction = await this.auctionRepo.findOne({
      where: { id: dto.auctionId },
    });
    if (!auction) {
      throw new NotFoundException('경매를 찾을 수 없습니다.');
    }
    if (auction.status !== AuctionStatus.COMPLETED) {
      throw new BadRequestException('완료된 경매만 내전 결과를 등록할 수 있습니다.');
    }

    const existing = await this.resultRepo.findOne({
      where: { auctionId: dto.auctionId },
    });
    if (existing) {
      throw new BadRequestException('이미 내전 결과가 등록된 경매입니다.');
    }

    // Get all participants (captains + players assigned to teams)
    const participants = await this.participantRepo.find({
      where: { auctionId: dto.auctionId },
      relations: ['user'],
    });

    const captains = participants.filter(
      (p) => p.role === AuctionRole.CAPTAIN,
    );
    const players = participants.filter(
      (p) =>
        p.role === AuctionRole.PLAYER && p.assignedTeamCaptainId !== null,
    );

    // Build ranking map: teamCaptainId -> { rank, points }
    const rankingMap = new Map(
      dto.rankings.map((r) => [r.teamCaptainId, { rank: r.rank, points: r.points }]),
    );

    return this.dataSource.transaction(async (manager) => {
      const result = manager.create(ScrimResult, {
        auctionId: dto.auctionId,
        status: ScrimResultStatus.DRAFT,
      });
      const savedResult = await manager.save(result);

      const entries: ScrimResultEntry[] = [];

      // Create entries for captains
      for (const captain of captains) {
        const ranking = rankingMap.get(captain.userId);
        if (!ranking) continue;

        const multiplier = 2; // Captain gets x2
        const entry = manager.create(ScrimResultEntry, {
          scrimResultId: savedResult.id,
          userId: captain.userId,
          teamCaptainId: captain.userId,
          rank: ranking.rank,
          basePoints: ranking.points,
          earnedActivityPoints: ranking.points * multiplier,
          earnedScrimPoints: ranking.points * multiplier,
          isCaptain: true,
        });
        entries.push(entry);
      }

      // Create entries for players
      for (const player of players) {
        const ranking = rankingMap.get(player.assignedTeamCaptainId!);
        if (!ranking) continue;

        const entry = manager.create(ScrimResultEntry, {
          scrimResultId: savedResult.id,
          userId: player.userId,
          teamCaptainId: player.assignedTeamCaptainId!,
          rank: ranking.rank,
          basePoints: ranking.points,
          earnedActivityPoints: ranking.points,
          earnedScrimPoints: ranking.points,
          isCaptain: false,
        });
        entries.push(entry);
      }

      await manager.save(entries);

      return this.resultRepo.findOne({
        where: { id: savedResult.id },
        relations: ['entries', 'entries.user'],
      }) as Promise<ScrimResult>;
    });
  }

  /**
   * Get scrim result by auction ID.
   */
  async findByAuctionId(auctionId: string): Promise<ScrimResult | null> {
    return this.resultRepo.findOne({
      where: { auctionId },
      relations: ['entries', 'entries.user'],
      order: { entries: { rank: 'ASC', isCaptain: 'DESC' } },
    });
  }

  /**
   * Get scrim result by ID.
   */
  async findById(id: string): Promise<ScrimResult> {
    const result = await this.resultRepo.findOne({
      where: { id },
      relations: ['entries', 'entries.user'],
    });
    if (!result) {
      throw new NotFoundException('내전 결과를 찾을 수 없습니다.');
    }
    return result;
  }

  /**
   * Update a draft scrim result (re-enter rankings).
   */
  async update(
    id: string,
    dto: UpdateScrimResultDto,
  ): Promise<ScrimResult> {
    const result = await this.findById(id);
    if (result.status !== ScrimResultStatus.DRAFT) {
      throw new BadRequestException('확정된 결과는 수정할 수 없습니다.');
    }

    const rankingMap = new Map(
      dto.rankings.map((r) => [r.teamCaptainId, { rank: r.rank, points: r.points }]),
    );

    return this.dataSource.transaction(async (manager) => {
      for (const entry of result.entries) {
        const ranking = rankingMap.get(entry.teamCaptainId);
        if (!ranking) continue;

        const multiplier = entry.isCaptain ? 2 : 1;
        entry.rank = ranking.rank;
        entry.basePoints = ranking.points;
        entry.earnedActivityPoints = ranking.points * multiplier;
        entry.earnedScrimPoints = ranking.points * multiplier;
      }

      await manager.save(result.entries);
      return this.findById(id);
    });
  }

  /**
   * Confirm a scrim result and award points to all participants.
   */
  async confirm(id: string, adminUserId: string): Promise<ScrimResult> {
    const result = await this.findById(id);
    if (result.status !== ScrimResultStatus.DRAFT) {
      throw new BadRequestException('이미 확정된 결과입니다.');
    }

    // Get auction to find the clan
    const auction = await this.auctionRepo.findOne({
      where: { id: result.auctionId },
    });
    if (!auction) {
      throw new NotFoundException('경매를 찾을 수 없습니다.');
    }

    // Find the clan through the creator
    const creatorMember = await this.clanMemberRepo.findOne({
      where: { userId: auction.creatorId },
    });
    if (!creatorMember) {
      throw new BadRequestException('경매 생성자의 클랜 정보를 찾을 수 없습니다.');
    }
    const clanId = creatorMember.clanId;

    return this.dataSource.transaction(async (manager) => {
      // Award points to each participant
      for (const entry of result.entries) {
        try {
          await this.walletService.addScrimPoints(
            entry.userId,
            clanId,
            entry.earnedActivityPoints,
            entry.earnedScrimPoints,
            `SCRIM_RESULT:${id}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to award scrim points to user ${entry.userId}: ${error}`,
          );
        }
      }

      // Update result status
      result.status = ScrimResultStatus.CONFIRMED;
      result.confirmedAt = new Date();
      result.confirmedById = adminUserId;
      await manager.save(ScrimResult, result);

      return this.findById(id);
    });
  }

  /**
   * Get scrim points ranking for a clan.
   */
  async getRanking(
    clanId: string,
    limit = 20,
  ): Promise<
    {
      userId: string;
      nickname: string | null;
      battleTag: string;
      avatarUrl: string | null;
      scrimPoints: number;
      totalPoints: number;
      rank: number;
    }[]
  > {
    const members = await this.clanMemberRepo
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
      scrimPoints: m.scrimPoints,
      totalPoints: m.totalPoints,
      rank: index + 1,
    }));
  }
}
