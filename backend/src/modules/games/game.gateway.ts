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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GamesService } from './games.service';
import { WordChainService } from './word-chain.service';
import { LiarService } from './liar.service';
import { CatchMindService } from './catch-mind.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    memberId: string;
    clanId: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}

@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  // 소켓 ID -> memberId 매핑
  private socketToMember = new Map<string, string>();
  // memberId -> 소켓 ID 매핑
  private memberToSocket = new Map<string, string>();
  // roomId -> 참가자 소켓 Set
  private roomSockets = new Map<string, Set<string>>();
  // roomId -> 끝말잇기 타이머
  private wordChainTimers = new Map<string, NodeJS.Timeout>();
  // Rate limiting: memberId -> 마지막 메시지 시간
  private lastMessageTime = new Map<string, number>();

  constructor(
    private gamesService: GamesService,
    private jwtService: JwtService,
    private wordChainService: WordChainService,
    private liarService: LiarService,
    private catchMindService: CatchMindService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const memberId = this.socketToMember.get(client.id);
    this.logger.log(`Client disconnected: ${client.id} (member: ${memberId})`);

    if (memberId) {
      this.socketToMember.delete(client.id);
      this.memberToSocket.delete(memberId);
      this.lastMessageTime.delete(memberId);
    }

    // 모든 방에서 소켓 제거
    this.roomSockets.forEach((sockets) => {
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

  // ==================== 방 입장 ====================

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomCode: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    try {
      const room = await this.gamesService.joinRoom(memberId, data.roomCode);

      // 소켓 room 조인
      client.join(`room:${room.id}`);

      // 소켓 추적
      if (!this.roomSockets.has(room.id)) {
        this.roomSockets.set(room.id, new Set());
      }
      this.roomSockets.get(room.id)!.add(client.id);

      // 입장한 유저 정보
      const joiner = room.players.find((p) => p.memberId === memberId);

      // 방의 다른 사람들에게 알림
      client.to(`room:${room.id}`).emit('room:player-joined', {
        memberId,
        displayName: joiner?.member?.user?.battleTag || client.user?.displayName || 'Unknown',
        avatarUrl: joiner?.member?.user?.avatarUrl || client.user?.avatarUrl || null,
        isHost: joiner?.isHost || false,
      });

      // 본인에게 방 정보 전송
      client.emit('room:joined', {
        roomId: room.id,
        roomCode: room.code,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        settings: room.settings,
        players: room.players.map((p) => ({
          memberId: p.memberId,
          displayName: p.member?.user?.battleTag || 'Unknown',
          avatarUrl: p.member?.user?.avatarUrl || null,
          isHost: p.isHost,
          status: p.status,
        })),
        game: room.game ? {
          code: room.game.code,
          name: room.game.name,
          type: room.game.type,
          minPlayers: room.game.minPlayers,
          maxPlayers: room.game.maxPlayers,
        } : null,
      });
    } catch (error) {
      this.logger.error('Join room error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  // ==================== 재연결 ====================

  @SubscribeMessage('room:reconnect')
  async handleReconnect(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    try {
      const room = await this.gamesService.getRoom(data.roomId);

      if (!room) {
        client.emit('error', { message: '방을 찾을 수 없습니다.' });
        return;
      }

      // 해당 방의 참가자인지 확인
      const isParticipant = room.players.some((p) => p.memberId === memberId);
      if (!isParticipant) {
        client.emit('error', { message: '해당 방의 참가자가 아닙니다.' });
        return;
      }

      // 소켓 room 재조인
      client.join(`room:${room.id}`);

      // 소켓 추적
      if (!this.roomSockets.has(room.id)) {
        this.roomSockets.set(room.id, new Set());
      }
      this.roomSockets.get(room.id)!.add(client.id);

      // 현재 게임 상태 전송
      client.emit('room:reconnected', {
        roomId: room.id,
        roomCode: room.code,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        settings: room.settings,
        status: room.status,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        players: room.players.map((p) => ({
          memberId: p.memberId,
          displayName: p.member?.user?.battleTag || 'Unknown',
          avatarUrl: p.member?.user?.avatarUrl || null,
          isHost: p.isHost,
          status: p.status,
        })),
        game: room.game ? {
          code: room.game.code,
          name: room.game.name,
          type: room.game.type,
          minPlayers: room.game.minPlayers,
          maxPlayers: room.game.maxPlayers,
        } : null,
      });

      this.logger.log(`Reconnected: ${memberId} to room ${room.id}`);
    } catch (error) {
      this.logger.error('Reconnect error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  // ==================== 방 퇴장 ====================

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    try {
      await this.gamesService.leaveRoom(memberId, data.roomId);

      // 소켓 room 떠나기
      client.leave(`room:${data.roomId}`);

      // 소켓 추적 제거
      this.roomSockets.get(data.roomId)?.delete(client.id);

      // 방의 다른 사람들에게 알림
      this.server.to(`room:${data.roomId}`).emit('room:player-left', {
        memberId,
        displayName: client.user?.displayName || 'Unknown',
      });

      // 본인에게 확인
      client.emit('room:left', { roomId: data.roomId });
    } catch (error) {
      this.logger.error('Leave room error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  // ==================== 준비 ====================

  @SubscribeMessage('room:ready')
  async handleReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; ready: boolean },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    try {
      const { allReady } = await this.gamesService.setPlayerReady(memberId, data.roomId, data.ready);

      // 방 전체에 준비 상태 알림
      this.server.to(`room:${data.roomId}`).emit('room:player-ready', {
        memberId,
        ready: data.ready,
        allReady,
      });
    } catch (error) {
      this.logger.error('Ready error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  // ==================== 게임 시작 (방장만) ====================

  @SubscribeMessage('room:start')
  async handleStartGame(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    try {
      const room = await this.gamesService.startGame(data.roomId, memberId);

      // 방 전체에 게임 시작 알림
      this.server.to(`room:${data.roomId}`).emit('room:game-started', {
        roomId: room.id,
        gameCode: room.game?.code,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        players: room.players.map((p) => ({
          memberId: p.memberId,
          displayName: p.member?.user?.battleTag || 'Unknown',
          order: p.order,
        })),
      });

      // 게임 코드별 초기화 및 시작
      await this.initGameByCode(data.roomId, room.game?.code);
    } catch (error) {
      this.logger.error('Start game error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  private async initGameByCode(roomId: string, gameCode?: string) {
    if (!gameCode) return;

    switch (gameCode) {
      case 'WORD_CHAIN': {
        const initResult = await this.wordChainService.initGame(roomId);
        this.server.to(`room:${roomId}`).emit('wordchain:started', {
          startWord: initResult.startWord,
          currentPlayerId: initResult.firstPlayerId,
          timeLimit: 15000,
        });
        this.startWordChainTimer(roomId, 15000);
        break;
      }

      case 'LIAR': {
        const liarResult = await this.liarService.initGame(roomId);
        // 각 플레이어에게 역할 전송
        for (const roleInfo of liarResult.roles) {
          this.emitToMember(roleInfo.memberId, 'liar:role-assigned', {
            role: roleInfo.role,
            topic: liarResult.topic,
            word: roleInfo.role === 'LIAR' ? null : liarResult.word,
          });
        }
        // 토론 시작 알림
        this.server.to(`room:${roomId}`).emit('liar:discussion-start', {
          timeLimit: 60000,
        });
        break;
      }

      case 'CATCH_MIND': {
        await this.catchMindService.initGame(roomId);
        const nextRound = await this.catchMindService.startNextRound(roomId);
        if (nextRound) {
          // 출제자에게 정답 전송
          this.emitToMember(nextRound.drawerId, 'catchmind:your-turn', {
            word: nextRound.word,
            hint: nextRound.hint,
          });
          // 전체에게 라운드 시작 알림
          this.server.to(`room:${roomId}`).emit('catchmind:round-started', {
            round: nextRound.round,
            drawerId: nextRound.drawerId,
          });
        }
        break;
      }
    }
  }

  // ==================== 채팅 ====================

  @SubscribeMessage('room:chat')
  async handleChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; message: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) return;

    // Rate limiting 체크
    if (!this.checkRateLimit(memberId, 300)) {
      return;
    }

    const displayName = client.user?.displayName || 'Unknown';

    this.server.to(`room:${data.roomId}`).emit('room:chat', {
      memberId,
      displayName,
      message: data.message.slice(0, 200),
      timestamp: Date.now(),
    });
  }

  // ==================== 끝말잇기 ====================

  @SubscribeMessage('wordchain:submit')
  async handleWordChainSubmit(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; word: string },
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
      // 기존 타이머 클리어
      this.clearWordChainTimer(data.roomId);

      const result = await this.wordChainService.submitWord(data.roomId, memberId, data.word);

      if (result.valid) {
        // 유효한 단어
        this.server.to(`room:${data.roomId}`).emit('wordchain:valid', {
          memberId,
          word: result.word,
          nextPlayerId: result.nextPlayerId,
        });

        // 다음 플레이어 타이머 시작 (15초)
        this.startWordChainTimer(data.roomId, 15000);
      } else {
        // 유효하지 않은 단어
        client.emit('wordchain:invalid', {
          word: data.word,
          reason: result.reason,
        });
      }
    } catch (error) {
      this.logger.error('WordChain submit error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  private startWordChainTimer(roomId: string, durationMs: number) {
    const timer = setTimeout(async () => {
      const result = await this.wordChainService.handleTimeout(roomId);
      if (result) {
        this.server.to(`room:${roomId}`).emit('wordchain:timeout', {
          loserId: result.loserId,
          reason: result.reason,
        });

        await this.wordChainService.endGame(roomId, result.loserId);
        this.server.to(`room:${roomId}`).emit('game:ended', {
          loserId: result.loserId,
          reason: '시간 초과',
        });
      }
    }, durationMs);

    this.wordChainTimers.set(roomId, timer);
    this.wordChainService.setTurnTimeout(roomId, timer);
  }

  private clearWordChainTimer(roomId: string) {
    const timer = this.wordChainTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.wordChainTimers.delete(roomId);
    }
    this.wordChainService.clearTurnTimeout(roomId);
  }

  // ==================== 라이어 게임 ====================

  @SubscribeMessage('liar:vote')
  async handleLiarVote(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; targetId: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    // Rate limiting 체크
    if (!this.checkRateLimit(memberId)) {
      return;
    }

    try {
      const result = await this.liarService.submitVote(data.roomId, memberId, data.targetId);

      if (result.success) {
        // 투표 성공
        this.server.to(`room:${data.roomId}`).emit('liar:voted', {
          voterId: memberId,
          allVoted: result.allVoted,
        });

        // 모두 투표 완료 시 결과 계산
        if (result.allVoted) {
          const voteResult = await this.liarService.calculateVoteResult(data.roomId);
          this.server.to(`room:${data.roomId}`).emit('liar:vote-result', voteResult);

          if (voteResult.isLiar) {
            // 라이어 지목 성공 -> 라이어에게 정답 맞출 기회
            this.liarService.startGuessing(data.roomId);
            this.emitToMember(voteResult.liarId, 'liar:guess-chance', {
              timeLimit: 30000,
            });
          } else {
            // 라이어 지목 실패 -> 라이어 승리
            await this.liarService.endGame(data.roomId, voteResult.liarId);
            this.server.to(`room:${data.roomId}`).emit('game:ended', {
              liarWon: true,
              liarId: voteResult.liarId,
            });
          }
        }
      } else {
        client.emit('liar:vote-failed', {
          message: result.reason || '투표에 실패했습니다.',
        });
      }
    } catch (error) {
      this.logger.error('Liar vote error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  @SubscribeMessage('liar:guess')
  async handleLiarGuess(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; guess: string },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    // Rate limiting 체크
    if (!this.checkRateLimit(memberId)) {
      return;
    }

    try {
      const state = this.liarService.getState(data.roomId);
      if (!state || state.liarId !== memberId) {
        client.emit('error', { message: '라이어만 정답을 맞출 수 있습니다.' });
        return;
      }

      const result = await this.liarService.checkLiarGuess(data.roomId, data.guess);

      this.server.to(`room:${data.roomId}`).emit('liar:guess-result', {
        liarId: memberId,
        guess: data.guess,
        correct: result.correct,
        actualWord: result.actualWord,
      });

      // 게임 종료
      const winnerId = result.correct ? memberId : null;
      await this.liarService.endGame(data.roomId, winnerId);

      this.server.to(`room:${data.roomId}`).emit('game:ended', {
        liarId: memberId,
        liarWon: result.correct,
        actualWord: result.actualWord,
      });
    } catch (error) {
      this.logger.error('Liar guess error:', error);
      client.emit('error', { message: (error as Error).message });
    }
  }

  // ==================== 캐치마인드 ====================

  @SubscribeMessage('catchmind:draw')
  async handleCatchMindDraw(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; drawData: { type: string; x?: number; y?: number; color?: string; lineWidth?: number } },
  ) {
    const memberId = this.socketToMember.get(client.id);
    if (!memberId) {
      return;
    }

    // 출제자만 그릴 수 있음
    const drawerId = this.catchMindService.getDrawerId(data.roomId);
    if (drawerId !== memberId) {
      return;
    }

    // 본인 제외 브로드캐스트
    client.to(`room:${data.roomId}`).emit('catchmind:draw', {
      drawData: data.drawData,
    });
  }

  @SubscribeMessage('catchmind:guess')
  async handleCatchMindGuess(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; guess: string },
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
      const result = await this.catchMindService.checkGuess(data.roomId, memberId, data.guess);

      if (result.isDrawer) {
        return; // 출제자는 무시
      }

      if (result.alreadyGuessed) {
        return; // 이미 맞춘 사람은 무시
      }

      if (result.correct) {
        // 정답!
        this.server.to(`room:${data.roomId}`).emit('catchmind:correct', {
          guesserId: memberId,
          displayName: client.user?.displayName || 'Unknown',
          points: result.points,
          allGuessed: result.allGuessed,
        });

        // 모두 맞췄으면 라운드 종료
        if (result.allGuessed) {
          const roundResult = await this.catchMindService.endRound(data.roomId);
          this.server.to(`room:${data.roomId}`).emit('catchmind:round-ended', roundResult);

          // 다음 라운드 또는 게임 종료
          const nextRound = await this.catchMindService.startNextRound(data.roomId);
          if (nextRound) {
            // 출제자에게만 정답 전송
            this.emitToMember(nextRound.drawerId, 'catchmind:your-turn', {
              word: nextRound.word,
              hint: nextRound.hint,
            });

            // 전체에게 라운드 시작 알림
            this.server.to(`room:${data.roomId}`).emit('catchmind:round-started', {
              round: nextRound.round,
              drawerId: nextRound.drawerId,
            });
          } else {
            // 게임 종료
            const gameResult = await this.catchMindService.endGame(data.roomId);
            this.server.to(`room:${data.roomId}`).emit('game:ended', gameResult);
          }
        }
      } else {
        // 오답 (채팅에 표시)
        this.server.to(`room:${data.roomId}`).emit('catchmind:wrong-guess', {
          guesserId: memberId,
          displayName: client.user?.displayName || 'Unknown',
          guess: data.guess.slice(0, 50),
        });
      }
    } catch (error) {
      this.logger.error('CatchMind guess error:', error);
      client.emit('error', { message: (error as Error).message });
    }
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

  /**
   * 특정 방의 모든 클라이언트에게 이벤트 전송
   */
  emitToRoom(roomId: string, event: string, payload: unknown) {
    this.server.to(`room:${roomId}`).emit(event, payload);
  }

  /**
   * 특정 멤버에게 이벤트 전송
   */
  emitToMember(memberId: string, event: string, payload: unknown) {
    const socketId = this.memberToSocket.get(memberId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    }
  }
}
