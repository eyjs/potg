import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { MatchService } from './match.service';
import { BettingModule } from '../betting/betting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Team, TeamMember]),
    forwardRef(() => BettingModule),
  ],
  providers: [MatchService],
  exports: [MatchService, TypeOrmModule],
})
export class MatchesModule {}
