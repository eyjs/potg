import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Auction } from './entities/auction.entity';
import {
  AuctionParticipant,
  AuctionRole,
} from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { CreateAuctionDto } from './dto/create-auction.dto';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionsRepository: Repository<Auction>,
    @InjectRepository(AuctionParticipant)
    private participantsRepository: Repository<AuctionParticipant>,
    @InjectRepository(AuctionBid)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private bidsRepository: Repository<AuctionBid>,
    private dataSource: DataSource,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, userId: string) {
    const auction = this.auctionsRepository.create({
      ...createAuctionDto,
      creatorId: userId,
    });
    return this.auctionsRepository.save(auction);
  }

  async findAll() {
    return this.auctionsRepository.find({ relations: ['participants'] });
  }

  async findOne(id: string) {
    return this.auctionsRepository.findOne({
      where: { id },
      relations: ['participants', 'bids'],
    });
  }

  async join(auctionId: string, userId: string, role: AuctionRole) {
    const auction = await this.findOne(auctionId);
    if (!auction) throw new BadRequestException('Auction not found');

    const existing = await this.participantsRepository.findOne({
      where: { auctionId, userId },
    });
    if (existing) throw new BadRequestException('Already joined');

    const participant = this.participantsRepository.create({
      auctionId,
      userId,
      role,
      currentPoints: role === AuctionRole.CAPTAIN ? auction.startingPoints : 0,
    });
    return this.participantsRepository.save(participant);
  }

  async placeBid(
    auctionId: string,
    bidderId: string,
    targetPlayerId: string,
    amount: number,
  ) {
    // Transactional logic for bidding
    return this.dataSource.transaction(async (manager) => {
      const participant = await manager.findOne(AuctionParticipant, {
        where: { auctionId, userId: bidderId },
      });
      if (!participant || participant.role !== AuctionRole.CAPTAIN) {
        throw new BadRequestException('Only captains can bid');
      }
      if (participant.currentPoints < amount) {
        throw new BadRequestException('Not enough points');
      }

      // Check if higher bid exists for this target in this turn? (Simplified for now)

      const bid = manager.create(AuctionBid, {
        auctionId,
        bidderId,
        targetPlayerId,
        amount,
      });

      await manager.save(bid);

      // Deduct points (Temporary deduction or hold logic needed in real app)
      participant.currentPoints -= amount;
      await manager.save(participant);

      return bid;
    });
  }
}
