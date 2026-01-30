import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuizService } from './quiz.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  CreateMatchDto,
} from './dto/quiz.dto';
import { QuizCategory, QuizDifficulty } from './entities/quiz-question.entity';
import { QuizMatchStatus } from './entities/quiz-match.entity';
import { ClanRolesGuard } from '../../common/guards/clan-roles.guard';
import { ClanRoles } from '../../common/decorators/clan-roles.decorator';
import { ClanRole } from '../clans/entities/clan-member.entity';

interface AuthRequest {
  user: {
    userId: string;
    memberId?: string;
    clanId?: string;
  };
}

@Controller('quiz')
@UseGuards(AuthGuard('jwt'))
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // ==================== 문제 관리 (관리자용) ====================

  @Get('questions')
  @UseGuards(ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  async getQuestions(
    @Query('category') category?: QuizCategory,
    @Query('difficulty') difficulty?: QuizDifficulty,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.quizService.getQuestions({
      category,
      difficulty,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      includeInactive: includeInactive === 'true',
    });
  }

  @Post('questions')
  @UseGuards(ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.quizService.createQuestion(dto);
  }

  @Post('questions/bulk')
  @UseGuards(ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  async createQuestionsBulk(@Body() dtos: CreateQuestionDto[]) {
    const results: Awaited<ReturnType<typeof this.quizService.createQuestion>>[] = [];
    for (const dto of dtos) {
      const question = await this.quizService.createQuestion(dto);
      results.push(question);
    }
    return { created: results.length, questions: results };
  }

  @Patch('questions/:id')
  @UseGuards(ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quizService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @UseGuards(ClanRolesGuard)
  @ClanRoles(ClanRole.MASTER, ClanRole.MANAGER)
  async deleteQuestion(@Param('id') id: string) {
    await this.quizService.deleteQuestion(id);
    return { success: true };
  }

  // ==================== 매치 ====================

  @Get('matches')
  async getMyMatches(
    @Req() req: AuthRequest,
    @Query('status') status?: QuizMatchStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const memberId = req.user.memberId;
    if (!memberId) {
      return { matches: [], total: 0 };
    }

    return this.quizService.getMyMatches(memberId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('matches/:id')
  async getMatch(@Param('id') id: string) {
    const match = await this.quizService.getMatch(id);

    return {
      id: match.id,
      clanId: match.clanId,
      status: match.status,
      player1: match.player1
        ? {
            memberId: match.player1.id,
            displayName: match.player1.user?.battleTag || 'Unknown',
            avatarUrl: match.player1.user?.avatarUrl,
          }
        : null,
      player2: match.player2
        ? {
            memberId: match.player2.id,
            displayName: match.player2.user?.battleTag || 'Unknown',
            avatarUrl: match.player2.user?.avatarUrl,
          }
        : null,
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      currentRound: match.currentRound,
      totalRounds: match.totalRounds,
      winnerId: match.winnerId,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      createdAt: match.createdAt,
    };
  }

  @Post('matches')
  async createMatch(@Req() req: AuthRequest, @Body() dto: CreateMatchDto) {
    const memberId = req.user.memberId;
    if (!memberId) {
      throw new Error('클랜 멤버만 퀴즈를 플레이할 수 있습니다.');
    }

    return this.quizService.findOrCreateMatch(
      memberId,
      dto.clanId,
      dto.totalRounds,
    );
  }

  @Post('matches/:id/cancel')
  async cancelMatch(@Req() req: AuthRequest, @Param('id') id: string) {
    const memberId = req.user.memberId;
    if (!memberId) {
      throw new Error('권한이 없습니다.');
    }

    await this.quizService.cancelMatching(memberId);
    return { success: true };
  }

  // ==================== 통계 ====================

  @Get('stats/me')
  async getMyStats(@Req() req: AuthRequest) {
    const memberId = req.user.memberId;
    if (!memberId) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalScore: 0,
      };
    }

    const { matches } = await this.quizService.getMyMatches(memberId, {
      status: QuizMatchStatus.FINISHED,
      limit: 1000,
    });

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalScore = 0;

    for (const match of matches) {
      const myScore =
        match.player1Id === memberId ? match.player1Score : match.player2Score;
      totalScore += myScore;

      if (!match.winnerId) {
        draws++;
      } else if (match.winnerId === memberId) {
        wins++;
      } else {
        losses++;
      }
    }

    const totalMatches = matches.length;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    return {
      totalMatches,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 10) / 10,
      totalScore,
      averageScore: totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0,
    };
  }
}
