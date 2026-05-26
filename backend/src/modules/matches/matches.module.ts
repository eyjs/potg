import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { BettingModule } from '../betting/betting.module';
import { DiscordBotModule } from '../discord-bot/discord-bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Team, TeamMember]),
    forwardRef(() => BettingModule),
    forwardRef(() => DiscordBotModule),
  ],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService, TypeOrmModule],
})
export class MatchesModule {}
