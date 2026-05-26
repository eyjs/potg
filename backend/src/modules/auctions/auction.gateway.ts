import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { AuctionsService } from './auctions.service';

interface JoinRoomPayload {
  auctionId: string;
  userId: string;
  accessCode?: string;
}

interface PlaceBidPayload {
  auctionId: string;
  bidderId: string;
  targetPlayerId: string;
  amount: number;
}

interface SelectPlayerPayload {
  auctionId: string;
  adminId: string;
  playerId: string;
}

interface ConfirmBidPayload {
  auctionId: string;
  adminId: string;
}

interface PassPlayerPayload {
  auctionId: string;
  adminId: string;
}

interface ChatMessagePayload {
  auctionId: string;
  userId: string;
  userName: string;
  message: string;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
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

  constructor(private readonly auctionsService: AuctionsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, userId, accessCode } = payload;

    try {
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
    @MessageBody() payload: { auctionId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, userId } = payload;
    void client.leave(auctionId);
    this.connectedUsers.delete(client.id);
    client.to(auctionId).emit('userLeft', { userId });
  }

  @SubscribeMessage('requestRoomState')
  async handleRequestRoomState(
    @MessageBody() payload: { auctionId: string },
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
    const { auctionId, bidderId, targetPlayerId, amount } = payload;

    try {
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

          this.server.to(auctionId).emit('bidConfirmed', {
            playerId: confirmResult.playerId,
            captainId: confirmResult.captainId,
            amount: confirmResult.amount,
            auto: true,
            reason: autoConfirmCheck.reason,
            roomState,
          });
        }
      } else {
        // Reset timer only if not auto-confirmed
        this.resetBiddingTimer(auctionId);
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
    const { auctionId, adminId, playerId } = payload;

    try {
      await this.auctionsService.selectPlayer(auctionId, adminId, playerId);

      // Start bidding timer
      this.startBiddingTimer(auctionId);

      const roomState = await this.auctionsService.getRoomState(auctionId);
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
    @MessageBody() payload: ConfirmBidPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
      // Stop timer
      this.stopBiddingTimer(auctionId);

      const result = await this.auctionsService.confirmCurrentBid(
        auctionId,
        adminId,
      );
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('bidConfirmed', {
        playerId: result.playerId,
        captainId: result.captainId,
        amount: result.amount,
        roomState,
      });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('passPlayer')
  async handlePassPlayer(
    @MessageBody() payload: PassPlayerPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
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
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
      await this.auctionsService.start(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('auctionStarted', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('completeAuction')
  async handleCompleteAuction(
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
      await this.auctionsService.complete(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('auctionCompleted', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(
    @MessageBody() payload: ChatMessagePayload,
    @ConnectedSocket() _client: Socket,
  ) {
    const { auctionId, userId, userName, message } = payload;

    this.server.to(auctionId).emit('chatMessage', {
      id: Date.now().toString(),
      userId,
      userName,
      message,
      timestamp: new Date().toISOString(),
      type: 'chat',
    });
  }

  // ========== Master Control Events ==========

  @SubscribeMessage('pauseAuction')
  async handlePauseAuction(
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
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
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
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
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
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
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
      const auction = await this.auctionsService.findOne(auctionId);
      const remainingTime =
        auction?.pausedTimeRemaining || auction?.turnTimeLimit || 60;

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
    @MessageBody()
    payload: { auctionId: string; adminId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId, playerId } = payload;

    try {
      await this.auctionsService.undoSoldPlayer(auctionId, adminId, playerId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('playerUndone', { playerId, roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('nextPlayer')
  async handleNextPlayer(
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
      await this.auctionsService.nextPlayer(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('readyForNextPlayer', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('enterAssignmentPhase')
  async handleEnterAssignmentPhase(
    @MessageBody() payload: { auctionId: string; adminId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId } = payload;

    try {
      await this.auctionsService.enterAssignmentPhase(auctionId, adminId);
      const roomState = await this.auctionsService.getRoomState(auctionId);

      this.server.to(auctionId).emit('assignmentPhaseStarted', { roomState });
    } catch (error) {
      client.emit('error', { message: errMsg(error) });
    }
  }

  @SubscribeMessage('manualAssignPlayer')
  async handleManualAssignPlayer(
    @MessageBody()
    payload: {
      auctionId: string;
      adminId: string;
      playerId: string;
      captainId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { auctionId, adminId, playerId, captainId } = payload;

    try {
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
  private startBiddingTimer(auctionId: string) {
    this.stopBiddingTimer(auctionId);

    const TIMER_INTERVAL = 1000;
    let remainingTime = 60; // Default time limit, should come from auction settings

    const timer = setInterval(() => {
      remainingTime--;

      // Broadcast timer update
      this.server.to(auctionId).emit('timerUpdate', { remainingTime });

      if (remainingTime <= 0) {
        this.stopBiddingTimer(auctionId);
        void this.handleTimerExpired(auctionId);
      }
    }, TIMER_INTERVAL);

    this.auctionTimers.set(auctionId, timer);
  }

  private resetBiddingTimer(auctionId: string) {
    // Reset timer when new bid placed
    this.startBiddingTimer(auctionId);
  }

  private startBiddingTimerWithRemaining(
    auctionId: string,
    remainingTime: number,
  ) {
    this.stopBiddingTimer(auctionId);

    const TIMER_INTERVAL = 1000;
    let timeLeft = remainingTime;

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
    }
  }

  // Utility method to broadcast room state update
  async broadcastRoomState(auctionId: string) {
    const roomState = await this.auctionsService.getRoomState(auctionId);
    this.server.to(auctionId).emit('roomState', roomState);
  }
}
