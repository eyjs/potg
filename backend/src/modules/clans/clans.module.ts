import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClansService } from './clans.service';
import { ClansController } from './clans.controller';
import { Clan } from './entities/clan.entity';
import { ClanMember } from './entities/clan-member.entity';
import { ClanJoinRequest } from './entities/clan-join-request.entity';
import { Announcement } from './entities/announcement.entity';
import { HallOfFame } from './entities/hall-of-fame.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clan,
      ClanMember,
      ClanJoinRequest,
      Announcement,
      HallOfFame,
    ]),
  ],
  controllers: [ClansController],
  providers: [ClansService],
  exports: [ClansService],
})
export class ClansModule {}
