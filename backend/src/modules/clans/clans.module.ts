import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClansService } from './clans.service';
import { ClansController } from './clans.controller';
import { Clan } from './entities/clan.entity';
import { ClanMember } from './entities/clan-member.entity';
import { ClanJoinRequest } from './entities/clan-join-request.entity';
import { Announcement } from './entities/announcement.entity';
import { HallOfFame } from './entities/hall-of-fame.entity';
import { PointTx } from '../ledger/entities/point-tx.entity';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';
import { ClanActivityFeedService } from './services/clan-activity-feed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clan,
      ClanMember,
      ClanJoinRequest,
      Announcement,
      HallOfFame,
      PointTx,
    ]),
  ],
  controllers: [ClansController],
  providers: [ClansService, ClanActivityFeedService, ClanRolesGuard],
  exports: [ClansService, TypeOrmModule],
})
export class ClansModule {}
