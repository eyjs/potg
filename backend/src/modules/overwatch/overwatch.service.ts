import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OverwatchProfile,
  OverwatchStatsSnapshot,
} from './entities/overwatch-profile.entity';
import { OverwatchApiService } from './overwatch-api.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OverwatchService {
  private readonly logger = new Logger(OverwatchService.name);

  constructor(
    @InjectRepository(OverwatchProfile)
    private readonly profileRepo: Repository<OverwatchProfile>,
    @InjectRepository(OverwatchStatsSnapshot)
    private readonly snapshotRepo: Repository<OverwatchStatsSnapshot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly overwatchApi: OverwatchApiService,
  ) {}

  /**
   * 프로필 조회 (캐시 우선, 없으면 동기화)
   */
  async getProfile(userId: string): Promise<OverwatchProfile> {
    let profile = await this.profileRepo.findOne({ where: { userId } });

    if (!profile) {
      // 프로필이 없으면 자동 생성 & 동기화
      profile = await this.createAndSyncProfile(userId);
    }

    return profile;
  }

  /**
   * 프로필 생성 및 첫 동기화
   */
  private async createAndSyncProfile(
    userId: string,
  ): Promise<OverwatchProfile> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    if (!user.battleTag) {
      throw new BadRequestException('BattleTag가 설정되지 않았습니다.');
    }

    const profile = this.profileRepo.create({
      userId,
      battleTag: user.battleTag,
      platform: 'pc',
    });

    await this.profileRepo.save(profile);
    return this.syncProfile(userId);
  }

  /**
   * 프로필 동기화 (OverFastAPI 호출)
   */
  async syncProfile(userId: string): Promise<OverwatchProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다.');
    }

    try {
      // OverFastAPI에서 데이터 가져오기
      const summary = await this.overwatchApi.getPlayerSummary(
        profile.battleTag,
      );

      if (!summary) {
        profile.lastSyncStatus = 'not_found';
        profile.lastSyncError = '플레이어를 찾을 수 없습니다.';
        profile.lastSyncedAt = new Date();
        await this.profileRepo.save(profile);
        return profile;
      }

      // 프로필 업데이트
      profile.avatar = summary.avatar ?? undefined;
      profile.namecard = summary.namecard ?? undefined;
      profile.title = summary.title ?? undefined;
      profile.endorsementLevel = summary.endorsement?.level || 0;
      profile.privacy = summary.privacy;
      profile.competitiveRank =
        summary.competitive as unknown as Record<string, unknown>;

      // 통계 가져오기 (공개 프로필만)
      if (summary.privacy === 'public') {
        const stats = await this.overwatchApi.getPlayerStats(
          profile.battleTag,
          'competitive',
          profile.platform as 'pc' | 'console',
        );

        if (stats) {
          profile.statsSummary =
            stats.general as unknown as Record<string, unknown>;
          profile.topHeroes = stats.heroes as unknown as Record<string, unknown>;
        }
      }

      profile.lastSyncedAt = new Date();
      profile.lastSyncStatus = 'success';
      profile.lastSyncError = undefined;

      await this.profileRepo.save(profile);
      this.logger.log(`Profile synced: ${profile.battleTag}`);

      return profile;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      profile.lastSyncStatus = 'error';
      profile.lastSyncError = errorMessage;
      profile.lastSyncedAt = new Date();
      await this.profileRepo.save(profile);

      this.logger.error(`Sync failed for ${profile.battleTag}: ${errorMessage}`);
      return profile;
    }
  }

  /**
   * 경쟁전 정보 조회
   */
  async getCompetitiveInfo(userId: string) {
    const profile = await this.getProfile(userId);
    return {
      battleTag: profile.battleTag,
      competitive: profile.competitiveRank,
      endorsementLevel: profile.endorsementLevel,
      privacy: profile.privacy,
      lastSyncedAt: profile.lastSyncedAt,
    };
  }

  /**
   * 영웅 통계 조회
   */
  async getHeroStats(userId: string) {
    const profile = await this.getProfile(userId);
    return {
      battleTag: profile.battleTag,
      topHeroes: profile.topHeroes,
      statsSummary: profile.statsSummary,
      lastSyncedAt: profile.lastSyncedAt,
    };
  }

  /**
   * 통계 스냅샷 저장
   */
  async saveSnapshot(userId: string): Promise<OverwatchStatsSnapshot> {
    const profile = await this.getProfile(userId);

    const snapshot = this.snapshotRepo.create({
      profileId: profile.id,
      snapshotDate: new Date(),
      snapshot: {
        competitiveRank: profile.competitiveRank,
        statsSummary: profile.statsSummary,
        topHeroes: profile.topHeroes,
        endorsementLevel: profile.endorsementLevel,
      },
    });

    return this.snapshotRepo.save(snapshot);
  }

  /**
   * 스냅샷 히스토리 조회
   */
  async getSnapshots(
    userId: string,
    limit = 30,
  ): Promise<OverwatchStatsSnapshot[]> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) return [];

    return this.snapshotRepo.find({
      where: { profileId: profile.id },
      order: { snapshotDate: 'DESC' },
      take: limit,
    });
  }

  /**
   * 클랜원 랭킹 조회
   */
  async getClanRankings(clanId: string) {
    const profiles = await this.profileRepo
      .createQueryBuilder('profile')
      .innerJoin('users', 'user', 'user.id = profile.userId')
      .innerJoin('clan_members', 'member', 'member.userId = user.id')
      .where('member.clanId = :clanId', { clanId })
      .select([
        'profile.userId',
        'profile.battleTag',
        'profile.competitiveRank',
        'profile.endorsementLevel',
        'profile.avatar',
        'profile.lastSyncedAt',
      ])
      .getMany();

    return profiles
      .map((p) => ({
        userId: p.userId,
        battleTag: p.battleTag,
        avatar: p.avatar,
        endorsementLevel: p.endorsementLevel,
        competitive: p.competitiveRank,
        lastSyncedAt: p.lastSyncedAt,
      }))
      .sort((a, b) => b.endorsementLevel - a.endorsementLevel);
  }

  /**
   * 동기화 설정 변경
   */
  async updateSyncSettings(
    userId: string,
    autoSync: boolean,
  ): Promise<OverwatchProfile> {
    const profile = await this.getProfile(userId);
    profile.autoSync = autoSync;
    return this.profileRepo.save(profile);
  }
}
