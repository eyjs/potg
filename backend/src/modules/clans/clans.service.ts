import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Clan } from './entities/clan.entity';
import { ClanMember, ClanRole } from './entities/clan-member.entity';
import { ClanJoinRequest, RequestStatus } from './entities/clan-join-request.entity';
import { Announcement } from './entities/announcement.entity';
import { HallOfFame, HallOfFameType } from './entities/hall-of-fame.entity';
import { PointLog } from './entities/point-log.entity';
import { ActivityType } from './interfaces/activity.interface';
import type { ActivityEvent } from './interfaces/activity.interface';

@Injectable()
export class ClansService {
  constructor(
    @InjectRepository(Clan)
    private clansRepository: Repository<Clan>,
    @InjectRepository(ClanMember)
    private clanMembersRepository: Repository<ClanMember>,
    @InjectRepository(ClanJoinRequest)
    private joinRequestsRepository: Repository<ClanJoinRequest>,
    @InjectRepository(Announcement)
    private announcementsRepository: Repository<Announcement>,
    @InjectRepository(HallOfFame)
    private hallOfFameRepository: Repository<HallOfFame>,
    @InjectRepository(PointLog)
    private pointLogRepository: Repository<PointLog>,
    private dataSource: DataSource,
  ) {}

  async create(createClanDto: Partial<Clan>, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Clan, {
        where: [{ name: createClanDto.name }, { tag: createClanDto.tag }],
      });
      if (existing) {
        throw new BadRequestException('Clan name or tag already exists');
      }

      const clan = manager.create(Clan, createClanDto);
      const savedClan = await manager.save(clan);

      const member = manager.create(ClanMember, {
        clanId: savedClan.id,
        userId,
        role: ClanRole.MASTER,
        totalPoints: 10000,
      });
      await manager.save(member);

      const pointLog = manager.create(PointLog, {
        userId,
        clanId: savedClan.id,
        amount: 10000,
        reason: `CLAN_CREATE_MASTER:${savedClan.id}`,
      });
      await manager.save(pointLog);

