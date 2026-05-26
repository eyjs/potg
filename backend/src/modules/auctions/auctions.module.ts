import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionGateway } from './auction.gateway';
import { Auction } from './entities/auction.entity';
import { AuctionParticipant } from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { AuctionsBiddingService } from './services/auctions-bidding.service';
import { AuctionsRoomStateService } from './services/auctions-room-state.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, AuctionParticipant, AuctionBid]),
  ],
  controllers: [AuctionsController],
  providers: [
    AuctionsService,
    AuctionsBiddingService,
    AuctionsRoomStateService,
    AuctionGateway,
  ],
  exports: [AuctionsService],
})
export class AuctionsModule {}
