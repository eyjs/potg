import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BettingQuestion } from './entities/betting-question.entity';
import { BettingTicket } from './entities/betting-ticket.entity';
import {
  BettingStatus,
  BettingAnswer,
  TicketStatus,
} from './enums/betting.enum';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';
import { CreateQuestionDto, PlaceBetDto } from './dto/betting.dto';

@Injectable()
export class BettingService {
  constructor(
    @InjectRepository(BettingQuestion)
    private questionsRepository: Repository<BettingQuestion>,
    @InjectRepository(BettingTicket)
    private ticketsRepository: Repository<BettingTicket>,
    private dataSource: DataSource,
  ) {}

  async createQuestion(
    createDto: CreateQuestionDto,
    creatorId: string,
  ): Promise<BettingQuestion> {
    const question = this.questionsRepository.create({
      ...createDto,
      creatorId,
    });
    return this.questionsRepository.save(question);
  }

  async placeBet(
    questionId: string,
    userId: string,
    betDto: PlaceBetDto,
  ): Promise<BettingTicket> {
    return this.dataSource.transaction(async (manager) => {
      const question = await manager.findOne(BettingQuestion, {
        where: { id: questionId },
      });
      if (!question) throw new BadRequestException('Question not found');
      if (question.status !== BettingStatus.OPEN)
        throw new BadRequestException('Betting closed');
      if (betDto.amount < question.minBetAmount)
        throw new BadRequestException(
          `Minimum bet is ${question.minBetAmount}`,
        );

      // Check for existing ticket (docs/betting/PROCESS.md:40-46)
      const existingTicket = await manager.findOne(BettingTicket, {
        where: { questionId, userId },
      });

      // Check user points
      const clanMember = await manager.findOne(ClanMember, {
        where: { userId, clanId: betDto.clanId },
      });
      if (!clanMember)
        throw new BadRequestException('User not in clan or wallet not found');

      if (existingTicket) {
        // Update existing bet (modification)
        const pointDifference = betDto.amount - existingTicket.betAmount;

        if (pointDifference > 0) {
          // Need more points
          if (clanMember.totalPoints < pointDifference)
            throw new BadRequestException('Insufficient points');
          clanMember.totalPoints -= pointDifference;
          clanMember.lockedPoints += pointDifference;
        } else if (pointDifference < 0) {
          // Refund difference
          clanMember.totalPoints += Math.abs(pointDifference);
          clanMember.lockedPoints -= Math.abs(pointDifference);
        }

        await manager.save(clanMember);

        existingTicket.prediction = betDto.prediction;
        existingTicket.betAmount = betDto.amount;
        return manager.save(existingTicket);
      } else {
        // New bet
        if (clanMember.totalPoints < betDto.amount)
          throw new BadRequestException('Insufficient points');

        // Deduct (Lock) points
        clanMember.totalPoints -= betDto.amount;
        clanMember.lockedPoints += betDto.amount;
        await manager.save(clanMember);

        const ticket = manager.create(BettingTicket, {
          questionId,
          userId,
          clanId: betDto.clanId,
          prediction: betDto.prediction,
          betAmount: betDto.amount,
        });

        return manager.save(ticket);
      }
    });
  }

  async settleQuestion(
    questionId: string,
    result: BettingAnswer,
  ): Promise<{ updatedCount: number }> {
    return this.dataSource.transaction(async (manager) => {
      const question = await manager.findOne(BettingQuestion, {
        where: { id: questionId },
        relations: ['tickets'],
      });
      if (!question) throw new BadRequestException('Question not found');
      if (question.status === BettingStatus.SETTLED)
        throw new BadRequestException('Already settled');

      question.status = BettingStatus.SETTLED;
      question.correctAnswer = result;
      await manager.save(question);

      let updatedCount = 0;

      for (const ticket of question.tickets) {
        const clanMember = await manager.findOne(ClanMember, {
          where: { userId: ticket.userId, clanId: ticket.clanId },
        });

        if (ticket.prediction === result) {
          ticket.status = TicketStatus.WON;
          if (clanMember) {
            // CONVENTIONS.md 4.4: Use Math.ceil for user benefit
            const reward = Math.ceil(
              ticket.betAmount * question.rewardMultiplier,
            );
            // Return reward (which includes original bet) and unlock points
            clanMember.lockedPoints -= ticket.betAmount;
            clanMember.totalPoints += reward;
            await manager.save(clanMember);

            const log = manager.create(PointLog, {
              userId: ticket.userId,
              clanId: ticket.clanId,
              amount: reward,
              reason: `BET_WIN:${question.id}`,
            });
            await manager.save(log);
          }
        } else {
          ticket.status = TicketStatus.LOST;
          if (clanMember) {
            // Just unlock (subtract from locked, total already deducted at bet time)
            clanMember.lockedPoints -= ticket.betAmount;
            await manager.save(clanMember);
          }
        }
        await manager.save(ticket);
        updatedCount++;
      }
      return { updatedCount };
    });
  }
}
