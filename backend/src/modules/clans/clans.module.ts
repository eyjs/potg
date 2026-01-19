import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClansService } from './clans.service';
import { ClansController } from './clans.controller';
import { Clan } from './entities/clan.entity';
import { ClanMember } from './entities/clan-member.entity';
import { PointLog } from './entities/point-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Clan, ClanMember, PointLog])],
  controllers: [ClansController],
  providers: [ClansService],
  exports: [ClansService],
})
export class ClansModule {}
