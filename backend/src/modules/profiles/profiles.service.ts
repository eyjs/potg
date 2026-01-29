import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MemberProfile } from './entities/member-profile.entity';
import { Follow } from './entities/follow.entity';
import { Guestbook } from './entities/guestbook.entity';
import { ProfileVisit } from './entities/profile-visit.entity';
import { UpdateProfileDto, EquipItemsDto, CreateGuestbookDto } from './dto/profile.dto';
import { ClanMember } from '../clans/entities/clan-member.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(MemberProfile)
    private profileRepo: Repository<MemberProfile>,
    @InjectRepository(Follow)
    private followRepo: Repository<Follow>,
    @InjectRepository(Guestbook)
    private guestbookRepo: Repository<Guestbook>,
    @InjectRepository(ProfileVisit)
    private visitRepo: Repository<ProfileVisit>,
    @InjectRepository(ClanMember)
    private memberRepo: Repository<ClanMember>,
    private dataSource: DataSource,
  ) {}

  // ==================== 헬퍼 ====================

  async getMemberIdByUserId(userId: string, clanId?: string): Promise<string | null> {
    const query = this.memberRepo.createQueryBuilder('member')
      .where('member.userId = :userId', { userId });
    
    if (clanId) {
      query.andWhere('member.clanId = :clanId', { clanId });
    }
    
    const member = await query.getOne();
    return member?.id || null;
  }

  // ==================== 프로필 ====================

  async getProfile(memberId: string, viewerId?: string): Promise<MemberProfile> {
    let profile = await this.profileRepo.findOne({
      where: { memberId },
      relations: ['member', 'member.user'],
    });

    if (!profile) {
      // 프로필이 없으면 자동 생성
      const member = await this.memberRepo.findOne({
        where: { id: memberId },
        relations: ['user'],
      });
      if (!member) {
        throw new NotFoundException('멤버를 찾을 수 없습니다.');
      }

      profile = this.profileRepo.create({
        memberId,
        displayName: member.user.battleTag || member.user.username,
      });
      await this.profileRepo.save(profile);
      profile.member = member;
    }

    // 방문자 기록 (본인 제외)
    if (viewerId && viewerId !== memberId) {
      await this.recordVisit(profile.id, viewerId);
    }

    return profile;
  }

  async updateProfile(memberId: string, dto: UpdateProfileDto): Promise<MemberProfile> {
    const profile = await this.getProfile(memberId);
    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }

  async equipItems(memberId: string, dto: EquipItemsDto): Promise<MemberProfile> {
    const profile = await this.getProfile(memberId);
    
    if (dto.themeId !== undefined) profile.themeId = dto.themeId;
    if (dto.frameId !== undefined) profile.frameId = dto.frameId;
    if (dto.petId !== undefined) profile.petId = dto.petId;
    if (dto.bgmUrl !== undefined) profile.bgmUrl = dto.bgmUrl;
    if (dto.bgmTitle !== undefined) profile.bgmTitle = dto.bgmTitle;

    return this.profileRepo.save(profile);
  }

  // ==================== 팔로우 ====================

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new ForbiddenException('자기 자신을 팔로우할 수 없습니다.');
    }

    await this.dataSource.transaction(async (manager) => {
      // PostgreSQL: INSERT ... ON CONFLICT DO NOTHING RETURNING id
      // 실제로 삽입된 경우에만 row가 반환됨
      const inserted = await manager.query(
        `INSERT INTO follows ("followerId", "followingId")
         VALUES ($1, $2)
         ON CONFLICT ("followerId", "followingId") DO NOTHING
         RETURNING id`,
        [followerId, followingId],
      );

      // 실제로 삽입된 경우에만 카운트 증가
      if (inserted.length > 0) {
        await manager.increment(MemberProfile, { memberId: followerId }, 'followingCount', 1);
        await manager.increment(MemberProfile, { memberId: followingId }, 'followerCount', 1);
      }
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.delete(Follow, { followerId, followingId });

      if (result.affected && result.affected > 0) {
        await manager.decrement(MemberProfile, { memberId: followerId }, 'followingCount', 1);
        await manager.decrement(MemberProfile, { memberId: followingId }, 'followerCount', 1);
      }
    });
  }

  async getFollowers(memberId: string, page = 1, limit = 20): Promise<{ data: Follow[]; total: number }> {
    const [data, total] = await this.followRepo.findAndCount({
      where: { followingId: memberId },
      relations: ['follower', 'follower.user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async getFollowing(memberId: string, page = 1, limit = 20): Promise<{ data: Follow[]; total: number }> {
    const [data, total] = await this.followRepo.findAndCount({
      where: { followerId: memberId },
      relations: ['following', 'following.user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.followRepo.count({ where: { followerId, followingId } });
    return count > 0;
  }

  // ==================== 방명록 ====================

  async getGuestbook(profileId: string, viewerId?: string, page = 1, limit = 20): Promise<{ data: Guestbook[]; total: number }> {
    const profile = await this.profileRepo.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('프로필을 찾을 수 없습니다.');

    const query = this.guestbookRepo.createQueryBuilder('g')
      .leftJoinAndSelect('g.writer', 'writer')
      .leftJoinAndSelect('writer.user', 'user')
      .where('g.profileId = :profileId', { profileId })
      .orderBy('g.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // 비밀글은 프로필 주인만 볼 수 있음
    if (viewerId !== profile.memberId) {
      query.andWhere('g.isSecret = false');
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async createGuestbook(profileId: string, writerId: string, dto: CreateGuestbookDto): Promise<Guestbook> {
    const profile = await this.profileRepo.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('프로필을 찾을 수 없습니다.');

    const guestbook = this.guestbookRepo.create({
      profileId,
      writerId,
      ...dto,
    });
    return this.guestbookRepo.save(guestbook);
  }

  async deleteGuestbook(id: string, requesterId: string): Promise<void> {
    const guestbook = await this.guestbookRepo.findOne({
      where: { id },
      relations: ['profile'],
    });
    
    if (!guestbook) throw new NotFoundException('방명록을 찾을 수 없습니다.');
    
    // 작성자 또는 프로필 주인만 삭제 가능
    if (guestbook.writerId !== requesterId && guestbook.profile.memberId !== requesterId) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    await this.guestbookRepo.delete(id);
  }

  // ==================== 방문자 ====================

  async recordVisit(profileId: string, visitorId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.visitRepo.findOne({
      where: { profileId, visitorId, visitDate: today },
    });

    if (!existing) {
      await this.visitRepo.save({ profileId, visitorId, visitDate: today });
      await this.profileRepo.increment({ id: profileId }, 'todayVisitors', 1);
      await this.profileRepo.increment({ id: profileId }, 'totalVisitors', 1);
    }
  }

  async getVisitors(profileId: string, page = 1, limit = 20): Promise<{ data: ProfileVisit[]; total: number }> {
    const [data, total] = await this.visitRepo.findAndCount({
      where: { profileId },
      order: { visitDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  // 매일 자정에 todayVisitors 초기화 (Cron Job)
  async resetTodayVisitors(): Promise<void> {
    await this.profileRepo.update({}, { todayVisitors: 0 });
  }
}
