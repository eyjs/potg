import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OverwatchController } from './overwatch.controller';
import { OverwatchService } from './overwatch.service';
import { OverwatchApiService } from './overwatch-api.service';
import {
  OverwatchProfile,
  OverwatchStatsSnapshot,
} from './entities/overwatch-profile.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OverwatchProfile, OverwatchStatsSnapshot, User]),
  ],
  controllers: [OverwatchController],
  providers: [OverwatchService, OverwatchApiService],
  exports: [OverwatchService, OverwatchApiService],
})
export class OverwatchModule {}
