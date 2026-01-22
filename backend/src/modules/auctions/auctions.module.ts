import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionGateway } from './auction.gateway';
import { Auction } from './entities/auction.entity';
import { AuctionParticipant } from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { Scrim } from '../scrims/entities/scrim.entity';
import { ScrimParticipant } from '../scrims/entities/scrim-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Auction,
      AuctionParticipant,
      AuctionBid,
      Scrim,
      ScrimParticipant,
    ]),
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionGateway],
  exports: [AuctionsService],
})
export class AuctionsModule {}
