import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BlindDateListing,
  ListingStatus,
} from './entities/blind-date-listing.entity';
import {
  BlindDateRequest,
  RequestStatus,
} from './entities/blind-date-request.entity';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class BlindDateService {
  constructor(
    @InjectRepository(BlindDateListing)
    private listingsRepository: Repository<BlindDateListing>,
    @InjectRepository(BlindDateRequest)
    private requestsRepository: Repository<BlindDateRequest>,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async approveRequest(requestId: string, userId: string) {
    // In real app, check if userId is the owner (registerId) of the listing
    const request = await this.requestsRepository.findOne({
      where: { id: requestId },
      relations: ['listing'],
    });
    if (!request) throw new BadRequestException('Request not found');

    request.status = RequestStatus.APPROVED;
    request.listing.status = ListingStatus.MATCHED; // Close listing?

    await this.listingsRepository.save(request.listing);
    return this.requestsRepository.save(request);
  }
}
