import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from './entities/auction.entity';
import { AuctionParticipant } from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, AuctionParticipant, AuctionBid])],
  controllers: [],
  providers: [],
})
export class AuctionsModule {}
