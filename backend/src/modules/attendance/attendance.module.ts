import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PointRule } from './entities/point-rule.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PointRule,
      AttendanceRecord,
      ClanMember,
      PointLog,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
