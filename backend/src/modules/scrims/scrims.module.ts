import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrimsService } from './scrims.service';
import { ScrimsController } from './scrims.controller';
import { Scrim } from './entities/scrim.entity';
import { ScrimParticipant } from './entities/scrim-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Scrim, ScrimParticipant])],
  controllers: [ScrimsController],
  providers: [ScrimsService],
  exports: [ScrimsService],
})
export class ScrimsModule {}
