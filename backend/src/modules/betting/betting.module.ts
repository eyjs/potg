import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BettingService } from './betting.service';
import { BettingController } from './betting.controller';
import { BettingQuestion } from './entities/betting-question.entity';
import { BettingTicket } from './entities/betting-ticket.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BettingQuestion,
      BettingTicket,
      ClanMember,
      PointLog,
    ]),
  ],
  controllers: [BettingController],
  providers: [BettingService, RolesGuard, ClanRolesGuard],
  exports: [BettingService],
})
export class BettingModule {}
