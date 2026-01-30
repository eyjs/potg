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

  constructor(
    private gamesService: GamesService,
    private jwtService: JwtService,
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
    } catch (error) {
      this.logger.error('Start game error:', error);
      client.emit('error', { message: (error as Error).message });
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

    const displayName = client.user?.displayName || 'Unknown';

    this.server.to(`room:${data.roomId}`).emit('room:chat', {
      memberId,
      displayName,
      message: data.message.slice(0, 200),
      timestamp: Date.now(),
    });
  }

  // ==================== 유틸리티 ====================

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
