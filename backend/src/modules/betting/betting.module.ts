import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BettingService } from './betting.service';
import { BettingController } from './betting.controller';
import { BettingQuestion } from './entities/betting-question.entity';
import { BettingTicket } from './entities/betting-ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BettingQuestion, BettingTicket])],
  controllers: [BettingController],
  providers: [BettingService],
  exports: [BettingService],
})
export class BettingModule {}
