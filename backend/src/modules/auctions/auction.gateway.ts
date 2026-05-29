import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuctionsService } from './auctions.service';
import {
  authenticateSocket,
  WsJwtGuard,
  SocketUser,
} from '../../common/guards/ws-jwt.guard';
import { CORS_ALLOWED_ORIGINS } from '../../common/config/cors-origins';

// 식별자(bidderId/adminId/userId)는 페이로드가 아닌 인증 소켓(client.data.user)에서 도출한다.
interface JoinRoomPayload {
  auctionId: string;
  accessCode?: string;
}

interface PlaceBidPayload {
  auctionId: string;
  targetPlayerId: string;
  amount: number;
}

interface SelectPlayerPayload {
  auctionId: string;
  playerId: string;
}

interface AuctionIdPayload {
  auctionId: string;
}

interface ChatMessagePayload {
  auctionId: string;
  message: string;
}

interface PlayerActionPayload {
  auctionId: string;
  playerId: string;
}

interface ManualAssignPayload {
  auctionId: string;
  playerId: string;
  captainId: string;
}

const DEFAULT_TURN_SECONDS = 60;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

@Injectable()
@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: {
    origin: CORS_ALLOWED_ORIGINS,
    credentials: true,
  },
  namespace: '/auction',
})
export class AuctionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('AuctionGateway');
  private connectedUsers: Map<
    string,
    { socketId: string; auctionId: string; userId: string }
  > = new Map();
  private auctionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new WsException('서버 인증 설정 오류');
      }
      const user = authenticateSocket(client, this.jwtService, secret);
      (client.data as { user?: SocketUser }).user = user;
      this.logger.log(`Client connected: ${client.id} (user ${user.userId})`);
    } catch (e) {
      this.logger.warn(
        `Unauthenticated socket ${client.id} rejected: ${errMsg(e)}`,
      );
      client.emit('error', { message: '인증이 필요합니다.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  /** 인증 소켓 사용자. connection 에서 세팅됨. 없으면 거부. */
  private requireUser(client: Socket): SocketUser {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user?.userId) {
      throw new WsException('인증이 필요합니다.');
    }
    return user;
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, accessCode } = payload;

    try {
      const { userId } = this.requireUser(client);
      const auction = await this.auctionsService.findOne(auctionId);
      if (!auction) {
        client.emit('error', { message: '경매를 찾을 수 없습니다.' });
        return;
      }

      // Check access code if required
      if (auction.accessCode && auction.accessCode !== accessCode) {
        client.emit('error', { message: '잘못된 접근 코드입니다.' });
        return;
      }

      // Join socket room
      await client.join(auctionId);
      this.connectedUsers.set(client.id, {
        socketId: client.id,
        auctionId,
        userId,
      });

      // Get full room state
      const roomState = await this.auctionsService.getRoomState(auctionId);
      client.emit('roomState', roomState);

      // Notify others
      client.to(auctionId).emit('userJoined', { userId });

      this.logger.log(`User ${userId} joined auction ${auctionId}`);
    } catch (error) {
      this.logger.error(`Error joining room: ${errMsg(error)}`);
      client.emit('error', { message: '방 입장에 실패했습니다.' });
    }
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;
    const { userId } = this.requireUser(client);
    void client.leave(auctionId);
    this.connectedUsers.delete(client.id);
    client.to(auctionId).emit('userLeft', { userId });
  }

  @SubscribeMessage('requestRoomState')
  async handleRequestRoomState(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const roomState = await this.auctionsService.getRoomState(auctionId);
      client.emit('roomState', roomState);
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @MessageBody() payload: PlaceBidPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, targetPlayerId, amount } = payload;

    try {
      const { userId: bidderId } = this.requireUser(client);
      const result = await this.auctionsService.placeBidWithValidation(
        auctionId,
        bidderId,
        targetPlayerId,
        amount,
      );

      // Broadcast new bid to all in room
      let roomState = await this.auctionsService.getRoomState(auctionId);
      this.server.to(auctionId).emit('bidPlaced', {
        bidderId,
        targetPlayerId,
        amount,
        bidderName: result.bidderName,
        roomState,
      });

      // Check if auto-confirm should happen (all competitors can't bid higher)
      const autoConfirmCheck =
        await this.auctionsService.checkAutoConfirm(auctionId);
      if (autoConfirmCheck.shouldAutoConfirm) {
        this.logger.log(
          `Auto-confirming bid for auction ${auctionId}: ${autoConfirmCheck.reason}`,
        );
        this.stopBiddingTimer(auctionId);

        // Get auction to find creator for admin context
        const auction = await this.auctionsService.findOne(auctionId);
        if (auction) {
          const confirmResult = await this.auctionsService.confirmCurrentBid(
            auctionId,
            auction.creatorId,
          );
          roomState = await this.auctionsService.getRoomState(auctionId);

          // 잠금 하 재검증으로 멱등 no-op 처리된 경우(이미 낙찰됨) 중복 emit 방지
          if (confirmResult.confirmed) {
            this.server.to(auctionId).emit('bidConfirmed', {
              playerId: confirmResult.playerId,
              captainId: confirmResult.captainId,
              amount: confirmResult.amount,
              auto: true,
              reason: autoConfirmCheck.reason,
              roomState,
            });
          }
        }
      } else {
        // Reset timer only if not auto-confirmed
        this.resetBiddingTimer(auctionId, roomState.auction.turnTimeLimit);
      }
    } catch (error) {
      client.emit('bidError', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('selectPlayer')
  async handleSelectPlayer(
    @MessageBody() payload: SelectPlayerPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, playerId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.selectPlayer(auctionId, adminId, playerId);

      const roomState = await this.auctionsService.getRoomState(auctionId);
      // Start bidding timer with the auction's configured turn time
      this.startBiddingTimer(auctionId, roomState.auction.turnTimeLimit);

      this.server.to(auctionId).emit('playerSelected', {
        playerId,
        roomState,
      });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('confirmBid')
  async handleConfirmBid(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      // Stop timer
      this.stopBiddingTimer(auctionId);

      const result = await this.auctionsService.confirmCurrentBid(
        auctionId,
        adminId,
      );
      const roomState = await this.auctionsService.getRoomState(auctionId);

      if (result.confirmed) {
        this.server.to(auctionId).emit('bidConfirmed', {
          playerId: result.playerId,
          captainId: result.captainId,
          amount: result.amount,
          roomState,
        });
      } else {
        // 이미 처리됨 — 최신 상태만 동기화
        this.server.to(auctionId).emit('roomState', roomState);
      }
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('passPlayer')
  async handlePassPlayer(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      // Stop timer
      this.stopBiddingTimer(auctionId);

      await this.auctionsService.passCurrentPlayer(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('playerPassed', {
        roomState,
      });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('startAuction')
  async handleStartAuction(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.start(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('auctionStarted', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('completeAuction')
  async handleCompleteAuction(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.complete(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('auctionCompleted', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('resetAuction')
  async handleResetAuction(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      this.stopBiddingTimer(auctionId);
      await this.auctionsService.reset(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('auctionReset', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(
    @MessageBody() payload: ChatMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, message } = payload;
    const { userId, username } = this.requireUser(client);

    this.server.to(auctionId).emit('chatMessage', {
      id: `${userId}-${Date.now()}`,
      userId,
      userName: username,
      message,
      timestamp: new Date().toISOString(),
      type: 'chat',
    });
  }

  // ========== Master Control Events ==========

  @SubscribeMessage('pauseAuction')
  async handlePauseAuction(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      this.stopBiddingTimer(auctionId);
      await this.auctionsService.pauseAuction(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('auctionPaused', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('resumeAuction')
  async handleResumeAuction(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.resumeAuction(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      // Resume timer if there was a player being auctioned
      if (
        roomState.auction.currentBiddingPlayerId &&
        !roomState.auction.timerPaused
      ) {
        this.startBiddingTimerWithRemaining(
          auctionId,
          roomState.auction.pausedTimeRemaining ||
            roomState.auction.turnTimeLimit,
        );
      }

      this.server.to(auctionId).emit('auctionResumed', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('pauseTimer')
  async handlePauseTimer(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      this.stopBiddingTimer(auctionId);
      await this.auctionsService.pauseTimer(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('timerPaused', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('resumeTimer')
  async handleResumeTimer(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      const auction = await this.auctionsService.findOne(auctionId);
      const remainingTime =
        auction?.pausedTimeRemaining ||
        auction?.turnTimeLimit ||
        DEFAULT_TURN_SECONDS;

      await this.auctionsService.resumeTimer(auctionId, adminId);
      this.startBiddingTimerWithRemaining(auctionId, remainingTime);

      const roomState = await this.auctionsService.getRoomState(auctionId);
      this.server.to(auctionId).emit('timerResumed', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('undoSoldPlayer')
  async handleUndoSoldPlayer(
    @MessageBody() payload: PlayerActionPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, playerId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.undoSoldPlayer(auctionId, adminId, playerId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('playerUndone', { playerId, roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('nextPlayer')
  async handleNextPlayer(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.nextPlayer(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('readyForNextPlayer', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('enterAssignmentPhase')
  async handleEnterAssignmentPhase(
    @MessageBody() payload: AuctionIdPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.enterAssignmentPhase(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('assignmentPhaseStarted', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('manualAssignPlayer')
  async handleManualAssignPlayer(
    @MessageBody() payload: ManualAssignPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, playerId, captainId } = payload;

    try {
      const { userId: adminId } = this.requireUser(client);
      await this.auctionsService.manualAssignPlayer(
        auctionId,
        adminId,
        playerId,
        captainId,
      );
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server
        .to(auctionId)
        .emit('playerManuallyAssigned', { playerId, captainId, roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  // Timer management
  private startBiddingTimer(
    auctionId: string,
    seconds: number = DEFAULT_TURN_SECONDS,
  ) {
    this.startBiddingTimerWithRemaining(auctionId, seconds);
  }

  private resetBiddingTimer(
    auctionId: string,
    seconds: number = DEFAULT_TURN_SECONDS,
  ) {
    // Reset timer when new bid placed
    this.startBiddingTimerWithRemaining(auctionId, seconds);
  }

  private startBiddingTimerWithRemaining(
    auctionId: string,
    remainingTime: number,
  ) {
    this.stopBiddingTimer(auctionId);

    const TIMER_INTERVAL = 1000;
    let timeLeft = remainingTime > 0 ? remainingTime : DEFAULT_TURN_SECONDS;

    const timer = setInterval(() => {
      timeLeft--;

      // Broadcast timer update
      this.server
        .to(auctionId)
        .emit('timerUpdate', { remainingTime: timeLeft });

      if (timeLeft <= 0) {
        this.stopBiddingTimer(auctionId);
        void this.handleTimerExpired(auctionId);
      }
    }, TIMER_INTERVAL);

    this.auctionTimers.set(auctionId, timer);
  }

  private stopBiddingTimer(auctionId: string) {
    const timer = this.auctionTimers.get(auctionId);
    if (timer) {
      clearInterval(timer);
      this.auctionTimers.delete(auctionId);
    }
  }

  private async handleTimerExpired(auctionId: string) {
    try {
      // Auto-confirm highest bid when timer expires
      const result = await this.auctionsService.autoConfirmOnTimeout(auctionId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      if (result.confirmed) {
        this.server.to(auctionId).emit('bidConfirmed', {
          playerId: result.playerId,
          captainId: result.captainId,
          amount: result.amount,
          auto: true,
          roomState,
        });
      } else {
        // No bids, player passed
        this.server.to(auctionId).emit('playerPassed', {
          auto: true,
          roomState,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling timer expiry: ${errMsg(error)}`);
      // 클라이언트에 실패를 알리고 최신 상태로 동기화 (무음 삼킴 방지)
      this.server.to(auctionId).emit('error', {
        message: `자동 낙찰 처리 실패: ${errMsg(error)}`,
      });
      try {
        const roomState = await this.auctionsService.getRoomState(auctionId);
        this.server.to(auctionId).emit('roomState', roomState);
      } catch (stateError) {
        this.logger.error(
          `Failed to resync room state after timer error: ${errMsg(stateError)}`,
        );
      }
    }
  }

  // Utility method to broadcast room state update
  async broadcastRoomState(auctionId: string) {
    const roomState = await this.auctionsService.getRoomState(auctionId);
    this.server.to(auctionId).emit('roomState', roomState);
  }
}
