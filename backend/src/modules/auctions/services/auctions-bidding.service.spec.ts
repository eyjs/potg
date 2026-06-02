import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuctionsBiddingService } from './auctions-bidding.service';
import {
  Auction,
  AuctionStatus,
  BiddingPhase,
} from '../entities/auction.entity';
import {
  AuctionParticipant,
  AuctionRole,
} from '../entities/auction-participant.entity';
import { AuctionBid } from '../entities/auction-bid.entity';

/**
 * AuctionsBiddingService 단위 테스트.
 *
 * facade(AuctionsService) 스펙이 placeBid/confirm/pass를 간접 커버하므로,
 * 여기서는 facade 미커버 분기인 selectPlayer / autoConfirmOnTimeout /
 * checkAutoConfirm(경쟁자 잔액 판정) 에 집중한다.
 */
describe('AuctionsBiddingService', () => {
  let service: AuctionsBiddingService;
  let manager: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'find' | 'save' | 'update'>
  >;
  let auctionsRepo: { findOne: jest.Mock };

  const baseAuction = (overrides: Partial<Auction> = {}): Auction =>
    ({
      id: 'auction-1',
      status: AuctionStatus.ONGOING,
      biddingPhase: BiddingPhase.BIDDING,
      turnTimeLimit: 30,
      currentBiddingPlayerId: 'player-1',
      currentBiddingEndTime: null,
      creatorId: 'admin-1',
      ...overrides,
    }) as unknown as Auction;

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<typeof manager>;

    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
        Promise.resolve(cb(manager)),
      ),
    };

    auctionsRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsBiddingService,
        { provide: getRepositoryToken(Auction), useValue: auctionsRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AuctionsBiddingService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== selectPlayer ====================

  describe('selectPlayer', () => {
    it('정상: currentBiddingPlayerId 설정 + BIDDING phase + 마감시각 부여', async () => {
      const auction = baseAuction({
        currentBiddingPlayerId: null,
        biddingPhase: BiddingPhase.WAITING,
      });
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(auction) // 잠금 경매
        .mockResolvedValueOnce({
          userId: 'player-1',
          role: AuctionRole.PLAYER,
          assignedTeamCaptainId: null,
        });
      (manager.save as jest.Mock).mockImplementation((a) => Promise.resolve(a));

      const result = await service.selectPlayer(
        'auction-1',
        'admin-1',
        'player-1',
      );

      expect(result.currentBiddingPlayerId).toBe('player-1');
      expect(result.biddingPhase).toBe(BiddingPhase.BIDDING);
      expect(result.currentBiddingEndTime).toBeInstanceOf(Date);
    });

    it('creator가 아니면 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(baseAuction());

      await expect(
        service.selectPlayer('auction-1', 'not-admin', 'player-1'),
      ).rejects.toThrow('Only creator');
    });

    it('경매가 ONGOING이 아니면 거부', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(
        baseAuction({ status: AuctionStatus.PENDING }),
      );

      await expect(
        service.selectPlayer('auction-1', 'admin-1', 'player-1'),
      ).rejects.toThrow('not ongoing');
    });

    it('선수 미존재 시 거부', async () => {
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(baseAuction())
        .mockResolvedValueOnce(null);

      await expect(
        service.selectPlayer('auction-1', 'admin-1', 'missing'),
      ).rejects.toThrow('선수를 찾을 수 없습니다.');
    });

    it('이미 배정된 선수면 거부', async () => {
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(baseAuction())
        .mockResolvedValueOnce({
          userId: 'player-1',
          role: AuctionRole.PLAYER,
          assignedTeamCaptainId: 'captain-9',
        });

      await expect(
        service.selectPlayer('auction-1', 'admin-1', 'player-1'),
      ).rejects.toThrow('이미 팀에 배정된');
    });
  });

  // ==================== autoConfirmOnTimeout ====================

  describe('autoConfirmOnTimeout', () => {
    const highestBid = {
      id: 'bid-1',
      bidderId: 'captain-1',
      targetPlayerId: 'player-1',
      amount: 300,
      isActive: true,
    } as unknown as AuctionBid;

    it('최고가 입찰 자동 낙찰 + 캡틴 포인트 차감', async () => {
      const auction = baseAuction();
      const player = {
        userId: 'player-1',
        assignedTeamCaptainId: null,
        soldPrice: null,
      } as unknown as AuctionParticipant;
      const captain = {
        userId: 'captain-1',
        currentPoints: 1000,
      } as unknown as AuctionParticipant;

      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(auction) // 잠금 경매
        .mockResolvedValueOnce(highestBid) // 최고가
        .mockResolvedValueOnce(player) // 선수
        .mockResolvedValueOnce(captain); // 캡틴
      (manager.save as jest.Mock).mockImplementation((x) => Promise.resolve(x));

      const result = await service.autoConfirmOnTimeout('auction-1');

      expect(player.assignedTeamCaptainId).toBe('captain-1');
      expect(player.soldPrice).toBe(300);
      expect(captain.currentPoints).toBe(700);
      expect(auction.currentBiddingPlayerId).toBeNull();
      expect(result).toEqual({
        confirmed: true,
        playerId: 'player-1',
        captainId: 'captain-1',
        amount: 300,
      });
    });

    it('입찰 없으면 유찰 처리(confirmed:false) + 현재 선수 초기화', async () => {
      const auction = baseAuction();
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(auction)
        .mockResolvedValueOnce(null); // no bid
      (manager.save as jest.Mock).mockImplementation((x) => Promise.resolve(x));

      const result = await service.autoConfirmOnTimeout('auction-1');

      expect(result).toEqual({ confirmed: false });
      expect(auction.currentBiddingPlayerId).toBeNull();
    });

    it('이미 SOLD면 멱등 no-op (중복 차감 방지)', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(
        baseAuction({ biddingPhase: BiddingPhase.SOLD }),
      );

      const result = await service.autoConfirmOnTimeout('auction-1');
      expect(result).toEqual({ confirmed: false });
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('경매 미존재 시 no-op', async () => {
      (manager.findOne as jest.Mock).mockResolvedValueOnce(null);
      const result = await service.autoConfirmOnTimeout('auction-1');
      expect(result).toEqual({ confirmed: false });
    });

    it('이미 배정된 선수면 no-op', async () => {
      (manager.findOne as jest.Mock)
        .mockResolvedValueOnce(baseAuction())
        .mockResolvedValueOnce(highestBid)
        .mockResolvedValueOnce({
          userId: 'player-1',
          assignedTeamCaptainId: 'captain-2',
        });

      const result = await service.autoConfirmOnTimeout('auction-1');
      expect(result).toEqual({ confirmed: false });
    });
  });

  // ==================== checkAutoConfirm ====================

  describe('checkAutoConfirm', () => {
    const withData = (
      participants: Partial<AuctionParticipant>[],
      bids: Partial<AuctionBid>[],
      auctionOverrides: Partial<Auction> = {},
    ) => {
      auctionsRepo.findOne.mockResolvedValue(
        baseAuction({
          ...auctionOverrides,
          participants: participants as AuctionParticipant[],
          bids: bids as AuctionBid[],
        } as Partial<Auction>),
      );
    };

    it('경매가 진행 중이 아니면 false', async () => {
      auctionsRepo.findOne.mockResolvedValue(
        baseAuction({ status: AuctionStatus.PENDING }),
      );
      expect(await service.checkAutoConfirm('auction-1')).toEqual({
        shouldAutoConfirm: false,
      });
    });

    it('현재 선수에 활성 입찰이 없으면 false', async () => {
      withData(
        [
          {
            userId: 'captain-1',
            role: AuctionRole.CAPTAIN,
            currentPoints: 500,
          },
        ],
        [],
      );
      expect(await service.checkAutoConfirm('auction-1')).toEqual({
        shouldAutoConfirm: false,
      });
    });

    it('경쟁 캡틴이 한 명도 없으면 자동 낙찰', async () => {
      withData(
        [
          {
            userId: 'captain-1',
            role: AuctionRole.CAPTAIN,
            currentPoints: 500,
          },
        ],
        [
          {
            bidderId: 'captain-1',
            targetPlayerId: 'player-1',
            amount: 100,
            isActive: true,
          },
        ],
      );

      const result = await service.checkAutoConfirm('auction-1');
      expect(result.shouldAutoConfirm).toBe(true);
      expect(result.reason).toContain('경쟁자 없음');
    });

    it('모든 경쟁자가 다음 최소가를 못 내면 자동 낙찰', async () => {
      // 최고가 100 → 최소 다음가 101. 경쟁자 가용 100 < 101.
      withData(
        [
          {
            userId: 'captain-1',
            role: AuctionRole.CAPTAIN,
            currentPoints: 500,
          },
          {
            userId: 'captain-2',
            role: AuctionRole.CAPTAIN,
            currentPoints: 100,
          },
        ],
        [
          {
            bidderId: 'captain-1',
            targetPlayerId: 'player-1',
            amount: 100,
            isActive: true,
          },
        ],
      );

      const result = await service.checkAutoConfirm('auction-1');
      expect(result.shouldAutoConfirm).toBe(true);
      expect(result.reason).toContain('포인트 부족');
    });

    it('경쟁자가 더 입찰 가능하면 자동 낙찰 안 함', async () => {
      withData(
        [
          {
            userId: 'captain-1',
            role: AuctionRole.CAPTAIN,
            currentPoints: 500,
          },
          {
            userId: 'captain-2',
            role: AuctionRole.CAPTAIN,
            currentPoints: 500,
          },
        ],
        [
          {
            bidderId: 'captain-1',
            targetPlayerId: 'player-1',
            amount: 100,
            isActive: true,
          },
        ],
      );

      expect(await service.checkAutoConfirm('auction-1')).toEqual({
        shouldAutoConfirm: false,
      });
    });

    it('경쟁자가 다른 선수에 묶인 포인트로 가용 부족하면 자동 낙찰', async () => {
      // captain-2: 잔액 200, 다른 선수에 150 commit → 가용 50 < 101
      withData(
        [
          {
            userId: 'captain-1',
            role: AuctionRole.CAPTAIN,
            currentPoints: 500,
          },
          {
            userId: 'captain-2',
            role: AuctionRole.CAPTAIN,
            currentPoints: 200,
          },
        ],
        [
          {
            bidderId: 'captain-1',
            targetPlayerId: 'player-1',
            amount: 100,
            isActive: true,
          },
          {
            bidderId: 'captain-2',
            targetPlayerId: 'other-player',
            amount: 150,
            isActive: true,
          },
        ],
      );

      const result = await service.checkAutoConfirm('auction-1');
      expect(result.shouldAutoConfirm).toBe(true);
    });
  });
});
