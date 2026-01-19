import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote, VoteStatus } from './entities/vote.entity';
import { VoteOption } from './entities/vote-option.entity';
import { VoteRecord } from './entities/vote-record.entity';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private votesRepository: Repository<Vote>,
    @InjectRepository(VoteOption)
    private voteOptionsRepository: Repository<VoteOption>,
    @InjectRepository(VoteRecord)
    private voteRecordsRepository: Repository<VoteRecord>,
  ) {}

  async create(createVoteDto: any, userId: string) {
    const { options, ...voteData } = createVoteDto;
    const vote = this.votesRepository.create({
      ...voteData,
      creatorId: userId,
    }) as unknown as Vote;

    // Create options
    if (options && options.length > 0) {
      vote.options = options.map((label: string) =>
        this.voteOptionsRepository.create({ label }),
      );
    }

    return this.votesRepository.save(vote);
  }

  async findAll(clanId: string) {
    return this.votesRepository.find({
      where: { clanId },
      relations: ['options'],
    });
  }

  async findOne(id: string) {
    return this.votesRepository.findOne({
      where: { id },
      relations: ['options'],
    });
  }

  async castVote(voteId: string, optionId: string, userId: string) {
    const vote = await this.findOne(voteId);
    if (!vote) throw new BadRequestException('Vote not found');
    if (vote.status !== VoteStatus.OPEN)
      throw new BadRequestException('Vote is closed');

    // Check if already voted (if not multiple choice)
    const existing = await this.voteRecordsRepository.findOne({
      where: { voteId, userId },
    });
    if (existing && !vote.multipleChoice) {
      throw new BadRequestException('Already voted');
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
}
