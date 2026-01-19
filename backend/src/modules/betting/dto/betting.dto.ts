import { BettingAnswer } from '../entities/betting-question.entity';

export class CreateQuestionDto {
  scrimId?: string;
  question: string;
  minBetAmount?: number;
  rewardMultiplier?: number;
  bettingDeadline?: Date;
}

export class PlaceBetDto {
  prediction: BettingAnswer;
  amount: number;
  clanId: string;
}
