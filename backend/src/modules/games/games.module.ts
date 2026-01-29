import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';
import { GameScore } from './entities/game-score.entity';
import { GameRoom } from './entities/game-room.entity';
import { GameRoomPlayer } from './entities/game-room-player.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizMatch } from './entities/quiz-match.entity';
import { WordChainDict } from './entities/word-chain-dict.entity';
import { LiarTopic } from './entities/liar-topic.entity';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      GameScore,
      GameRoom,
      GameRoomPlayer,
      QuizQuestion,
      QuizMatch,
      WordChainDict,
      LiarTopic,
      ClanMember,
    ]),
    forwardRef(() => ProfilesModule),
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
