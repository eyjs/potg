import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Scrim, ScrimStatus } from './entities/scrim.entity';
import {
  ScrimParticipant,
  AssignedTeam,
  ParticipantSource,
  ParticipantStatus,
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
    if (updateScrimDto.status === ScrimStatus.SCHEDULED) {
      return this.confirmTeams(id);
    }
    await this.scrimsRepository.update(id, updateScrimDto);
    return this.findOne(id);
  }

  private async confirmTeams(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const scrim = await manager.findOne(Scrim, {
        where: { id },
        relations: ['participants', 'participants.user'],
      });
      if (!scrim) throw new BadRequestException('Scrim not found');
      if (scrim.status !== ScrimStatus.DRAFT)
        throw new BadRequestException('Can only confirm teams in DRAFT status');

      // Create teamSnapshot
      const teamAPlayers = scrim.participants.filter(
        (p) => p.assignedTeam === AssignedTeam.TEAM_A,
      );
      const teamBPlayers = scrim.participants.filter(
        (p) => p.assignedTeam === AssignedTeam.TEAM_B,
      );
      const benchPlayers = scrim.participants.filter(
        (p) => p.assignedTeam === AssignedTeam.BENCH,
      );

      const teamSnapshot = {
        recruitmentType: scrim.recruitmentType,
        sourceId: scrim.voteId || scrim.auctionId || null,
        teamA: {
          players: teamAPlayers.map((p) => ({
            userId: p.userId,
            battleTag: p.user?.battleTag || 'Unknown',
            role: p.user?.mainRole || 'FLEX',
            rating: p.user?.rating || 0,
          })),
        },
        teamB: {
          players: teamBPlayers.map((p) => ({
            userId: p.userId,
            battleTag: p.user?.battleTag || 'Unknown',
            role: p.user?.mainRole || 'FLEX',
            rating: p.user?.rating || 0,
          })),
        },
        bench: benchPlayers.map((p) => ({
          userId: p.userId,
          battleTag: p.user?.battleTag || 'Unknown',
          role: p.user?.mainRole || 'FLEX',
          rating: p.user?.rating || 0,
        })),
        snapshotAt: new Date().toISOString(),
      };

      scrim.teamSnapshot = teamSnapshot;
      scrim.status = ScrimStatus.SCHEDULED;
      await manager.save(scrim);

      return scrim;
    });
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

  // Participant management APIs (docs/scrim/PROCESS.md:209-259)
  async addParticipant(
    scrimId: string,
    userId: string,
    source: ParticipantSource = ParticipantSource.MANUAL,
  ) {
    const scrim = await this.scrimsRepository.findOne({
      where: { id: scrimId },
    });
    if (!scrim) throw new BadRequestException('Scrim not found');
    if (scrim.status !== ScrimStatus.DRAFT)
      throw new BadRequestException(
        'Can only add participants in DRAFT status',
      );

    const existing = await this.participantsRepository.findOne({
      where: { scrimId, userId },
    });
    if (existing) throw new BadRequestException('User already participating');

    const participant = this.participantsRepository.create({
      scrimId,
      userId,
      source,
      status: ParticipantStatus.CONFIRMED,
      assignedTeam: AssignedTeam.UNASSIGNED,
    });

    return this.participantsRepository.save(participant);
  }

  async assignTeam(scrimId: string, userId: string, team: AssignedTeam) {
    const scrim = await this.scrimsRepository.findOne({
      where: { id: scrimId },
    });
    if (!scrim) throw new BadRequestException('Scrim not found');
    if (scrim.status !== ScrimStatus.DRAFT)
      throw new BadRequestException('Can only assign teams in DRAFT status');

    const participant = await this.participantsRepository.findOne({
      where: { scrimId, userId },
    });
    if (!participant) throw new BadRequestException('Participant not found');

    participant.assignedTeam = team;
    return this.participantsRepository.save(participant);
  }

  async removeParticipant(scrimId: string, userId: string) {
    const scrim = await this.scrimsRepository.findOne({
      where: { id: scrimId },
    });
    if (!scrim) throw new BadRequestException('Scrim not found');
    if (scrim.status !== ScrimStatus.DRAFT)
      throw new BadRequestException(
        'Can only remove participants in DRAFT status',
      );

    const participant = await this.participantsRepository.findOne({
      where: { scrimId, userId },
    });
    if (!participant) throw new BadRequestException('Participant not found');

    participant.status = ParticipantStatus.REMOVED;
    return this.participantsRepository.save(participant);
  }
}
