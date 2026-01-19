import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Scrim, ScrimStatus } from './entities/scrim.entity';
import {
  ScrimParticipant,
  AssignedTeam,
} from './entities/scrim-participant.entity';
import { CreateScrimDto, UpdateScrimDto } from './dto/scrim.dto';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';

const SCRIM_WIN_REWARD = 1000;

@Injectable()
export class ScrimsService {
  constructor(
    @InjectRepository(Scrim)
    private scrimsRepository: Repository<Scrim>,
    @InjectRepository(ScrimParticipant)
    private participantsRepository: Repository<ScrimParticipant>,
    private dataSource: DataSource,
  ) {}

  async create(createScrimDto: CreateScrimDto, userId: string) {
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

  async update(id: string, updateScrimDto: UpdateScrimDto) {
    if (updateScrimDto.status === ScrimStatus.FINISHED) {
      return this.finishScrim(id, updateScrimDto);
    }
    await this.scrimsRepository.update(id, updateScrimDto);
    return this.findOne(id);
  }

  private async finishScrim(id: string, updateDto: UpdateScrimDto) {
    return this.dataSource.transaction(async (manager) => {
      const scrim = await manager.findOne(Scrim, {
        where: { id },
        relations: ['participants'],
      });
      if (!scrim) throw new BadRequestException('Scrim not found');
      if (scrim.status === ScrimStatus.FINISHED)
        throw new BadRequestException('Already finished');

      // Update basic fields
      Object.assign(scrim, updateDto);
      await manager.save(scrim);

      const winningTeam =
        scrim.teamAScore > scrim.teamBScore
          ? AssignedTeam.TEAM_A
          : scrim.teamBScore > scrim.teamAScore
            ? AssignedTeam.TEAM_B
            : null;

      if (winningTeam && scrim.clanId) {
        const winners = scrim.participants.filter(
          (p) => p.assignedTeam === winningTeam,
        );

        for (const winner of winners) {
          const clanMember = await manager.findOne(ClanMember, {
            where: { userId: winner.userId, clanId: scrim.clanId },
          });

          if (clanMember) {
            clanMember.totalPoints += SCRIM_WIN_REWARD;
            await manager.save(clanMember);

            const log = manager.create(PointLog, {
              userId: winner.userId,
              clanId: scrim.clanId,
              amount: SCRIM_WIN_REWARD,
              reason: `SCRIM_WIN:${scrim.id}`,
            });
            await manager.save(log);
          }
        }
      }

      return scrim;
    });
  }
}
