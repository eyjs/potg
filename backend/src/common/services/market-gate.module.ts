import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { AttendanceRecord } from '../../modules/attendance/entities/attendance-record.entity';
import { SystemConfigModule } from '../../modules/system-config/system-config.module';
import { MarketGateService } from './market-gate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AttendanceRecord]),
    SystemConfigModule,
  ],
  providers: [MarketGateService],
  exports: [MarketGateService],
})
export class MarketGateModule {}
