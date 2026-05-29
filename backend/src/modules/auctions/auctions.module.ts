import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionGateway } from './auction.gateway';
import { Auction } from './entities/auction.entity';
import { AuctionParticipant } from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { AuctionsBiddingService } from './services/auctions-bidding.service';
import { AuctionsRoomStateService } from './services/auctions-room-state.service';
import { AuthModule } from '../auth/auth.module';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, AuctionParticipant, AuctionBid]),
    ConfigModule,
    AuthModule, // JwtModule(JwtService) 재사용 — 소켓 인증
  ],
  controllers: [AuctionsController],
  providers: [
    AuctionsService,
    AuctionsBiddingService,
    AuctionsRoomStateService,
    AuctionGateway,
    WsJwtGuard,
  ],
  exports: [AuctionsService],
})
export class AuctionsModule {}
