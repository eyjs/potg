import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  BlindDateListing,
  ListingStatus,
} from './entities/blind-date-listing.entity';
import {
  BlindDateRequest,
  RequestStatus,
} from './entities/blind-date-request.entity';
import { BlindDateMatch } from './entities/blind-date-match.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class BlindDateService {
  constructor(
    @InjectRepository(BlindDateListing)
    private listingsRepository: Repository<BlindDateListing>,
    @InjectRepository(BlindDateRequest)
    private requestsRepository: Repository<BlindDateRequest>,
    @InjectRepository(BlindDateMatch)
    private matchesRepository: Repository<BlindDateMatch>,
    private dataSource: DataSource,
  ) {}

  async createListing(dto: CreateListingDto, userId: string) {
    const listing = this.listingsRepository.create({
      ...dto,
      registerId: userId,
    });
    return this.listingsRepository.save(listing);
  }

  async findAll(clanId: string) {
    return this.listingsRepository.find({
      where: { clanId, status: ListingStatus.OPEN },
    });
  }

  async requestDate(listingId: string, userId: string, message?: string) {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });
    if (!listing) throw new BadRequestException('Listing not found');
    if (listing.status !== ListingStatus.OPEN)
      throw new BadRequestException('Not available');

    const existing = await this.requestsRepository.findOne({
      where: { listingId, requesterId: userId },
    });
    if (existing) throw new BadRequestException('Already requested');

    const request = this.requestsRepository.create({
      listingId,
      requesterId: userId,
      message,
    });
    return this.requestsRepository.save(request);
  }

  async approveRequest(requestId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Get request with listing
      const request = await manager.findOne(BlindDateRequest, {
        where: { id: requestId },
        relations: ['listing'],
      });
      if (!request) throw new BadRequestException('Request not found');

      const listing = request.listing;

      // Check ownership
      if (listing.registerId !== userId)
        throw new BadRequestException('Not authorized');

      // Check status
      if (listing.status !== ListingStatus.OPEN)
        throw new BadRequestException('Listing is not open');
      if (request.status !== RequestStatus.PENDING)
        throw new BadRequestException('Request already processed');

      // Calculate points (docs/blind-date/PROCESS.md:444-478)
      const pointsAwarded = this.calculateBlindDatePoints(listing);

      // Update request status
      request.status = RequestStatus.APPROVED;
      await manager.save(request);

      // Update listing status
      listing.status = ListingStatus.MATCHED;
      listing.matchedRequestId = requestId;
      listing.pointsEarned = pointsAwarded;
      await manager.save(listing);

      // Create match record
      const match = manager.create(BlindDateMatch, {
        listingId: listing.id,
        requestId: request.id,
        clanId: listing.clanId,
        registerId: listing.registerId,
        requesterId: request.requesterId,
        pointsAwarded,
      });
      await manager.save(match);

      // Award points to register
      const clanMember = await manager.findOne(ClanMember, {
        where: { userId: listing.registerId, clanId: listing.clanId },
      });
      if (clanMember) {
        clanMember.totalPoints += pointsAwarded;
        await manager.save(clanMember);

        // Create point log
        const log = manager.create(PointLog, {
          userId: listing.registerId,
          clanId: listing.clanId,
          amount: pointsAwarded,
          reason: `BLIND_DATE_MATCH:${listing.id}`,
        });
        await manager.save(log);
      }

      // Reject all other pending requests
      await manager.update(
        BlindDateRequest,
        {
          listingId: listing.id,
          status: RequestStatus.PENDING,
        },
        { status: RequestStatus.REJECTED },
      );

      return request;
    });
  }

  private calculateBlindDatePoints(listing: BlindDateListing): number {
    let basePoints = 500;

    // Age bonus
    if (listing.age >= 35) {
      basePoints += 200;
    }

    // TODO: Gender demand check (requires clan statistics)
    // const genderDemand = await this.getGenderDemand(listing.clanId, listing.gender);
    // if (genderDemand === 'HIGH') basePoints += 300;

    // Education bonus
    if (
      typeof listing.education === 'string' &&
      (listing.education.includes('대졸') ||
        listing.education.includes('대학원'))
    ) {
      basePoints += 100;
    }

    // Job bonus
    if (
      typeof listing.job === 'string' &&
      (listing.job.includes('전문직') || listing.job.includes('공무원'))
    ) {
      basePoints += 100;
    }

    // Photo count bonus
    const photoCount = listing.photos?.length || 0;
    if (photoCount >= 3) {
      basePoints += 50;
    }

    return basePoints;
  }

  async rejectRequest(requestId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(BlindDateRequest, {
        where: { id: requestId },
        relations: ['listing'],
      });
      if (!request) throw new BadRequestException('Request not found');

      const listing = request.listing;

      // Check ownership
      if (listing.registerId !== userId)
        throw new BadRequestException('Not authorized');

      // Check status
      if (request.status !== RequestStatus.PENDING)
        throw new BadRequestException('Request already processed');

      // Update request status
      request.status = RequestStatus.REJECTED;
      await manager.save(request);

      return request;
    });
  }
}
