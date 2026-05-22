import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BettingService } from './betting.service';
import { BettingController } from './betting.controller';
import { BettingMarket } from './entities/betting-market.entity';
import { BettingStake } from './entities/betting-stake.entity';
import { Match } from '../matches/entities/match.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { MatchesModule } from '../matches/matches.module';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([BettingMarket, BettingStake, Match]),
    LedgerModule,
    forwardRef(() => MatchesModule),
  ],
  controllers: [BettingController],
  providers: [BettingService, RolesGuard],
  exports: [BettingService],
})
export class BettingModule {}
