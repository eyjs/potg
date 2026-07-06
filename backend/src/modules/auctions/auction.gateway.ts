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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuctionsService } from './auctions.service';
import { AuctionChatMessage } from './entities/auction-chat-message.entity';
import { AuctionStatus, BiddingPhase } from './entities/auction.entity';
import type { RoomState } from './services/auctions-room-state.service';
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
    @InjectRepository(AuctionChatMessage)
    private readonly chatRepo: Repository<AuctionChatMessage>,
  ) {}

  /** 입장 시 되돌려줄 최근 채팅 개수 (프론트 유지 캡과 동일). */
  private static readonly CHAT_HISTORY_LIMIT = 200;

  /** 채팅 도배 방지 — 소켓당 CHAT_RATE_WINDOW_MS 안에 CHAT_RATE_MAX개 초과 시 거부. */
  private static readonly CHAT_RATE_MAX = 5;
  private static readonly CHAT_RATE_WINDOW_MS = 5_000;
  private chatRateLog: Map<string, number[]> = new Map();

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
    this.chatRateLog.delete(client.id);
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
      client.emit('roomState', { roomState });

      // 서버 재시작 등으로 메모리 타이머가 유실됐으면 복원 — BIDDING 인데
      // 인터벌이 없으면 endTime 기준으로 재가동한다 (타이머 멈춤 자가 치유).
      this.ensureBiddingTimer(auctionId, roomState);

      // 입장 클라이언트에만 최근 채팅 히스토리 전송 (늦게 입장/재접속해도 이전 대화 복원).
      // 채팅 히스토리 실패가 방 입장을 막지 않도록 독립적으로 처리한다.
      try {
        const history = await this.chatRepo.find({
          where: { auctionId },
          order: { createdAt: 'DESC' },
          take: AuctionGateway.CHAT_HISTORY_LIMIT,
        });
        client.emit(
          'chatHistory',
          history.reverse().map((m) => ({
            id: m.id,
            userId: m.userId,
            userName: m.userName,
            message: m.message,
            timestamp: m.createdAt.toISOString(),
            type: 'chat' as const,
          })),
        );
      } catch (chatErr) {
        this.logger.warn(`채팅 히스토리 조회 실패 (auction ${auctionId}): ${errMsg(chatErr)}`);
      }

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
      client.emit('roomState', { roomState });
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
        // 안티-스나이프: 입찰이 무조건 타이머를 리셋하지 않는다. 서비스가 갱신한
        // currentBiddingEndTime(긴급 구간 입찰만 +5s)을 단일 소스로 라이브 타이머를
        // 재동기화한다 → 비긴급 입찰은 남은 시간 그대로, 긴급 입찰은 +5s 반영.
        const endTimeIso = roomState.auction.currentBiddingEndTime;
        const remaining = endTimeIso
          ? Math.max(
              1,
              Math.round((new Date(endTimeIso).getTime() - Date.now()) / 1000),
            )
          : roomState.auction.turnTimeLimit;
        this.startBiddingTimerWithRemaining(auctionId, remaining);
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
        this.server.to(auctionId).emit('roomState', { roomState });
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
  async handleChatMessage(
    @MessageBody() payload: ChatMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, message } = payload;
    const { userId, username } = this.requireUser(client);

    // joinRoom(접근 코드 검증 포함)을 거친 소켓만 해당 방에 채팅 가능.
    const conn = this.connectedUsers.get(client.id);
    if (!conn || conn.auctionId !== auctionId) {
      client.emit('error', {
        message: '입장하지 않은 경매방에는 채팅할 수 없습니다.',
      });
      return;
    }

    const trimmed = message?.trim();
    if (!trimmed) return;

    // 도배 방지 — 소켓당 슬라이딩 윈도우.
    const now = Date.now();
    const recent = (this.chatRateLog.get(client.id) ?? []).filter(
      (t) => now - t < AuctionGateway.CHAT_RATE_WINDOW_MS,
    );
    if (recent.length >= AuctionGateway.CHAT_RATE_MAX) {
      this.chatRateLog.set(client.id, recent);
      client.emit('error', {
        message: '메시지를 너무 빠르게 보내고 있습니다. 잠시 후 다시 시도해주세요.',
      });
      return;
    }
    this.chatRateLog.set(client.id, [...recent, now]);

    // 저장 후 저장된 row(uuid id, createdAt)를 그대로 broadcast — 프론트가 id 로 dedupe.
    const saved = await this.chatRepo.save(
      this.chatRepo.create({
        auctionId,
        userId,
        userName: username,
        message: trimmed.slice(0, 500),
      }),
    );

    this.server.to(auctionId).emit('chatMessage', {
      id: saved.id,
      userId: saved.userId,
      userName: saved.userName,
      message: saved.message,
      timestamp: saved.createdAt.toISOString(),
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

  /**
   * 라이브 타이머 자가 치유 — 서버 재시작으로 in-memory 인터벌이 유실된 경우
   * (BIDDING + endTime 존재 + 인터벌 없음) DB endTime 기준으로 재가동한다.
   * endTime 이 이미 지났으면 만료 처리 경로로 넘긴다.
   */
  private ensureBiddingTimer(auctionId: string, roomState: RoomState) {
    const a = roomState.auction;
    if (
      a.status !== AuctionStatus.ONGOING ||
      a.biddingPhase !== BiddingPhase.BIDDING ||
      a.timerPaused ||
      !a.currentBiddingEndTime ||
      this.auctionTimers.has(auctionId)
    ) {
      return;
    }
    const remaining = Math.round(
      (new Date(a.currentBiddingEndTime).getTime() - Date.now()) / 1000,
    );
    if (remaining <= 0) {
      this.logger.warn(
        `Auction ${auctionId}: 만료된 타이머 발견(재시작 유실) — 만료 처리`,
      );
      void this.handleTimerExpired(auctionId);
      return;
    }
    this.logger.log(
      `Auction ${auctionId}: 라이브 타이머 복원 (${remaining}s 남음)`,
    );
    this.startBiddingTimerWithRemaining(auctionId, remaining);
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
        this.server.to(auctionId).emit('roomState', { roomState });
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
    this.server.to(auctionId).emit('roomState', { roomState });
  }
}
