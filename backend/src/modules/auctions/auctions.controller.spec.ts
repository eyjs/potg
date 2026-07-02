import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsController } from './auctions.controller';
import { AuctionGateway } from './auction.gateway';
import { AuctionsService } from './auctions.service';
import { AuctionRole } from './entities/auction-participant.entity';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

/**
 * AuctionsController 위임 단위 테스트.
 *
 * 회귀 포인트: 모든 변이 라우트가 식별자를 바디가 아닌 req.user.userId에서
 * 도출하는지(마스터 권한 위조 차단), bid가 소켓과 동일한
 * placeBidWithValidation 경로로 위임되는지.
 */
describe('AuctionsController', () => {
  let controller: AuctionsController;
  let service: Record<string, jest.Mock>;

  const reqAs = (userId: string): AuthenticatedRequest =>
    ({ user: { userId } }) as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      join: jest.fn(),
      placeBidWithValidation: jest.fn(),
      start: jest.fn(),
      selectPlayer: jest.fn(),
      complete: jest.fn(),
      reset: jest.fn(),
      addPlayer: jest.fn(),
      addPlayers: jest.fn(),
      removeParticipant: jest.fn(),
      addCaptain: jest.fn(),
      removeCaptain: jest.fn(),
      updateAuctionSettings: jest.fn(),
      deleteAuction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuctionsController],
      providers: [
        { provide: AuctionsService, useValue: service },
        {
          provide: AuctionGateway,
          useValue: {
            broadcastRoomState: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get(AuctionsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('생성/조회', () => {
    it('create → service.create(dto, req.user.userId)', () => {
      const dto = { title: '경매' };
      service.create.mockResolvedValue({ id: 'a1' });

      void controller.create(dto as never, reqAs('user-1'));

      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    });

    it('findAll → service.findAll()', () => {
      service.findAll.mockResolvedValue([]);
      void controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });

    it('findOne → service.findOne(id)', () => {
      service.findOne.mockResolvedValue({});
      void controller.findOne('a1');
      expect(service.findOne).toHaveBeenCalledWith('a1');
    });
  });

  describe('참가/입찰', () => {
    it('join → service.join(id, userId, dto.role)', () => {
      service.join.mockResolvedValue({});

      void controller.join(
        'a1',
        { role: AuctionRole.CAPTAIN } as never,
        reqAs('user-2'),
      );

      expect(service.join).toHaveBeenCalledWith(
        'a1',
        'user-2',
        AuctionRole.CAPTAIN,
      );
    });

    it('bid → placeBidWithValidation(id, userId, targetPlayerId, amount) 위임', () => {
      service.placeBidWithValidation.mockResolvedValue({});

      void controller.bid(
        'a1',
        { targetPlayerId: 'player-1', amount: 150 } as never,
        reqAs('cap-1'),
      );

      expect(service.placeBidWithValidation).toHaveBeenCalledWith(
        'a1',
        'cap-1',
        'player-1',
        150,
      );
    });
  });

  describe('마스터 상태 전이', () => {
    it('start → service.start(id, req.user.userId)', () => {
      service.start.mockResolvedValue({});
      void controller.start('a1', reqAs('admin-1'));
      expect(service.start).toHaveBeenCalledWith('a1', 'admin-1');
    });

    it('selectPlayer → service.selectPlayer(id, userId, playerId)', () => {
      service.selectPlayer.mockResolvedValue({});
      void controller.selectPlayer('a1', 'player-1', reqAs('admin-1'));
      expect(service.selectPlayer).toHaveBeenCalledWith(
        'a1',
        'admin-1',
        'player-1',
      );
    });

    it('complete → service.complete(id, userId)', () => {
      service.complete.mockResolvedValue({});
      void controller.complete('a1', reqAs('admin-1'));
      expect(service.complete).toHaveBeenCalledWith('a1', 'admin-1');
    });

    it('reset → service.reset(id, userId)', () => {
      service.reset.mockResolvedValue({});
      void controller.reset('a1', reqAs('admin-1'));
      expect(service.reset).toHaveBeenCalledWith('a1', 'admin-1');
    });
  });

  describe('참가자/팀장 관리', () => {
    it('addPlayer → service.addPlayer(id, requesterId, targetUserId)', () => {
      service.addPlayer.mockResolvedValue({});
      void controller.addPlayer('a1', 'target-1', reqAs('admin-1'));
      expect(service.addPlayer).toHaveBeenCalledWith(
        'a1',
        'admin-1',
        'target-1',
      );
    });

    it('addPlayers → service.addPlayers(id, requesterId, userIds[])', () => {
      service.addPlayers.mockResolvedValue({});
      void controller.addPlayers('a1', ['u1', 'u2'], reqAs('admin-1'));
      expect(service.addPlayers).toHaveBeenCalledWith('a1', 'admin-1', [
        'u1',
        'u2',
      ]);
    });

    it('removeParticipant → service.removeParticipant(id, requesterId, targetUserId)', () => {
      service.removeParticipant.mockResolvedValue({});
      void controller.removeParticipant('a1', 'target-1', reqAs('admin-1'));
      expect(service.removeParticipant).toHaveBeenCalledWith(
        'a1',
        'admin-1',
        'target-1',
      );
    });

    it('addCaptain → service.addCaptain(id, requesterId, targetUserId)', () => {
      service.addCaptain.mockResolvedValue({});
      void controller.addCaptain('a1', 'cap-1', reqAs('admin-1'));
      expect(service.addCaptain).toHaveBeenCalledWith('a1', 'admin-1', 'cap-1');
    });

    it('removeCaptain → service.removeCaptain(id, requesterId, targetUserId)', () => {
      service.removeCaptain.mockResolvedValue({});
      void controller.removeCaptain('a1', 'cap-1', reqAs('admin-1'));
      expect(service.removeCaptain).toHaveBeenCalledWith(
        'a1',
        'admin-1',
        'cap-1',
      );
    });
  });

  describe('설정/삭제', () => {
    it('updateSettings → service.updateAuctionSettings(id, userId, settings)', () => {
      service.updateAuctionSettings.mockResolvedValue({});
      const settings = { teamCount: 4, turnTimeLimit: 45 };

      void controller.updateSettings('a1', settings, reqAs('admin-1'));

      expect(service.updateAuctionSettings).toHaveBeenCalledWith(
        'a1',
        'admin-1',
        settings,
      );
    });

    it('deleteAuction → service.deleteAuction(id, userId)', () => {
      service.deleteAuction.mockResolvedValue({});
      void controller.deleteAuction('a1', reqAs('admin-1'));
      expect(service.deleteAuction).toHaveBeenCalledWith('a1', 'admin-1');
    });
  });
});