      return savedClan;
    });
  }

  async requestJoin(clanId: string, userId: string, message?: string) {
    const existingMember = await this.clanMembersRepository.findOne({ where: { userId } });
    if (existingMember) throw new BadRequestException('Already in a clan');

    const existingRequest = await this.joinRequestsRepository.findOne({
      where: { clanId, userId, status: RequestStatus.PENDING },
    });
    if (existingRequest) throw new BadRequestException('Join request already pending');

    const request = this.joinRequestsRepository.create({
      clanId,
      userId,
      message,
    });
    return this.joinRequestsRepository.save(request);
  }

  async getMyPendingRequest(userId: string) {
    return this.joinRequestsRepository.findOne({
      where: { userId, status: RequestStatus.PENDING },
      relations: ['clan'],
    });
  }

  async getClanRequests(clanId: string, userId: string) {
    const member = await this.clanMembersRepository.findOne({
      where: { clanId, userId },
    });
    if (!member || member.role === ClanRole.MEMBER) {
      throw new ForbiddenException('마스터 또는 운영진만 가입 신청을 조회할 수 있습니다.');
    }

    return this.joinRequestsRepository.find({
      where: { clanId, status: RequestStatus.PENDING },
      relations: ['user'],
    });
  }

  async approveRequest(requestId: string, adminId: string) {
    const request = await this.joinRequestsRepository.findOne({
      where: { id: requestId },
      relations: ['clan'],
    });
    if (!request) throw new BadRequestException('Request not found');

    const admin = await this.clanMembersRepository.findOne({
      where: { clanId: request.clanId, userId: adminId },
    });
    if (!admin || admin.role === ClanRole.MEMBER) {
      throw new ForbiddenException('마스터 또는 운영진만 가입 신청을 승인할 수 있습니다.');
    }

    request.status = RequestStatus.APPROVED;
    await this.joinRequestsRepository.save(request);

    await this.addMember(request.clanId, request.userId);

    return request;
  }

  async rejectRequest(requestId: string, userId: string) {
    const request = await this.joinRequestsRepository.findOne({
      where: { id: requestId },
    });
    if (!request) throw new BadRequestException('Request not found');

    const admin = await this.clanMembersRepository.findOne({
      where: { clanId: request.clanId, userId },
    });
    if (!admin || admin.role === ClanRole.MEMBER) {
      throw new ForbiddenException('마스터 또는 운영진만 가입 신청을 거절할 수 있습니다.');
    }

    request.status = RequestStatus.REJECTED;
    return this.joinRequestsRepository.save(request);
  }

  findAll() {
    return this.clansRepository.find();
  }

  findOne(id: string) {
    return this.clansRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
  }

  async updateClan(
    id: string,
    data: { name?: string; description?: string },
    userId: string,
  ) {
    const member = await this.clanMembersRepository.findOne({
      where: { clanId: id, userId },
    });
    if (!member || member.role !== ClanRole.MASTER) {
      throw new ForbiddenException('클랜 마스터만 클랜 정보를 수정할 수 있습니다.');
    }

    const clan = await this.clansRepository.findOne({ where: { id } });
    if (!clan) {
      throw new BadRequestException('클랜을 찾을 수 없습니다.');
    }

    if (data.name !== undefined) {
      const existing = await this.clansRepository.findOne({
        where: { name: data.name },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('이미 사용 중인 클랜명입니다.');
      }
      clan.name = data.name;
    }
    if (data.description !== undefined) clan.description = data.description;

    return this.clansRepository.save(clan);
  }

  async addMember(clanId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(ClanMember, {
        where: { clanId, userId },
      });
      if (existing) {
        throw new BadRequestException('User already in clan');
      }

      const member = manager.create(ClanMember, {
        clanId,
        userId,
        role: ClanRole.MEMBER,
        totalPoints: 5000,
      });
      await manager.save(member);

      const pointLog = manager.create(PointLog, {
        userId,
        clanId,
        amount: 5000,
        reason: `CLAN_JOIN:${clanId}`,
      });
      await manager.save(pointLog);

      return member;
    });
  }

  async leaveClan(userId: string) {
    const member = await this.clanMembersRepository.findOne({
      where: { userId },
    });
    if (!member) {
      throw new BadRequestException('User is not in any clan');
    }
    // Prevent Master from leaving without transferring ownership or deleting clan
    if (member.role === ClanRole.MASTER) {
      throw new BadRequestException('Clan Master cannot leave. Delete clan or transfer ownership.');
    }

    await this.clanMembersRepository.remove(member);
  }

  // 클랜 멤버 목록 조회
  async getMembers(clanId: string) {
    return this.clanMembersRepository.find({
      where: { clanId },
      relations: ['user'],
      order: {
        role: 'ASC', // MASTER > MANAGER > MEMBER 순서
        createdAt: 'ASC',
      },
    });
  }

  // 역할 변경 (마스터/운영진 지정)
  async updateMemberRole(
    clanId: string,
    targetUserId: string,
    newRole: ClanRole,
    requesterId: string,
  ) {
    // 요청자 권한 확인
    const requester = await this.clanMembersRepository.findOne({
      where: { clanId, userId: requesterId },
    });
    if (!requester || requester.role !== ClanRole.MASTER) {
      throw new BadRequestException('Only clan master can change roles');
    }

    // 대상 멤버 확인
    const target = await this.clanMembersRepository.findOne({
      where: { clanId, userId: targetUserId },
    });
    if (!target) {
      throw new BadRequestException('Target user is not a clan member');
    }

    // 마스터 역할은 양도만 가능 (transferMaster 사용)
    if (newRole === ClanRole.MASTER) {
      throw new BadRequestException('Use transferMaster to change clan master');
    }

    // 자기 자신의 역할은 변경 불가
    if (requesterId === targetUserId) {
      throw new BadRequestException('Cannot change your own role');
    }

    target.role = newRole;
    return this.clanMembersRepository.save(target);
  }

  // 마스터 권한 양도 (마스터 본인만)
  async transferMaster(clanId: string, newMasterId: string, currentMasterId: string) {
    const currentMaster = await this.clanMembersRepository.findOne({
      where: { clanId, userId: currentMasterId },
    });
    if (!currentMaster || currentMaster.role !== ClanRole.MASTER) {
      throw new ForbiddenException('클랜 마스터만 마스터를 양도할 수 있습니다.');
    }

    const newMaster = await this.clanMembersRepository.findOne({
      where: { clanId, userId: newMasterId },
    });
    if (!newMaster) {
      throw new BadRequestException('대상 유저가 클랜 멤버가 아닙니다.');
    }

    currentMaster.role = ClanRole.MANAGER;
    newMaster.role = ClanRole.MASTER;
    await this.clanMembersRepository.save([currentMaster, newMaster]);

    return { message: 'Master transferred successfully' };
  }

  // 멤버 추방
  async kickMember(clanId: string, targetUserId: string, requesterId: string) {
    // 요청자 권한 확인 (마스터 또는 운영진)
    const requester = await this.clanMembersRepository.findOne({
      where: { clanId, userId: requesterId },
    });
    if (!requester || requester.role === ClanRole.MEMBER) {
      throw new BadRequestException('Only master or manager can kick members');
    }

    // 대상 멤버 확인
    const target = await this.clanMembersRepository.findOne({
      where: { clanId, userId: targetUserId },
    });
    if (!target) {
      throw new BadRequestException('Target user is not a clan member');
    }

    // 마스터는 추방 불가
    if (target.role === ClanRole.MASTER) {
      throw new BadRequestException('Cannot kick clan master');
    }

    // 운영진은 다른 운영진 추방 불가 (마스터만 가능)
    if (requester.role === ClanRole.MANAGER && target.role === ClanRole.MANAGER) {
      throw new BadRequestException('Managers cannot kick other managers');
    }

    await this.clanMembersRepository.remove(target);
    return { message: 'Member kicked successfully' };
  }

  // 내 클랜 멤버십 정보 조회
  async getMyMembership(userId: string) {
    return this.clanMembersRepository.findOne({
      where: { userId },
      relations: ['clan'],
    });
  }

  // ========== 활동 피드 ==========

  async getActivities(
    clanId: string,
    userId: string,
    limit: number = 20,
  ): Promise<ActivityEvent[]> {
    // 멤버십 검증
    const membership = await this.clanMembersRepository.findOne({
      where: { clanId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('클랜 멤버만 활동 피드를 조회할 수 있습니다.');
    }

    // 3개 테이블 병렬 조회
    const [members, pointLogs, announcements] = await Promise.all([
      // 최근 가입 멤버
      this.clanMembersRepository.find({
        where: { clanId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      // 포인트 로그 (CLAN_JOIN, CLAN_CREATE_MASTER는 멤버 가입과 중복되므로 제외)
      this.pointLogRepository
        .createQueryBuilder('log')
        .leftJoinAndSelect('log.user', 'user')
        .where('log.clanId = :clanId', { clanId })
        .andWhere('log.reason NOT LIKE :joinPattern', { joinPattern: 'CLAN_JOIN:%' })
        .andWhere('log.reason NOT LIKE :createPattern', { createPattern: 'CLAN_CREATE_MASTER:%' })
        .orderBy('log.createdAt', 'DESC')
        .take(limit)
        .getMany(),
      // 공지사항
      this.announcementsRepository.find({
        where: { clanId, isActive: true },
        relations: ['author'],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
    ]);

    const events: ActivityEvent[] = [];

    // 멤버 가입 이벤트 변환 (createdAt이 가장 오래된 멤버 = 클랜 생성자)
    const oldestCreatedAt = members.length > 0
      ? Math.min(...members.map((m) => m.createdAt.getTime()))
      : 0;

    for (const member of members) {
      const isCreator = member.createdAt.getTime() === oldestCreatedAt;
      const type = isCreator
        ? ActivityType.CLAN_CREATE
        : ActivityType.MEMBER_JOIN;
      const tag = member.user?.battleTag ?? '알 수 없음';
      const message = isCreator
        ? `${tag}님이 클랜을 생성했습니다.`
        : `${tag}님이 클랜에 가입했습니다.`;

      events.push({
        id: member.id,
        type,
        userId: member.userId,
        userBattleTag: member.user?.battleTag ?? '알 수 없음',
        userAvatarUrl: member.user?.avatarUrl ?? null,
        message,
        amount: null,
        createdAt: member.createdAt,
      });
    }

    // 포인트 로그 이벤트 변환
    for (const log of pointLogs) {
      const type = this.resolvePointLogActivityType(log.reason, log.amount);
      events.push({
        id: log.id,
        type,
        userId: log.userId,
        userBattleTag: log.user?.battleTag ?? '알 수 없음',
        userAvatarUrl: log.user?.avatarUrl ?? null,
        message: this.buildPointLogMessage(log),
        amount: log.amount,
        createdAt: log.createdAt,
      });
    }

    // 공지사항 이벤트 변환
    for (const ann of announcements) {
      events.push({
        id: ann.id,
        type: ActivityType.ANNOUNCEMENT,
        userId: ann.authorId,
        userBattleTag: ann.author?.battleTag ?? '알 수 없음',
        userAvatarUrl: ann.author?.avatarUrl ?? null,
        message: `공지: ${ann.title}`,
        amount: null,
        createdAt: ann.createdAt,
      });
    }

    // createdAt DESC 정렬 후 limit 적용
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return events.slice(0, limit);
  }

  private resolvePointLogActivityType(reason: string, amount: number): ActivityType {
    if (reason.startsWith('SEND_TO:')) return ActivityType.POINT_SENT;
    if (reason.startsWith('RECEIVE_FROM:')) return ActivityType.POINT_RECEIVED;
    if (reason.startsWith('BET_WIN:')) return ActivityType.BET_WIN;
    if (reason.startsWith('BET_LOSS:')) return ActivityType.BET_LOSS;
    return amount >= 0 ? ActivityType.POINT_RECEIVED : ActivityType.POINT_SENT;
  }

  private buildPointLogMessage(log: PointLog): string {
    const tag = log.user?.battleTag ?? '알 수 없음';
    const absAmount = Math.abs(log.amount);

    if (log.reason.startsWith('SEND_TO:')) {
      return `${tag}님이 ${absAmount}P를 보냈습니다.`;
    }
    if (log.reason.startsWith('RECEIVE_FROM:')) {
      return `${tag}님이 ${absAmount}P를 받았습니다.`;
    }
    if (log.reason.startsWith('BET_WIN:')) {
      return `${tag}님이 베팅에서 ${absAmount}P를 획득했습니다.`;
    }
    if (log.reason.startsWith('BET_LOSS:')) {
      return `${tag}님이 베팅에서 ${absAmount}P를 잃었습니다.`;
    }
    if (log.amount >= 0) {
      return `${tag}님이 ${absAmount}P를 받았습니다.`;
    }
    return `${tag}님이 ${absAmount}P를 사용했습니다.`;
  }

  // ========== 공지사항 ==========

  async getAnnouncements(clanId: string) {
    return this.announcementsRepository.find({
      where: { clanId, isActive: true },
      relations: ['author'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async createAnnouncement(
    clanId: string,
    authorId: string,
    data: { title: string; content: string; isPinned?: boolean },
  ) {
    const announcement = this.announcementsRepository.create({
      clanId,
      authorId,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned || false,
    });
    return this.announcementsRepository.save(announcement);
  }

  async updateAnnouncement(
    announcementId: string,
    data: { title?: string; content?: string; isPinned?: boolean },
    userId: string,
  ) {
    const announcement = await this.announcementsRepository.findOne({
      where: { id: announcementId },
    });
    if (!announcement) throw new BadRequestException('공지사항을 찾을 수 없습니다.');

    // 작성자 또는 마스터만 수정 가능
    const member = await this.clanMembersRepository.findOne({
      where: { clanId: announcement.clanId, userId },
    });
    if (announcement.authorId !== userId && member?.role !== ClanRole.MASTER) {
      throw new ForbiddenException('작성자 또는 마스터만 수정할 수 있습니다.');
    }

    if (data.title !== undefined) announcement.title = data.title;
    if (data.content !== undefined) announcement.content = data.content;
    if (data.isPinned !== undefined) announcement.isPinned = data.isPinned;

    return this.announcementsRepository.save(announcement);
  }

  async deleteAnnouncement(announcementId: string, userId: string) {
    const announcement = await this.announcementsRepository.findOne({
      where: { id: announcementId },
    });
    if (!announcement) throw new BadRequestException('공지사항을 찾을 수 없습니다.');

    // 작성자 또는 마스터만 삭제 가능
    const member = await this.clanMembersRepository.findOne({
      where: { clanId: announcement.clanId, userId },
    });
    if (announcement.authorId !== userId && member?.role !== ClanRole.MASTER) {
      throw new ForbiddenException('작성자 또는 마스터만 삭제할 수 있습니다.');
    }

    announcement.isActive = false;
    return this.announcementsRepository.save(announcement);
  }

  // ========== 명예의전당/기부자/현상수배 ==========

  async getHallOfFame(clanId: string, type?: HallOfFameType) {
    const where: { clanId: string; isActive: boolean; type?: HallOfFameType } = {
      clanId,
      isActive: true,
    };
    if (type) where.type = type;

    return this.hallOfFameRepository.find({
      where,
      relations: ['user'],
      order: { displayOrder: 'ASC', amount: 'DESC', createdAt: 'DESC' },
    });
  }

  async createHallOfFameEntry(
    clanId: string,
    data: {
      type: HallOfFameType;
      title: string;
      description?: string;
      userId?: string;
      amount?: number;
      imageUrl?: string;
    },
  ) {
    const entry = this.hallOfFameRepository.create({
      clanId,
      type: data.type,
      title: data.title,
      description: data.description,
      userId: data.userId,
      amount: data.amount || 0,
      imageUrl: data.imageUrl,
    });
    return this.hallOfFameRepository.save(entry);
  }

  async updateHallOfFameEntry(
    entryId: string,
    data: {
      title?: string;
      description?: string;
      userId?: string;
      amount?: number;
      imageUrl?: string;
      displayOrder?: number;
    },
  ) {
    const entry = await this.hallOfFameRepository.findOne({
      where: { id: entryId },
    });
    if (!entry) throw new BadRequestException('항목을 찾을 수 없습니다.');

    if (data.title !== undefined) entry.title = data.title;
    if (data.description !== undefined) entry.description = data.description;
    if (data.userId !== undefined) entry.userId = data.userId;
    if (data.amount !== undefined) entry.amount = data.amount;
    if (data.imageUrl !== undefined) entry.imageUrl = data.imageUrl;
    if (data.displayOrder !== undefined) entry.displayOrder = data.displayOrder;

    return this.hallOfFameRepository.save(entry);
  }

  async deleteHallOfFameEntry(entryId: string) {
    const entry = await this.hallOfFameRepository.findOne({
      where: { id: entryId },
    });
    if (!entry) throw new BadRequestException('항목을 찾을 수 없습니다.');

    entry.isActive = false;
    return this.hallOfFameRepository.save(entry);
  }
}
