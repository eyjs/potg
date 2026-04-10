import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BlindDateListing,
  ListingStatus,
} from './entities/blind-date-listing.entity';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';

interface FindAllOptions {
  clanId: string;
  status?: string;
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  location?: string;
  mbti?: string;
  smoking?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class BlindDateService {
  constructor(
    @InjectRepository(BlindDateListing)
    private listingsRepository: Repository<BlindDateListing>,
  ) {}

  async createListing(
    dto: CreateListingDto,
    userId: string,
  ): Promise<BlindDateListing> {
    const listing = this.listingsRepository.create({
      ...dto,
      registerId: userId,
      status: ListingStatus.OPEN,
    });
    return this.listingsRepository.save(listing);
  }

  async findAll(
    options: FindAllOptions,
  ): Promise<{ data: BlindDateListing[]; total: number; page: number; limit: number }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 20;

    const qb = this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.register', 'register')
      .where('listing.clanId = :clanId', { clanId: options.clanId });

    if (options.status) {
      qb.andWhere('listing.status = :status', { status: options.status });
    }

    if (options.gender) {
      qb.andWhere('listing.gender = :gender', { gender: options.gender });
    }

    if (options.ageMin) {
      qb.andWhere('listing.age >= :ageMin', { ageMin: options.ageMin });
    }

    if (options.ageMax) {
      qb.andWhere('listing.age <= :ageMax', { ageMax: options.ageMax });
    }

    if (options.location) {
      qb.andWhere('listing.location ILIKE :location', {
        location: `%${options.location}%`,
      });
    }

    if (options.mbti) {
      qb.andWhere('UPPER(listing.mbti) = :mbti', {
        mbti: options.mbti.toUpperCase(),
      });
    }

    if (options.smoking !== undefined && options.smoking !== '') {
      qb.andWhere('listing.smoking = :smoking', {
        smoking: options.smoking === 'true',
      });
    }

    qb.orderBy('listing.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<BlindDateListing> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['register'],
    });
    if (!listing) {
      throw new NotFoundException('매물을 찾을 수 없습니다.');
    }
    return listing;
  }

  async updateListing(
    id: string,
    dto: UpdateListingDto,
    userId: string,
  ): Promise<BlindDateListing> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('매물을 찾을 수 없습니다.');
    }

    if (listing.registerId !== userId) {
      throw new ForbiddenException('등록자만 수정할 수 있습니다.');
    }

    if (listing.status === ListingStatus.CLOSED) {
      throw new BadRequestException('마감된 매물은 수정할 수 없습니다.');
    }

    Object.assign(listing, dto);
    return this.listingsRepository.save(listing);
  }

  async closeListing(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<BlindDateListing> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('매물을 찾을 수 없습니다.');
    }

    const isOwner = listing.registerId === userId;
    const isAdminOrManager =
      userRole === 'ADMIN' || userRole === 'MASTER' || userRole === 'MANAGER';

    if (!isOwner && !isAdminOrManager) {
      throw new ForbiddenException('등록자 또는 관리자만 마감할 수 있습니다.');
    }

    if (listing.status === ListingStatus.CLOSED) {
      throw new BadRequestException('이미 마감된 매물입니다.');
    }

    listing.status = ListingStatus.CLOSED;
    return this.listingsRepository.save(listing);
  }

  async deleteListing(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const listing = await this.listingsRepository.findOne({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('매물을 찾을 수 없습니다.');
    }

    const isOwner = listing.registerId === userId;
    const isAdminOrManager =
      userRole === 'ADMIN' || userRole === 'MASTER' || userRole === 'MANAGER';

    if (!isOwner && !isAdminOrManager) {
      throw new ForbiddenException('등록자 또는 관리자만 삭제할 수 있습니다.');
    }

    await this.listingsRepository.remove(listing);
  }
}
