import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clan } from './entities/clan.entity';
import { ClanMember, ClanRole } from './entities/clan-member.entity';
import { ClanJoinRequest, RequestStatus } from './entities/clan-join-request.entity';
import { Announcement } from './entities/announcement.entity';
import { HallOfFame, HallOfFameType } from './entities/hall-of-fame.entity';
import { User, UserRole } from '../users/entities/user.entity';

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
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createClanDto: Partial<Clan>, userId: string) {
    // ... existing logic
    // Check if name or tag exists
    const existing = await this.clansRepository.findOne({
      where: [{ name: createClanDto.name }, { tag: createClanDto.tag }],
    });
    if (existing) {
      throw new BadRequestException('Clan name or tag already exists');
    }

    const clan = this.clansRepository.create(createClanDto);
    const savedClan = await this.clansRepository.save(clan);

    // Add creator as MASTER
    const member = this.clanMembersRepository.create({
      clanId: savedClan.id,
      userId: userId,
      role: ClanRole.MASTER,
      totalPoints: 10000,
    });
    await this.clanMembersRepository.save(member);

    return savedClan;
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
    // Check if already member
    const existing = await this.clanMembersRepository.findOne({
      where: { clanId, userId },
    });
    if (existing) {
      throw new BadRequestException('User already in clan');
    }

    const member = this.clanMembersRepository.create({
      clanId,
      userId,
      role: ClanRole.MEMBER,
      totalPoints: 5000, // Initial points for new members
    });
    return this.clanMembersRepository.save(member);
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

  // 마스터 권한 양도 (마스터 본인 또는 시스템 ADMIN)
  async transferMaster(clanId: string, newMasterId: string, requesterId: string) {
    const requester = await this.usersRepository.findOne({
      where: { id: requesterId },
    });
    const isAdmin = requester?.role === UserRole.ADMIN;

    const requesterMember = await this.clanMembersRepository.findOne({
      where: { clanId, userId: requesterId },
    });
    const isMaster = requesterMember?.role === ClanRole.MASTER;

    if (!isMaster && !isAdmin) {
      throw new ForbiddenException('클랜 마스터 또는 시스템 관리자만 마스터를 양도할 수 있습니다.');
    }

    // 현재 마스터 찾기
    const currentMaster = await this.clanMembersRepository.findOne({
      where: { clanId, role: ClanRole.MASTER },
    });

    // 새 마스터 확인
    const newMaster = await this.clanMembersRepository.findOne({
      where: { clanId, userId: newMasterId },
    });
    if (!newMaster) {
      throw new BadRequestException('대상 유저가 클랜 멤버가 아닙니다.');
    }

    // 역할 교환
    if (currentMaster) {
      currentMaster.role = ClanRole.MANAGER;
      await this.clanMembersRepository.save(currentMaster);
    }
    newMaster.role = ClanRole.MASTER;
    await this.clanMembersRepository.save(newMaster);

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
