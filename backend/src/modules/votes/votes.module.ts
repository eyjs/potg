import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { Vote } from './entities/vote.entity';
import { VoteOption } from './entities/vote-option.entity';
import { VoteRecord } from './entities/vote-record.entity';
import { ScrimsModule } from '../scrims/scrims.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vote, VoteOption, VoteRecord]),
    ScrimsModule,
  ],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
