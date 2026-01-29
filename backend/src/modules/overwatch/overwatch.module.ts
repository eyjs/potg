import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OverwatchController } from './overwatch.controller';
import { OverwatchService } from './overwatch.service';
import { OverwatchApiService } from './overwatch-api.service';
import { ReplayController } from './replay.controller';
import { ReplayService } from './replay.service';
import {
  OverwatchProfile,
  OverwatchStatsSnapshot,
} from './entities/overwatch-profile.entity';
import { Replay } from './entities/replay.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OverwatchProfile,
      OverwatchStatsSnapshot,
      Replay,
      User,
    ]),
  ],
  controllers: [OverwatchController, ReplayController],
  providers: [OverwatchService, OverwatchApiService, ReplayService],
  exports: [OverwatchService, OverwatchApiService, ReplayService],
})
export class OverwatchModule {}
