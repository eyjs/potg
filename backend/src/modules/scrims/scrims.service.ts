import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scrim } from './entities/scrim.entity';
import { ScrimParticipant } from './entities/scrim-participant.entity';

@Injectable()
export class ScrimsService {
  constructor(
    @InjectRepository(Scrim)
    private scrimsRepository: Repository<Scrim>,
    @InjectRepository(ScrimParticipant)
    private participantsRepository: Repository<ScrimParticipant>,
  ) {}

  async create(createScrimDto: any, userId: string) {
    const scrim = this.scrimsRepository.create({
      ...createScrimDto,
      hostId: userId,
    });
    return this.scrimsRepository.save(scrim);
  }

  findAll(clanId: string) {
    return this.scrimsRepository.find({
      where: { clanId },
      relations: ['participants'],
    });
  }

  findOne(id: string) {
    return this.scrimsRepository.findOne({
      where: { id },
      relations: ['participants'],
    });
  }

  async update(id: string, updateScrimDto: any) {
    await this.scrimsRepository.update(id, updateScrimDto);
    return this.findOne(id);
  }
}
