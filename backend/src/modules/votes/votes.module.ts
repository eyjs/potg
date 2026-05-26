import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { Vote } from './entities/vote.entity';
import { VoteOption } from './entities/vote-option.entity';
import { VoteRecord } from './entities/vote-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, VoteOption, VoteRecord])],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
