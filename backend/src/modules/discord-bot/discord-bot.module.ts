import { Module, Provider, forwardRef } from '@nestjs/common';
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
import { MarketGateModule } from '../../common/services/market-gate.module';
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
import { AdminBettingStartCommand } from './commands/admin-betting-start.command';
import { AdminBettingLockCommand } from './commands/admin-betting-lock.command';
import { AdminBettingSettleCommand } from './commands/admin-betting-settle.command';
import { AdminPointsCommand } from './commands/admin-points.command';
import { HelpCommand } from './commands/help.command';
import { BettingNotifyService } from './notifications/betting-notify.service';
import { AttendanceRewardService } from './attendance-reward.service';
import { VoiceAttendanceService } from './voice-attendance.service';
import { TransferCommand } from './commands/transfer.command';
import { OpenMarketsCommand } from './commands/open-markets.command';
import { TeamSplitCommand } from './commands/team-split.command';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';

const COMMAND_PROVIDERS = [
  BalanceCommand,
  AttendanceCommand,
  LeaderboardCommand,
  BetCommand,
  RankPredictCommand,
  ShopCommand,
  BuyCommand,
  // P2P / 조회
  TransferCommand,
  OpenMarketsCommand,
  TeamSplitCommand,
  // Admin
  AdminBettingStartCommand,
  AdminBettingLockCommand,
  AdminBettingSettleCommand,
  AdminPointsCommand,
  HelpCommand,
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
    ]),
    LedgerModule,
    SystemConfigModule,
    BettingModule,
    ShopModule,
    MarketGateModule,
    UsersModule,
    forwardRef(() => MatchesModule),
  ],
  providers: [
    CommandRegistry,
    DiscordMemberService,
    DiscordClientService,
    BettingNotifyService,
    AttendanceRewardService,
    VoiceAttendanceService,
    ...COMMAND_PROVIDERS,
    commandAggregateProvider,
  ],
  exports: [DiscordMemberService, DiscordClientService, BettingNotifyService],
})
export class DiscordBotModule {}
