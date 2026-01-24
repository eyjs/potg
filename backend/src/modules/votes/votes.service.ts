import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote, VoteStatus } from './entities/vote.entity';
import { VoteOption } from './entities/vote-option.entity';
import { VoteRecord } from './entities/vote-record.entity';
import { CreateVoteDto } from './dto/vote.dto';
import { ScrimsService } from '../scrims/scrims.service';
import { RecruitmentType } from '../scrims/entities/scrim.entity';
import { ParticipantSource } from '../scrims/entities/scrim-participant.entity';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private votesRepository: Repository<Vote>,
    @InjectRepository(VoteOption)
    private voteOptionsRepository: Repository<VoteOption>,
    @InjectRepository(VoteRecord)
    private voteRecordsRepository: Repository<VoteRecord>,
    private scrimsService: ScrimsService,
  ) {}

  async create(createVoteDto: CreateVoteDto, userId: string) {
    const { options, ...voteData } = createVoteDto;
    const vote = this.votesRepository.create({
      ...voteData,
      creatorId: userId,
    }) as unknown as Vote;

    // Create options
    if (options && options.length > 0) {
      vote.options = options.map((opt) =>
        this.voteOptionsRepository.create({ label: opt.label }),
      );
    }

    return this.votesRepository.save(vote);
  }

  async findAll(clanId: string, userId?: string) {
    const votes = await this.votesRepository.find({
      where: { clanId },
      relations: ['options'],
      order: { createdAt: 'DESC' }
    });

    if (!userId) return votes;

    // Fetch user's voting records for these votes
    const records = await this.voteRecordsRepository.find({
      where: { userId },
      relations: ['option']
    });

    // Map user selection to each vote
    return votes.map(vote => {
      const userRecord = records.find(r => r.voteId === vote.id);
      return {
        ...vote,
        userSelection: userRecord ? userRecord.option.label : null
      };
    });
  }

  async findOne(id: string) {
    return this.votesRepository.findOne({
      where: { id },
      relations: ['options'],
    });
  }

  async castVote(voteId: string, optionId: string, userId: string) {
    // ... existing code ...
    const vote = await this.findOne(voteId);
    if (!vote) throw new BadRequestException('Vote not found');
    if (vote.status !== VoteStatus.OPEN)
      throw new BadRequestException('Vote is closed');

    // Check if already voted (if not multiple choice)
    const existing = await this.voteRecordsRepository.findOne({
      where: { voteId, userId },
    });

    if (existing && !vote.multipleChoice) {
      // Update existing vote (docs/vote/PROCESS.md:26-30)
      const oldOptionId = existing.optionId;

      // Decrement old option count
      await this.voteOptionsRepository.decrement(
        { id: oldOptionId },
        'count',
        1,
      );

      // Update to new option
      existing.optionId = optionId;
      await this.voteRecordsRepository.save(existing);

      // Increment new option count
      await this.voteOptionsRepository.increment({ id: optionId }, 'count', 1);

      return { success: true };
    }

    // If multiple choice allowed, check if already voted for THIS option
    if (existing && vote.multipleChoice) {
      const specificVote = await this.voteRecordsRepository.findOne({
        where: { voteId, userId, optionId },
      });
      if (specificVote)
        throw new BadRequestException('Already voted for this option');
    }

    const record = this.voteRecordsRepository.create({
      voteId,
      optionId,
      userId,
    });
    await this.voteRecordsRepository.save(record);

    // Increment count
    await this.voteOptionsRepository.increment({ id: optionId }, 'count', 1);

    return { success: true };
  }

  async close(id: string, userId: string) {
    const vote = await this.votesRepository.findOne({
      where: { id },
      relations: ['options']
    });
    if (!vote) throw new BadRequestException('Vote not found');
    if (vote.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can close this vote');
    }
    
    vote.status = VoteStatus.CLOSED;
    const savedVote = await this.votesRepository.save(vote);

    // If it's a scrim vote, check if we have enough people (docs/vote/PROCESS.md:52-57)
    if (vote.scrimType === 'NORMAL') {
      const attendOption = vote.options.find(opt => opt.label === '참석');
      if (attendOption && attendOption.count >= 10) {
        // Create Scrim
        const scrim = await this.scrimsService.create({
          clanId: vote.clanId,
          title: `[내전] ${vote.title}`,
          scheduledDate: vote.deadline.toISOString(), // Use vote deadline as scheduled time
          recruitmentType: RecruitmentType.VOTE,
          voteId: vote.id,
        }, vote.creatorId);

        // Add participants from vote records
        const records = await this.voteRecordsRepository.find({
          where: { voteId: vote.id, optionId: attendOption.id }
        });

        for (const record of records) {
          await this.scrimsService.addParticipant(
            scrim.id, 
            record.userId, 
            ParticipantSource.VOTE
          );
        }
        
        return {
          ...savedVote,
          generatedScrimId: scrim.id
        };
      }
    }

    return savedVote;
  }

  async remove(id: string, userId: string) {
    const vote = await this.votesRepository.findOne({ where: { id } });
    if (!vote) throw new BadRequestException('Vote not found');
    if (vote.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can delete this vote');
    }
    return this.votesRepository.remove(vote);
  }

  async update(id: string, updateData: Partial<Vote>) {
    await this.votesRepository.update(id, updateData);
    return this.findOne(id);
  }
}
