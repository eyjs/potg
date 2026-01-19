import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { Auction } from './entities/auction.entity';
import { AuctionParticipant } from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, AuctionParticipant, AuctionBid]),
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService],
})
export class AuctionsModule {}
