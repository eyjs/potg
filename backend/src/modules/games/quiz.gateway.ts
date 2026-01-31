import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { QuizService } from './quiz.service';
import { QuizMatchStatus } from './entities/quiz-match.entity';
import { WsJwtGuard, WsAuthUser } from '../../common/guards/ws-jwt.guard';

interface AuthenticatedSocket extends Socket {
  user?: {
    memberId: string;
    clanId: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}

const ROUND_TIME_LIMIT = 15000; // 15초
const ROUND_INTERVAL = 3000; // 라운드 간 대기 시간 3초
const MATCH_START_DELAY = 3000; // 매칭 후 게임 시작 대기 시간

@WebSocketGateway({
  namespace: '/quiz',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QuizGateway.name);

  // 소켓 ID -> memberId 매핑
  private socketToMember = new Map<string, string>();
  // memberId -> 소켓 ID 매핑
  private memberToSocket = new Map<string, string>();
  // matchId -> 참가자 소켓 Set
  private matchSockets = new Map<string, Set<string>>();
  // Rate limiting: memberId -> 마지막 메시지 시간
  private lastMessageTime = new Map<string, number>();

  constructor(
    private quizService: QuizService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    // 인증은 첫 메시지에서 처리
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const memberId = this.socketToMember.get(client.id);
    this.logger.log(`Client disconnected: ${client.id} (member: ${memberId})`);

    if (memberId) {
      // 매칭 대기 중이었다면 취소
      await this.quizService.cancelMatching(memberId);

      this.socketToMember.delete(client.id);
      this.memberToSocket.delete(memberId);
    }

    // 모든 매치에서 소켓 제거
    this.matchSockets.forEach((sockets, matchId) => {
      sockets.delete(client.id);
    });
  }

  // ==================== 인증 ====================

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string; memberId: string; clanId: string; displayName: string; avatarUrl?: string },
  ) {
    try {
      // JWT 토큰 검증
      this.jwtService.verify(data.token);
    } catch {
      client.emit('auth:error', { message: '인증에 실패했습니다.' });
      return;
    }

    client.user = {
      memberId: data.memberId,
      clanId: data.clanId,
      userId: '',
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
    };

    this.socketToMember.set(client.id, data.memberId);
    this.memberToSocket.set(data.memberId, client.id);

    this.logger.log(`Auth successful: ${data.memberId}`);

    client.emit('auth:success', { memberId: data.memberId });
  }

  // ==================== 매칭 ====================

  @SubscribeMessage('quiz:find-match')
  async handleFindMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { clanId: string; totalRounds?: number },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    try {
      const match = await this.quizService.findOrCreateMatch(
        memberId,
        data.clanId,
        data.totalRounds || 5,
      );

      // 매치 방 조인
      client.join(`match:${match.id}`);

      // 소켓 추적
      if (!this.matchSockets.has(match.id)) {
        this.matchSockets.set(match.id, new Set());
      }
      this.matchSockets.get(match.id)!.add(client.id);

      if (match.player2Id) {
        // 매칭 성공! 양쪽에 알림
        const fullMatch = await this.quizService.getMatch(match.id);

        const player1Socket = this.memberToSocket.get(match.player1Id);
        const player2Socket = this.memberToSocket.get(match.player2Id);

        const matchedData = {
          matchId: match.id,
          totalRounds: match.totalRounds,
        };

        // Player 1에게
        if (player1Socket) {
          this.server.to(player1Socket).emit('quiz:matched', {
            ...matchedData,
            opponent: {
              memberId: fullMatch.player2?.id,
              displayName: fullMatch.player2?.user?.battleTag || 'Unknown',
              avatarUrl: fullMatch.player2?.user?.avatarUrl || null,
            },
          });
        }

        // Player 2에게
        if (player2Socket) {
          this.server.to(player2Socket).emit('quiz:matched', {
            ...matchedData,
            opponent: {
              memberId: fullMatch.player1?.id,
              displayName: fullMatch.player1?.user?.battleTag || 'Unknown',
              avatarUrl: fullMatch.player1?.user?.avatarUrl || null,
            },
          });
        }

        // 매칭 후 게임 시작 대기
        setTimeout(() => this.startMatchGame(match.id), MATCH_START_DELAY);
      } else {
        // 대기 중
        client.emit('quiz:waiting', {
          matchId: match.id,
          message: '상대를 찾는 중입니다...',
        });
      }
    } catch (error) {
      this.logger.error('Find match error:', error);
      client.emit('error', { message: '매칭 중 오류가 발생했습니다.' });
    }
  }

  @SubscribeMessage('quiz:cancel-match')
  async handleCancelMatch(@ConnectedSocket() client: AuthenticatedSocket) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) return;

    await this.quizService.cancelMatching(memberId);
    client.emit('quiz:cancelled', { message: '매칭이 취소되었습니다.' });
  }

  @SubscribeMessage('quiz:join')
  async handleJoinMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    try {
      const match = await this.quizService.getMatch(data.matchId);

      if (match.player1Id !== memberId && match.player2Id !== memberId) {
        client.emit('error', { message: '이 매치의 참가자가 아닙니다.' });
        return;
      }

      client.join(`match:${match.id}`);

      if (!this.matchSockets.has(match.id)) {
        this.matchSockets.set(match.id, new Set());
      }
      this.matchSockets.get(match.id)!.add(client.id);

      client.emit('quiz:joined', {
        matchId: match.id,
        status: match.status,
        currentRound: match.currentRound,
        scores: {
          player1Score: match.player1Score,
          player2Score: match.player2Score,
        },
      });
    } catch (error) {
      client.emit('error', { message: '매치를 찾을 수 없습니다.' });
    }
  }

  // ==================== 게임 진행 ====================

  private async startMatchGame(matchId: string) {
    try {
      const { match, questions } = await this.quizService.startMatch(matchId);

      this.server.to(`match:${matchId}`).emit('quiz:started', {
        matchId,
        totalRounds: match.totalRounds,
        message: '게임이 시작됩니다!',
      });

      // 첫 라운드 시작
      await this.startNextRound(matchId);
    } catch (error) {
      this.logger.error('Start match error:', error);
      this.server.to(`match:${matchId}`).emit('error', {
        message: '게임 시작에 실패했습니다.',
      });
    }
  }

  private async startNextRound(matchId: string) {
    try {
      const result = await this.quizService.startNextRound(matchId);

      if (!result) {
        // 모든 라운드 종료 -> 게임 종료
        await this.finishMatch(matchId);
        return;
      }

      const { question, round } = result;

      // 문제 전송 (정답 제외)
      this.server.to(`match:${matchId}`).emit('quiz:round-start', {
        round,
        question: {
          id: question.id,
          question: question.question,
          options: question.options,
          category: question.category,
          difficulty: question.difficulty,
          imageUrl: question.imageUrl,
        },
        timeLimit: ROUND_TIME_LIMIT,
      });

      // 타임아웃 설정
      const state = this.quizService.getActiveMatchState(matchId);
      if (state) {
        state.roundTimeout = setTimeout(
          () => this.handleRoundTimeout(matchId, round),
          ROUND_TIME_LIMIT,
        );
      }
    } catch (error) {
      this.logger.error('Start next round error:', error);
    }
  }

  @SubscribeMessage('quiz:answer')
  async handleAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; round: number; answerIndex: number; timeMs: number },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    // Rate limiting 체크
    if (!this.checkRateLimit(memberId, 300)) {
      return;
    }

    try {
      const { bothAnswered, result } = await this.quizService.submitAnswer(
        data.matchId,
        memberId,
        data.round,
        data.answerIndex,
        data.timeMs,
      );

      // 내 답변 확인
      client.emit('quiz:answer-received', {
        round: data.round,
        answerIndex: data.answerIndex,
      });

      if (bothAnswered && result) {
        // 타임아웃 클리어
        this.quizService.clearRoundTimeout(data.matchId);

        // 라운드 결과 전송
        await this.sendRoundResult(data.matchId, result);
      }
    } catch (error) {
      this.logger.error('Answer error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  private async handleRoundTimeout(matchId: string, round: number) {
    this.logger.log(`Round ${round} timeout for match ${matchId}`);

    const result = await this.quizService.endRoundByTimeout(matchId, round);
    if (result) {
      await this.sendRoundResult(matchId, result);
    }
  }

  private async sendRoundResult(
    matchId: string,
    result: {
      round: number;
      questionId: string;
      player1Answer: number | null;
      player2Answer: number | null;
      player1Time: number | null;
      player2Time: number | null;
      correctIndex: number;
    },
  ) {
    const match = await this.quizService.getMatch(matchId);

    const calculatePoints = (answer: number | null, time: number | null, correct: number) => {
      if (answer === null || answer !== correct) return 0;
      return 100 + Math.max(0, 50 - Math.floor((time || 0) / 200));
    };

    const p1Points = calculatePoints(result.player1Answer, result.player1Time, result.correctIndex);
    const p2Points = calculatePoints(result.player2Answer, result.player2Time, result.correctIndex);

    this.server.to(`match:${matchId}`).emit('quiz:round-result', {
      round: result.round,
      correctIndex: result.correctIndex,
      player1: {
        answer: result.player1Answer,
        time: result.player1Time,
        correct: result.player1Answer === result.correctIndex,
        pointsGained: p1Points,
      },
      player2: {
        answer: result.player2Answer,
        time: result.player2Time,
        correct: result.player2Answer === result.correctIndex,
        pointsGained: p2Points,
      },
      scores: {
        player1Score: match.player1Score,
        player2Score: match.player2Score,
      },
    });

    // 다음 라운드 (딜레이 후)
    setTimeout(() => this.startNextRound(matchId), ROUND_INTERVAL);
  }

  private async finishMatch(matchId: string) {
    try {
      const match = await this.quizService.finishMatch(matchId);

      const winnerName = match.winnerId
        ? match.winnerId === match.player1Id
          ? match.player1?.user?.battleTag
          : match.player2?.user?.battleTag
        : null;

      this.server.to(`match:${matchId}`).emit('quiz:match-end', {
        winnerId: match.winnerId,
        winnerDisplayName: winnerName || '무승부',
        finalScores: {
          player1Score: match.player1Score,
          player2Score: match.player2Score,
        },
        pointsEarned: match.winnerId ? 30 : 15, // 승리 30, 참가 15
      });

      // 소켓 정리
      this.matchSockets.delete(matchId);
    } catch (error) {
      this.logger.error('Finish match error:', error);
    }
  }

  // ==================== 채팅 ====================

  @SubscribeMessage('quiz:chat')
  async handleChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; message: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) return;

    // Rate limiting 체크
    if (!this.checkRateLimit(memberId, 300)) {
      return;
    }

    const displayName = client.user?.displayName || 'Unknown';

    this.server.to(`match:${data.matchId}`).emit('quiz:chat', {
      memberId,
      displayName,
      message: data.message.slice(0, 200), // 메시지 길이 제한
      timestamp: Date.now(),
    });
  }

  // ==================== 유틸리티 ====================

  /**
   * Rate limiting 체크 - 너무 빠른 메시지 전송 방지
   */
  private checkRateLimit(memberId: string, limitMs = 300): boolean {
    const now = Date.now();
    const lastTime = this.lastMessageTime.get(memberId) || 0;

    if (now - lastTime < limitMs) {
      return false;
    }

    this.lastMessageTime.set(memberId, now);
    return true;
  }
}
