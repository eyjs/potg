import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { PointTx } from '../ledger/entities/point-tx.entity';
import { SystemConfigModule } from '../system-config/system-config.module';
import { BettingModule } from '../betting/betting.module';
import { BettingMarket } from '../betting/entities/betting-market.entity';
import { Match } from '../matches/entities/match.entity';
import { Team } from '../matches/entities/team.entity';
import { ShopModule } from '../shop/shop.module';
import { ShopProduct } from '../shop/entities/shop-product.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { CommandRegistry } from './command-registry';
import { DiscordClientService } from './discord-client.service';
import { DiscordMemberService } from './discord-member.service';
import { SLASH_COMMAND_TOKEN } from './interfaces/slash-command.interface';
import { BalanceCommand } from './commands/balance.command';
import { AttendanceCommand } from './commands/attendance.command';
import { LeaderboardCommand } from './commands/leaderboard.command';
import { BetCommand } from './commands/bet.command';
import { RankPredictCommand } from './commands/rank-predict.command';
import { ShopCommand } from './commands/shop.command';
import { BuyCommand } from './commands/buy.command';

const COMMAND_PROVIDERS = [
  BalanceCommand,
  AttendanceCommand,
  LeaderboardCommand,
  BetCommand,
  RankPredictCommand,
  ShopCommand,
  BuyCommand,
];

/** 멀티 프로바이더 토큰 (배열로 주입). */
const commandAggregateProvider: Provider = {
  provide: SLASH_COMMAND_TOKEN,
  useFactory: (...commands: unknown[]) => commands,
  inject: COMMAND_PROVIDERS,
};

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      PointTx,
      BettingMarket,
      Match,
      Team,
      ShopProduct,
      AttendanceRecord,
    ]),
    LedgerModule,
    SystemConfigModule,
    BettingModule,
    ShopModule,
  ],
  providers: [
    CommandRegistry,
    DiscordMemberService,
    DiscordClientService,
    ...COMMAND_PROVIDERS,
    commandAggregateProvider,
  ],
  exports: [DiscordMemberService],
})
export class DiscordBotModule {}
