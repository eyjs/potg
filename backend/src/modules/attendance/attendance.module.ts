import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceUploadController } from './attendance-upload.controller';
import { PointRule } from './entities/point-rule.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointRule, AttendanceRecord, ClanMember, User]),
  ],
  controllers: [AttendanceController, AttendanceUploadController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
