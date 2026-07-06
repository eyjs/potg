import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuctionGateway } from './auction.gateway';
import { AuctionsService } from './auctions.service';
import * as wsGuard from '../../common/guards/ws-jwt.guard';

jest.mock('../../common/guards/ws-jwt.guard', () => ({
  ...jest.requireActual('../../common/guards/ws-jwt.guard'),
  authenticateSocket: jest.fn(),
}));

const authenticateSocketMock =
  wsGuard.authenticateSocket as unknown as jest.Mock;

/**
 * AuctionGateway 단위 테스트.
 *
 * 검증 포인트:
 *  - handleConnection: 인증 성공 시 client.data.user 세팅, 실패 시 disconnect
 *  - 식별자는 페이로드가 아닌 인증 소켓(client.data.user)에서 도출 (위조 차단)
 *  - placeBid 자동 낙찰 분기, confirmBid 멱등(confirmed=false) 분기
 *  - 핸들러 에러를 삼키지 않고 error/bidError 이벤트로 통지
 *
 * 타이머 setInterval 누수 방지를 위해 fake timers 사용.
 */
describe('AuctionGateway', () => {
  let gateway: AuctionGateway;
  let auctionsService: Record<string, jest.Mock>;
  let serverEmit: jest.Mock;
  let server: Server;

  const roomState = {
    auction: {
      turnTimeLimit: 30,
      currentBiddingPlayerId: 'player-1',
      timerPaused: false,
      pausedTimeRemaining: null,
    },
  };

  const makeSocket = (user?: { userId: string; username?: string }): Socket => {
    const toEmit = jest.fn();
    return {
      id: 'sock-1',
      data: user ? { user } : {},
      emit: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn(),
      disconnect: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: toEmit }),
    } as unknown as Socket;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    authenticateSocketMock.mockReset();

    auctionsService = {
      findOne: jest.fn(),
      getRoomState: jest.fn().mockResolvedValue(roomState),
      placeBidWithValidation: jest.fn(),
      checkAutoConfirm: jest.fn(),
      confirmCurrentBid: jest.fn(),
      passCurrentPlayer: jest.fn(),
      selectPlayer: jest.fn(),
      start: jest.fn(),
      complete: jest.fn(),
      reset: jest.fn(),
      autoConfirmOnTimeout: jest.fn(),
    };

    const jwt = {} as JwtService;
    const config = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    const chatRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ ...x, id: 'msg-1', createdAt: new Date() })),
    };

    gateway = new AuctionGateway(
      auctionsService as unknown as AuctionsService,
      jwt,
      config,
      chatRepo as unknown as import('typeorm').Repository<
        import('./entities/auction-chat-message.entity').AuctionChatMessage
      >,
    );

    serverEmit = jest.fn();
    server = {
      to: jest.fn().mockReturnValue({ emit: serverEmit }),
    } as unknown as Server;
    gateway.server = server;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ==================== handleConnection ====================

  describe('handleConnection', () => {
    it('인증 성공 시 client.data.user 세팅', () => {
      const user = { userId: 'user-1', username: 'tag' };
      authenticateSocketMock.mockReturnValue(user);
      const client = makeSocket();

      gateway.handleConnection(client);

      expect((client.data as { user?: unknown }).user).toEqual(user);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('인증 실패 시 error emit + disconnect', () => {
      authenticateSocketMock.mockImplementation(() => {
        throw new Error('no token');
      });
      const client = makeSocket();

      gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '인증이 필요합니다.',
      });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('JWT_SECRET 미설정 시 disconnect', () => {
      (gateway['configService'].get as jest.Mock).mockReturnValue(undefined);
      const client = makeSocket();

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  // ==================== joinRoom ====================

  describe('handleJoinRoom', () => {
    it('정상 입장: room join + roomState emit + userJoined 브로드캐스트', async () => {
      auctionsService.findOne.mockResolvedValue({ id: 'a1', accessCode: null });
      const client = makeSocket({ userId: 'user-1' });

      await gateway.handleJoinRoom({ auctionId: 'a1' }, client);

      expect(client.join).toHaveBeenCalledWith('a1');
      expect(client.emit).toHaveBeenCalledWith('roomState', { roomState });
      expect(client.to).toHaveBeenCalledWith('a1');
    });

    it('경매 미존재 시 error emit', async () => {
      auctionsService.findOne.mockResolvedValue(null);
      const client = makeSocket({ userId: 'user-1' });

      await gateway.handleJoinRoom({ auctionId: 'missing' }, client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '경매를 찾을 수 없습니다.',
      });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('접근 코드 불일치 시 error emit', async () => {
      auctionsService.findOne.mockResolvedValue({
        id: 'a1',
        accessCode: 'SECRET',
      });
      const client = makeSocket({ userId: 'user-1' });

      await gateway.handleJoinRoom(
        { auctionId: 'a1', accessCode: 'WRONG' },
        client,
      );

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '잘못된 접근 코드입니다.',
      });
    });

    it('미인증 소켓(user 없음)이면 입장 실패 통지', async () => {
      const client = makeSocket(); // data.user 없음

      await gateway.handleJoinRoom({ auctionId: 'a1' }, client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '방 입장에 실패했습니다.',
      });
    });
  });

  // ==================== placeBid ====================

  describe('handlePlaceBid', () => {
    it('정상 입찰(자동낙찰 아님): bidPlaced 브로드캐스트 + bidderId는 소켓에서 도출', async () => {
      auctionsService.placeBidWithValidation.mockResolvedValue({
        bid: { amount: 100 },
        bidderName: 'CapTag',
      });
      auctionsService.checkAutoConfirm.mockResolvedValue({
        shouldAutoConfirm: false,
      });
      const client = makeSocket({ userId: 'cap-1' });

      await gateway.handlePlaceBid(
        { auctionId: 'a1', targetPlayerId: 'player-1', amount: 100 },
        client,
      );

      // 페이로드에 bidderId가 없어도 소켓 사용자로 입찰 위임
      expect(auctionsService.placeBidWithValidation).toHaveBeenCalledWith(
        'a1',
        'cap-1',
        'player-1',
        100,
      );
      expect(server.to).toHaveBeenCalledWith('a1');
      expect(serverEmit).toHaveBeenCalledWith(
        'bidPlaced',
        expect.objectContaining({ bidderId: 'cap-1', bidderName: 'CapTag' }),
      );
    });

    it('자동 낙찰 조건이면 confirmCurrentBid 후 bidConfirmed 브로드캐스트', async () => {
      auctionsService.placeBidWithValidation.mockResolvedValue({
        bid: { amount: 100 },
        bidderName: 'CapTag',
      });
      auctionsService.checkAutoConfirm.mockResolvedValue({
        shouldAutoConfirm: true,
        reason: '경쟁자 없음',
      });
      auctionsService.findOne.mockResolvedValue({
        id: 'a1',
        creatorId: 'admin-1',
      });
      auctionsService.confirmCurrentBid.mockResolvedValue({
        confirmed: true,
        playerId: 'player-1',
        captainId: 'cap-1',
        amount: 100,
      });
      const client = makeSocket({ userId: 'cap-1' });

      await gateway.handlePlaceBid(
        { auctionId: 'a1', targetPlayerId: 'player-1', amount: 100 },
        client,
      );

      expect(auctionsService.confirmCurrentBid).toHaveBeenCalledWith(
        'a1',
        'admin-1',
      );
      expect(serverEmit).toHaveBeenCalledWith(
        'bidConfirmed',
        expect.objectContaining({ auto: true, playerId: 'player-1' }),
      );
    });

    it('자동 낙찰이 멱등 no-op(confirmed:false)면 bidConfirmed 미발행', async () => {
      auctionsService.placeBidWithValidation.mockResolvedValue({
        bid: { amount: 100 },
        bidderName: 'CapTag',
      });
      auctionsService.checkAutoConfirm.mockResolvedValue({
        shouldAutoConfirm: true,
        reason: '경쟁자 없음',
      });
      auctionsService.findOne.mockResolvedValue({
        id: 'a1',
        creatorId: 'admin-1',
      });
      auctionsService.confirmCurrentBid.mockResolvedValue({ confirmed: false });
      const client = makeSocket({ userId: 'cap-1' });

      await gateway.handlePlaceBid(
        { auctionId: 'a1', targetPlayerId: 'player-1', amount: 100 },
        client,
      );

      expect(serverEmit).not.toHaveBeenCalledWith(
        'bidConfirmed',
        expect.anything(),
      );
    });

    it('입찰 검증 실패 시 bidError emit (삼키지 않음)', async () => {
      auctionsService.placeBidWithValidation.mockRejectedValue(
        new Error('포인트가 부족합니다.'),
      );
      const client = makeSocket({ userId: 'cap-1' });

      await gateway.handlePlaceBid(
        { auctionId: 'a1', targetPlayerId: 'player-1', amount: 100 },
        client,
      );

      expect(client.emit).toHaveBeenCalledWith('bidError', {
        message: '포인트가 부족합니다.',
      });
    });
  });

  // ==================== confirmBid ====================

  describe('handleConfirmBid', () => {
    it('확정 성공 시 bidConfirmed 브로드캐스트', async () => {
      auctionsService.confirmCurrentBid.mockResolvedValue({
        confirmed: true,
        playerId: 'player-1',
        captainId: 'cap-1',
        amount: 200,
      });
      const client = makeSocket({ userId: 'admin-1' });

      await gateway.handleConfirmBid({ auctionId: 'a1' }, client);

      expect(auctionsService.confirmCurrentBid).toHaveBeenCalledWith(
        'a1',
        'admin-1',
      );
      expect(serverEmit).toHaveBeenCalledWith(
        'bidConfirmed',
        expect.objectContaining({ playerId: 'player-1', amount: 200 }),
      );
    });

    it('멱등 no-op(confirmed:false)면 roomState만 동기화', async () => {
      auctionsService.confirmCurrentBid.mockResolvedValue({ confirmed: false });
      const client = makeSocket({ userId: 'admin-1' });

      await gateway.handleConfirmBid({ auctionId: 'a1' }, client);

      expect(serverEmit).toHaveBeenCalledWith('roomState', { roomState });
      expect(serverEmit).not.toHaveBeenCalledWith(
        'bidConfirmed',
        expect.anything(),
      );
    });

    it('service 에러 시 error emit', async () => {
      auctionsService.confirmCurrentBid.mockRejectedValue(
        new Error('관리자만 낙찰을 확정할 수 있습니다.'),
      );
      const client = makeSocket({ userId: 'not-admin' });

      await gateway.handleConfirmBid({ auctionId: 'a1' }, client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '관리자만 낙찰을 확정할 수 있습니다.',
      });
    });
  });

  // ==================== 기타 마스터 액션 ====================

  describe('마스터 액션 위임', () => {
    it('passPlayer → service.passCurrentPlayer + playerPassed 브로드캐스트', async () => {
      auctionsService.passCurrentPlayer.mockResolvedValue({ passed: true });
      const client = makeSocket({ userId: 'admin-1' });

      await gateway.handlePassPlayer({ auctionId: 'a1' }, client);

      expect(auctionsService.passCurrentPlayer).toHaveBeenCalledWith(
        'a1',
        'admin-1',
      );
      expect(serverEmit).toHaveBeenCalledWith(
        'playerPassed',
        expect.objectContaining({ roomState }),
      );
    });

    it('selectPlayer → service.selectPlayer + playerSelected 브로드캐스트', async () => {
      auctionsService.selectPlayer.mockResolvedValue({});
      const client = makeSocket({ userId: 'admin-1' });

      await gateway.handleSelectPlayer(
        { auctionId: 'a1', playerId: 'player-1' },
        client,
      );

      expect(auctionsService.selectPlayer).toHaveBeenCalledWith(
        'a1',
        'admin-1',
        'player-1',
      );
      expect(serverEmit).toHaveBeenCalledWith(
        'playerSelected',
        expect.objectContaining({ playerId: 'player-1' }),
      );
    });

    it('startAuction → service.start + auctionStarted 브로드캐스트', async () => {
      auctionsService.start.mockResolvedValue({});
      const client = makeSocket({ userId: 'admin-1' });

      await gateway.handleStartAuction({ auctionId: 'a1' }, client);

      expect(auctionsService.start).toHaveBeenCalledWith('a1', 'admin-1');
      expect(serverEmit).toHaveBeenCalledWith(
        'auctionStarted',
        expect.objectContaining({ roomState }),
      );
    });

    it('resetAuction → service.reset + auctionReset 브로드캐스트', async () => {
      auctionsService.reset.mockResolvedValue({});
      const client = makeSocket({ userId: 'admin-1' });

      await gateway.handleResetAuction({ auctionId: 'a1' }, client);

      expect(auctionsService.reset).toHaveBeenCalledWith('a1', 'admin-1');
      expect(serverEmit).toHaveBeenCalledWith(
        'auctionReset',
        expect.objectContaining({ roomState }),
      );
    });

    it('미인증 소켓이면 변이 위임 없이 error emit', async () => {
      const client = makeSocket(); // user 없음

      await gateway.handleStartAuction({ auctionId: 'a1' }, client);

      expect(auctionsService.start).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '인증이 필요합니다.',
      });
    });
  });

  // ==================== chatMessage ====================

  describe('handleChatMessage', () => {
    const user = { userId: 'user-1', username: 'tag#1234' };

    /** joinRoom을 거친 상태를 재현 — connectedUsers에 소켓 등록. */
    const joinRoom = (client: Socket, auctionId: string) => {
      gateway['connectedUsers'].set(client.id, {
        socketId: client.id,
        auctionId,
        userId: user.userId,
      });
    };

    const saveMock = () => gateway['chatRepo'].save as jest.Mock;

    it('입장한 방이면 저장 후 chatMessage 브로드캐스트', async () => {
      const client = makeSocket(user);
      joinRoom(client, 'a1');

      await gateway.handleChatMessage({ auctionId: 'a1', message: 'gg' }, client);

      expect(saveMock()).toHaveBeenCalled();
      expect(server.to).toHaveBeenCalledWith('a1');
      expect(serverEmit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({ userId: 'user-1', message: 'gg' }),
      );
    });

    it('joinRoom을 거치지 않은 소켓이면 저장/브로드캐스트 없이 error emit', async () => {
      const client = makeSocket(user);

      await gateway.handleChatMessage({ auctionId: 'a1', message: 'gg' }, client);

      expect(saveMock()).not.toHaveBeenCalled();
      expect(serverEmit).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '입장하지 않은 경매방에는 채팅할 수 없습니다.',
      });
    });

    it('다른 방에 입장한 소켓이 방 id를 위조하면 거부', async () => {
      const client = makeSocket(user);
      joinRoom(client, 'a1');

      await gateway.handleChatMessage({ auctionId: 'a2', message: 'gg' }, client);

      expect(saveMock()).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '입장하지 않은 경매방에는 채팅할 수 없습니다.',
      });
    });

    it('윈도우 내 초과 전송은 거부하고, 윈도우가 지나면 다시 허용 (도배 방지)', async () => {
      const client = makeSocket(user);
      joinRoom(client, 'a1');

      for (let i = 0; i < 5; i++) {
        await gateway.handleChatMessage(
          { auctionId: 'a1', message: `m${i}` },
          client,
        );
      }
      expect(saveMock()).toHaveBeenCalledTimes(5);

      await gateway.handleChatMessage({ auctionId: 'a1', message: 'm5' }, client);
      expect(saveMock()).toHaveBeenCalledTimes(5);
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: '메시지를 너무 빠르게 보내고 있습니다. 잠시 후 다시 시도해주세요.',
      });

      jest.advanceTimersByTime(5_000);
      await gateway.handleChatMessage({ auctionId: 'a1', message: 'm6' }, client);
      expect(saveMock()).toHaveBeenCalledTimes(6);
    });

    it('disconnect 시 레이트리밋 기록 정리', async () => {
      const client = makeSocket(user);
      joinRoom(client, 'a1');
      await gateway.handleChatMessage({ auctionId: 'a1', message: 'gg' }, client);
      expect(gateway['chatRateLog'].has(client.id)).toBe(true);

      gateway.handleDisconnect(client);

      expect(gateway['chatRateLog'].has(client.id)).toBe(false);
    });
  });
});
