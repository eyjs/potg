import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizGateway } from './quiz.gateway';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'dev_secret_key',
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => ProfilesModule),
  ],
  controllers: [GamesController, QuizController],
  providers: [GamesService, QuizService, QuizGateway],
  exports: [GamesService, QuizService],
})
export class GamesModule {}
