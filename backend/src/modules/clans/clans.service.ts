import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clan } from './entities/clan.entity';
import { ClanMember, ClanRole } from './entities/clan-member.entity';
import { ClanJoinRequest, RequestStatus } from './entities/clan-join-request.entity';

@Injectable()
export class ClansService {
  constructor(
    @InjectRepository(Clan)
    private clansRepository: Repository<Clan>,
    @InjectRepository(ClanMember)
    private clanMembersRepository: Repository<ClanMember>,
    @InjectRepository(ClanJoinRequest)
    private joinRequestsRepository: Repository<ClanJoinRequest>,
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

  async getClanRequests(clanId: string) {
    return this.joinRequestsRepository.find({
      where: { clanId, status: RequestStatus.PENDING },
      relations: ['user'],
    });
  }

  async approveRequest(requestId: string, adminId: string) {
    const request = await this.joinRequestsRepository.findOne({ where: { id: requestId }, relations: ['clan'] });
    if (!request) throw new BadRequestException('Request not found');

    // Check admin rights (simplified: check if admin is in same clan as MASTER/MANAGER)
    // In real app, check role.
    
    request.status = RequestStatus.APPROVED;
    await this.joinRequestsRepository.save(request);

    // Add to member
    await this.addMember(request.clanId, request.userId);
    
    return request;
  }

  async rejectRequest(requestId: string) {
    const request = await this.joinRequestsRepository.findOne({ where: { id: requestId } });
    if (!request) throw new BadRequestException('Request not found');
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

  // 마스터 권한 양도
  async transferMaster(clanId: string, newMasterId: string, currentMasterId: string) {
    // 현재 마스터 확인
    const currentMaster = await this.clanMembersRepository.findOne({
      where: { clanId, userId: currentMasterId },
    });
    if (!currentMaster || currentMaster.role !== ClanRole.MASTER) {
      throw new BadRequestException('Only clan master can transfer ownership');
    }

    // 새 마스터 확인
    const newMaster = await this.clanMembersRepository.findOne({
      where: { clanId, userId: newMasterId },
    });
    if (!newMaster) {
      throw new BadRequestException('Target user is not a clan member');
    }

    // 역할 교환
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
}
