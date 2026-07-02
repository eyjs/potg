import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuctionsService } from './auctions.service';
import { AuctionsBiddingService } from './services/auctions-bidding.service';
import { AuctionsRoomStateService } from './services/auctions-room-state.service';
import {
  Auction,
  AuctionStatus,
  BiddingPhase,
} from './entities/auction.entity';
import {
  AuctionParticipant,
  AuctionRole,
} from './entities/auction-participant.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { User } from '../users/entities/user.entity';

/**
 * AuctionsService 핵심 비즈니스 로직 단위 테스트.
 *
 * 커버: create, join, addPlayer (권한/상태), placeBidWithValidation (입찰 검증 + 트랜잭션),
 * confirmCurrentBid (낙찰 + 포인트 차감), passCurrentPlayer (유찰), start (상태 전이).
 *
 * 회귀 안전망: 1168줄 service 분할 전 핵심 흐름 보존 보장.
 */
describe('AuctionsService', () => {
  let service: AuctionsService;
  let auctionsRepo: jest.Mocked<
    Pick<Repository<Auction>, 'create' | 'save' | 'find' | 'findOne'>
  >;
  let participantsRepo: jest.Mocked<
    Pick<
      Repository<AuctionParticipant>,
      'create' | 'save' | 'findOne' | 'count' | 'remove' | 'update'
    >
  >;
  let bidsRepo: jest.Mocked<Pick<Repository<AuctionBid>, 'create' | 'save'>>;
  let usersRepo: jest.Mocked<
    Pick<Repository<User>, 'create' | 'save' | 'findOne'>
  >;
  let manager: jest.Mocked<
    Pick<
      EntityManager,
      'findOne' | 'find' | 'save' | 'create' | 'update' | 'count'
    >
  >;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<typeof manager>;

    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    };

    const mockAuctionsRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const mockParticipantsRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const mockBidsRepo = { create: jest.fn(), save: jest.fn() };
    const mockUsersRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        AuctionsBiddingService,
        AuctionsRoomStateService,
        { provide: getRepositoryToken(Auction), useValue: mockAuctionsRepo },
        {
          provide: getRepositoryToken(AuctionParticipant),
          useValue: mockParticipantsRepo,
        },
        { provide: getRepositoryToken(AuctionBid), useValue: mockBidsRepo },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AuctionsService);
    auctionsRepo = module.get(getRepositoryToken(Auction));
    participantsRepo = module.get(getRepositoryToken(AuctionParticipant));
    bidsRepo = module.get(getRepositoryToken(AuctionBid));
    usersRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  const baseAuction = (overrides: Partial<Auction> = {}): Auction =>
    ({
      id: 'auction-1',
      title: '테스트 경매',
      status: AuctionStatus.PENDING,
      biddingPhase: BiddingPhase.WAITING,
      startingPoints: 1000,
      turnTimeLimit: 30,
      teamCount: 4,
      currentBiddingPlayerId: null,
      currentBiddingEndTime: null,
      timerPaused: false,
      pausedTimeRemaining: null,
      creatorId: 'admin-1',
      ...overrides,
    }) as unknown as Auction;

  // ==================== create ====================

  describe('create', () => {
    it('creatorId를 userId로 설정하여 저장', async () => {
      const dto = {
        title: '경매',
        startingPoints: 500,
        turnTimeLimit: 30,
        teamCount: 4,
      };
      const created = { ...dto, creatorId: 'user-1' } as unknown as Auction;
      (auctionsRepo.create as jest.Mock).mockReturnValue(created);
      (auctionsRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.create(dto as never, 'user-1');

      expect(auctionsRepo.create).toHaveBeenCalledWith({
        ...dto,
        creatorId: 'user-1',
      });
      expect(result).toBe(created);
    });
  });

  // ==================== join ====================

  describe('join', () => {
    it('CAPTAIN으로 join 시 startingPoints 부여', async () => {
      const auction = baseAuction({ startingPoints: 1500 });
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(auction);
      (participantsRepo.findOne as jest.Mock).mockResolvedValue(null);
      (participantsRepo.create as jest.Mock).mockImplementation((p) => p);
      (participantsRepo.save as jest.Mock).mockImplementation((p) =>
        Promise.resolve(p),
      );

      const result = (await service.join(
        'auction-1',
        'user-1',
        AuctionRole.CAPTAIN,
      )) as unknown as AuctionParticipant;

      expect(result.currentPoints).toBe(1500);
      expect(result.role).toBe(AuctionRole.CAPTAIN);
    });

    it('PLAYER로 join 시 currentPoints=0', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (participantsRepo.findOne as jest.Mock).mockResolvedValue(null);
      (participantsRepo.create as jest.Mock).mockImplementation((p) => p);
      (participantsRepo.save as jest.Mock).mockImplementation((p) =>
        Promise.resolve(p),
      );

      const result = (await service.join(
        'auction-1',
        'user-1',
        AuctionRole.PLAYER,
      )) as unknown as AuctionParticipant;

      expect(result.currentPoints).toBe(0);
    });

    it('이미 참가한 경우 BadRequestException', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (participantsRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.join('auction-1', 'user-1', AuctionRole.PLAYER),
      ).rejects.toThrow(BadRequestException);
    });

    it('경매 미존재 시 BadRequestException', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.join('missing', 'user-1', AuctionRole.PLAYER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== addPlayer (권한/상태 패턴) ====================

  describe('addPlayer', () => {
    it('정상: PLAYER role + currentPoints=0으로 등록', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (participantsRepo.findOne as jest.Mock).mockResolvedValue(null);
      (participantsRepo.create as jest.Mock).mockImplementation((p) => p);
      (participantsRepo.save as jest.Mock).mockImplementation((p) =>
        Promise.resolve(p),
      );

      const result = (await service.addPlayer(
        'auction-1',
        'admin-1',
        'target-1',
      )) as unknown as AuctionParticipant;

      expect(result.role).toBe(AuctionRole.PLAYER);
      expect(result.currentPoints).toBe(0);
    });

    it('경매 creatorId 불일치 시 권한 거부', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());

      await expect(
        service.addPlayer('auction-1', 'not-admin', 'target-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('ONGOING 상태 경매에는 매물 추가 거부', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(
        baseAuction({ status: AuctionStatus.ONGOING }),
      );

      await expect(
        service.addPlayer('auction-1', 'admin-1', 'target-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== addGuestPlayers / addCaptain (게스트) ====================

  describe('addGuestPlayers', () => {
    it('빈 이름 목록이면 거부', async () => {
      await expect(
        service.addGuestPlayers('auction-1', 'admin-1', []),
      ).rejects.toThrow('등록할 이름 목록이 비어 있습니다');
    });

    it('배열이 아니면 거부', async () => {
      await expect(
        service.addGuestPlayers(
          'auction-1',
          'admin-1',
          '홍길동' as unknown as string[],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('이름마다 게스트 User 생성 후 PLAYER로 등록 (빈 줄 무시)', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (usersRepo.create as jest.Mock).mockImplementation((u) => u);
      (usersRepo.save as jest.Mock).mockImplementation((u) =>
        Promise.resolve({ ...u, id: `guest-id-${u.nickname}` }),
      );
      (participantsRepo.create as jest.Mock).mockImplementation((p) => p);
      (participantsRepo.save as jest.Mock).mockImplementation((p) =>
        Promise.resolve(p),
      );

      const result = (await service.addGuestPlayers('auction-1', 'admin-1', [
        '홍길동',
        '  ',
        '임꺽정',
      ])) as unknown as AuctionParticipant[];

      expect(result).toHaveLength(2);
      expect(usersRepo.save).toHaveBeenCalledTimes(2);
      expect(result[0].role).toBe(AuctionRole.PLAYER);
      expect(result[0].currentPoints).toBe(0);
    });
  });

  describe('addCaptain', () => {
    it('게스트 유저는 팀장 지정 거부', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (usersRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'guest-1',
        isGuest: true,
      });

      await expect(
        service.addCaptain('auction-1', 'admin-1', 'guest-1'),
      ).rejects.toThrow('게스트는 팀장으로 지정할 수 없습니다');
    });

    it('존재하지 않는 회원은 팀장 지정 거부', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (usersRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addCaptain('auction-1', 'admin-1', 'no-such-user'),
      ).rejects.toThrow('존재하지 않는 회원입니다');
    });

    it('실회원은 CAPTAIN + startingPoints로 등록', async () => {
      (auctionsRepo.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (usersRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'member-1',
        isGuest: false,
      });
      (participantsRepo.count as jest.Mock).mockResolvedValue(0);
      (participantsRepo.findOne as jest.Mock).mockResolvedValue(null);
      (participantsRepo.create as jest.Mock).mockImplementation((p) => p);
      (participantsRepo.save as jest.Mock).mockImplementation((p) =>
        Promise.resolve(p),
      );

      const result = (await service.addCaptain(
        'auction-1',
        'admin-1',
        'member-1',
      )) as unknown as AuctionParticipant;

      expect(result.role).toBe(AuctionRole.CAPTAIN);
      expect(result.currentPoints).toBe(1000);
    });
  });

  // ==================== start (상태 전이) ====================

  describe('start', () => {
    it('PENDING → ONGOING 전환', async () => {
      const auction = baseAuction();
      (manager.findOne as jest.Mock).mockResolvedValue(auction);
      (manager.save as jest.Mock).mockImplementation((a) => Promise.resolve(a));
      // 시작 사전 검증: 팀장 2명, 매물 1명 이상
      (manager.count as jest.Mock)
        .mockResolvedValueOnce(2) // CAPTAIN count
        .mockResolvedValueOnce(5); // PLAYER count

      const result = (await service.start(
        'auction-1',
        'admin-1',
      )) as unknown as Auction;

      expect(result.status).toBe(AuctionStatus.ONGOING);
      expect(manager.save).toHaveBeenCalled();
    });

    it('팀장이 2명 미만이면 시작 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (manager.count as jest.Mock)
        .mockResolvedValueOnce(1) // CAPTAIN count
        .mockResolvedValueOnce(5); // PLAYER count

      await expect(service.start('auction-1', 'admin-1')).rejects.toThrow(
        '팀장을 2명 이상 등록해야',
      );
    });

    it('매물이 없으면 시작 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValue(baseAuction());
      (manager.count as jest.Mock)
        .mockResolvedValueOnce(2) // CAPTAIN count
        .mockResolvedValueOnce(0); // PLAYER count

      await expect(service.start('auction-1', 'admin-1')).rejects.toThrow(
        '매물을 1명 이상 등록해야',
      );
    });

    it('creatorId 불일치 시 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValue(baseAuction());

      await expect(service.start('auction-1', 'not-admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('이미 ONGOING이면 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValue(
        baseAuction({ status: AuctionStatus.ONGOING }),
      );

      await expect(service.start('auction-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== placeBidWithValidation (핵심 비즈니스) ====================

  describe('placeBidWithValidation', () => {
    const ongoingAuction = (currentPlayer = 'player-1') =>
      baseAuction({
        status: AuctionStatus.ONGOING,
        currentBiddingPlayerId: currentPlayer,
      });

    const captain = (currentPoints = 1000): AuctionParticipant =>
      ({
        id: 'cap-1',
        userId: 'captain-1',
        auctionId: 'auction-1',
        role: AuctionRole.CAPTAIN,
        currentPoints,
        user: { id: 'captain-1', battleTag: 'CapTag#1234' },
      }) as unknown as AuctionParticipant;

    it('정상 입찰: 최소가 + 충분 잔액 → 새 bid 생성', async () => {
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(ongoingAuction()) // Auction
        .mockResolvedValueOnce(captain(1000)) // captain
        .mockResolvedValueOnce(null); // 기존 highest bid
      (manager.find as jest.Mock).mockResolvedValue([]); // active bids
      (manager.create as jest.Mock).mockImplementation((_e, p) => p);
      (manager.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.placeBidWithValidation(
        'auction-1',
        'captain-1',
        'player-1',
        100,
      );

      expect(result.bid.amount).toBe(100);
      expect(result.bidderName).toBe('CapTag#1234');
    });

    it('현재 경매 대상 선수 불일치 시 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(
        ongoingAuction('different-player'),
      );

      await expect(
        service.placeBidWithValidation(
          'auction-1',
          'captain-1',
          'player-1',
          100,
        ),
      ).rejects.toThrow('현재 입찰 대상');
    });

    it('CAPTAIN이 아니면 거부', async () => {
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(ongoingAuction())
        .mockResolvedValueOnce({
          ...captain(),
          role: AuctionRole.PLAYER,
        });

      await expect(
        service.placeBidWithValidation(
          'auction-1',
          'captain-1',
          'player-1',
          100,
        ),
      ).rejects.toThrow('캡틴만');
    });

    it('최소 입찰가 미만(현재 최고가 + 1 미만) 거부', async () => {
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(ongoingAuction())
        .mockResolvedValueOnce(captain(1000))
        .mockResolvedValueOnce({ amount: 200 } as unknown as AuctionBid);

      await expect(
        service.placeBidWithValidation(
          'auction-1',
          'captain-1',
          'player-1',
          200, // 200 < 201
        ),
      ).rejects.toThrow('최소 201P');
    });

    it('다른 선수에 commit한 active bid + 새 bid 합이 잔액 초과 시 거부', async () => {
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(ongoingAuction())
        .mockResolvedValueOnce(captain(500)) // 잔액 500
        .mockResolvedValueOnce(null);
      (manager.find as jest.Mock).mockResolvedValue([
        // 다른 선수에 300 commit
        {
          targetPlayerId: 'other-player',
          amount: 300,
        } as unknown as AuctionBid,
      ]);

      // requiredPoints = 300 + 300 = 600 > 500
      await expect(
        service.placeBidWithValidation(
          'auction-1',
          'captain-1',
          'player-1',
          300,
        ),
      ).rejects.toThrow('포인트가 부족');
    });

    it('경매가 ONGOING이 아니면 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(
        baseAuction({ status: AuctionStatus.PENDING }),
      );

      await expect(
        service.placeBidWithValidation(
          'auction-1',
          'captain-1',
          'player-1',
          100,
        ),
      ).rejects.toThrow('진행 중');
    });
  });

  // ==================== confirmCurrentBid (낙찰 + 포인트 차감) ====================

  describe('confirmCurrentBid', () => {
    it('최고가 bid 기준 player에게 captain 배정 + currentPoints 차감 + SOLD phase', async () => {
      const auction = baseAuction({
        status: AuctionStatus.ONGOING,
        currentBiddingPlayerId: 'player-1',
        biddingPhase: BiddingPhase.BIDDING,
      });
      const highestBid = {
        id: 'bid-1',
        bidderId: 'captain-1',
        targetPlayerId: 'player-1',
        amount: 500,
        isActive: true,
      } as unknown as AuctionBid;
      const player = {
        id: 'pp-1',
        userId: 'player-1',
        assignedTeamCaptainId: null,
        soldPrice: null,
      } as unknown as AuctionParticipant;
      const captainP = {
        id: 'cap-p-1',
        userId: 'captain-1',
        currentPoints: 1000,
      } as unknown as AuctionParticipant;

      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(auction) // Auction
        .mockResolvedValueOnce(highestBid) // highestBid
        .mockResolvedValueOnce(player) // player
        .mockResolvedValueOnce(captainP); // captain
      (manager.find as jest.Mock).mockResolvedValue([highestBid]); // previous bids
      (manager.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.confirmCurrentBid('auction-1', 'admin-1');

      expect(player.assignedTeamCaptainId).toBe('captain-1');
      expect(player.soldPrice).toBe(500);
      expect(captainP.currentPoints).toBe(500); // 1000 - 500
      expect(auction.biddingPhase).toBe(BiddingPhase.SOLD);
      expect(auction.currentBiddingEndTime).toBeNull();
      expect(result).toEqual({
        confirmed: true,
        playerId: 'player-1',
        captainId: 'captain-1',
        amount: 500,
      });
    });

    it('활성 입찰이 없으면 BadRequestException (유찰 안내)', async () => {
      const auction = baseAuction({
        status: AuctionStatus.ONGOING,
        currentBiddingPlayerId: 'player-1',
      });
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null); // no highest bid

      await expect(
        service.confirmCurrentBid('auction-1', 'admin-1'),
      ).rejects.toThrow('입찰 내역');
    });

    it('currentBiddingPlayerId가 없으면 멱등 no-op (confirmed:false)', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(
        baseAuction({ status: AuctionStatus.ONGOING }),
      );

      const result = await service.confirmCurrentBid('auction-1', 'admin-1');
      expect(result).toEqual({ confirmed: false });
    });

    it('이미 SOLD phase 면 멱등 no-op (중복 낙찰 방지)', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(
        baseAuction({
          status: AuctionStatus.ONGOING,
          currentBiddingPlayerId: 'player-1',
          biddingPhase: BiddingPhase.SOLD,
        }),
      );

      const result = await service.confirmCurrentBid('auction-1', 'admin-1');
      expect(result).toEqual({ confirmed: false });
    });

    it('creatorId 불일치 시 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(baseAuction());

      await expect(
        service.confirmCurrentBid('auction-1', 'not-admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== passCurrentPlayer (유찰) ====================

  describe('passCurrentPlayer', () => {
    it('현재 선수의 모든 활성 bid를 비활성화하고 currentBiddingPlayerId 초기화', async () => {
      const auction = baseAuction({
        status: AuctionStatus.ONGOING,
        currentBiddingPlayerId: 'player-1',
        currentBiddingEndTime: new Date(),
      });
      (manager.findOne as jest.Mock).mockResolvedValueOnce(auction);
      (manager.update as jest.Mock).mockResolvedValue({ affected: 2 });
      (manager.save as jest.Mock).mockImplementation((a) => Promise.resolve(a));

      const result = await service.passCurrentPlayer('auction-1', 'admin-1');

      expect(manager.update).toHaveBeenCalledWith(
        AuctionBid,
        {
          auctionId: 'auction-1',
          targetPlayerId: 'player-1',
          isActive: true,
        },
        { isActive: false },
      );
      expect(auction.currentBiddingPlayerId).toBeNull();
      expect(auction.currentBiddingEndTime).toBeNull();
      // 유찰 마크 + 다음 매물 선택 가능 상태 복귀 (BIDDING 고착 회귀 방지)
      expect(manager.update).toHaveBeenCalledWith(
        AuctionParticipant,
        { auctionId: 'auction-1', userId: 'player-1' },
        { wasUnsold: true },
      );
      expect(auction.biddingPhase).toBe(BiddingPhase.WAITING);
      expect(result).toEqual({ passed: true });
    });

    it('현재 입찰 선수 없으면 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(
        baseAuction({ status: AuctionStatus.ONGOING }),
      );

      await expect(
        service.passCurrentPlayer('auction-1', 'admin-1'),
      ).rejects.toThrow('현재 입찰');
    });
  });

  // findAll / findOne / 사용 안한 mock 변수 침묵 처리
  describe('repo wiring', () => {
    it('repositories와 bids repo가 모두 주입된다', () => {
      expect(auctionsRepo).toBeDefined();
      expect(participantsRepo).toBeDefined();
      expect(bidsRepo).toBeDefined();
    });
  });
});
