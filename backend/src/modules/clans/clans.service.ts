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
}
