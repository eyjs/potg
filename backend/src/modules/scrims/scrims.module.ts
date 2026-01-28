import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrimsService } from './scrims.service';
import { ScrimsController } from './scrims.controller';
import { Scrim } from './entities/scrim.entity';
import { ScrimParticipant } from './entities/scrim-participant.entity';
import { ScrimMatch } from './entities/scrim-match.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Scrim,
      ScrimParticipant,
      ScrimMatch,
      ClanMember,
      PointLog,
    ]),
    forwardRef(() => AttendanceModule),
  ],
  controllers: [ScrimsController],
  providers: [ScrimsService],
  exports: [ScrimsService],
})
export class ScrimsModule {}
