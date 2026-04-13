import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrimResultsController } from './scrim-results.controller';
import { ScrimResultsService } from './scrim-results.service';
import { ScrimResult } from './entities/scrim-result.entity';
import { ScrimResultEntry } from './entities/scrim-result-entry.entity';
import { Auction } from '../auctions/entities/auction.entity';
import { AuctionParticipant } from '../auctions/entities/auction-participant.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScrimResult,
      ScrimResultEntry,
      Auction,
      AuctionParticipant,
      ClanMember,
    ]),
    WalletModule,
  ],
  controllers: [ScrimResultsController],
  providers: [ScrimResultsService],
  exports: [ScrimResultsService],
})
export class ScrimResultsModule {}
