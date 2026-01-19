import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clan } from './entities/clan.entity';
import { ClanMember, ClanRole } from './entities/clan-member.entity';

@Injectable()
export class ClansService {
  constructor(
    @InjectRepository(Clan)
    private clansRepository: Repository<Clan>,
    @InjectRepository(ClanMember)
    private clanMembersRepository: Repository<ClanMember>,
  ) {}

  async create(createClanDto: Partial<Clan>, userId: string) {
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
    });
    await this.clanMembersRepository.save(member);

    return savedClan;
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
    });
    return this.clanMembersRepository.save(member);
  }
}
