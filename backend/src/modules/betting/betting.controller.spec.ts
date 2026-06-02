import { Test, TestingModule } from '@nestjs/testing';
import { BettingController } from './betting.controller';
import { BettingService } from './betting.service';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

/**
 * BettingController 위임 단위 테스트.
 *
 * 컨트롤러는 얇은 어댑터 — 검증/트랜잭션은 service가 담당.
 * 핵심 회귀 포인트: 사용자 식별자를 req.user.userId에서 도출(바디 위조 차단)하는지,
 * 라우트가 올바른 service 메서드/인자에 매핑되는지.
 */
describe('BettingController', () => {
  let controller: BettingController;
  let service: {
    createMarket: jest.Mock;
    lockMarket: jest.Mock;
    settleMarket: jest.Mock;
    cancelMarket: jest.Mock;
    placeStake: jest.Mock;
    findMarketsByMatch: jest.Mock;
    findMarketById: jest.Mock;
    findMyStakes: jest.Mock;
    findStakesByMarket: jest.Mock;
  };

  const reqAs = (userId: string): AuthenticatedRequest =>
    ({ user: { userId } }) as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    service = {
      createMarket: jest.fn(),
      lockMarket: jest.fn(),
      settleMarket: jest.fn(),
      cancelMarket: jest.fn(),
      placeStake: jest.fn(),
      findMarketsByMatch: jest.fn(),
      findMarketById: jest.fn(),
      findMyStakes: jest.fn(),
      findStakesByMarket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BettingController],
      providers: [{ provide: BettingService, useValue: service }],
    }).compile();

    controller = module.get(BettingController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('관리자 마켓 관리', () => {
    it('createMarket → service.createMarket(dto) 위임', () => {
      const dto = { matchId: 'm1', title: '승자', options: ['1', '2'] };
      service.createMarket.mockResolvedValue({ id: 'mk1' });

      void controller.createMarket(dto as never);

      expect(service.createMarket).toHaveBeenCalledWith(dto);
    });

    it('lockMarket → service.lockMarket(id)', () => {
      service.lockMarket.mockResolvedValue({});
      void controller.lockMarket('mk1');
      expect(service.lockMarket).toHaveBeenCalledWith('mk1');
    });

    it('settleMarket → service.settleMarket(id, dto.winningOption)', () => {
      service.settleMarket.mockResolvedValue({});

      void controller.settleMarket('mk1', { winningOption: '1' } as never);

      expect(service.settleMarket).toHaveBeenCalledWith('mk1', '1');
    });

    it('cancelMarket → service.cancelMarket(id)', () => {
      service.cancelMarket.mockResolvedValue({});
      void controller.cancelMarket('mk1');
      expect(service.cancelMarket).toHaveBeenCalledWith('mk1');
    });
  });

  describe('placeStake (사용자)', () => {
    it('바디가 아닌 req.user.userId를 staker로 전달', () => {
      const dto = { side: '1', amount: 100 };
      service.placeStake.mockResolvedValue({ id: 'st1' });

      void controller.placeStake('mk1', dto as never, reqAs('user-9'));

      expect(service.placeStake).toHaveBeenCalledWith('mk1', 'user-9', dto);
    });
  });

  describe('조회', () => {
    it('findMarketsByMatch → service.findMarketsByMatch(matchId)', () => {
      service.findMarketsByMatch.mockResolvedValue([]);
      void controller.findMarketsByMatch('match-1');
      expect(service.findMarketsByMatch).toHaveBeenCalledWith('match-1');
    });

    it('findMarket → service.findMarketById(id)', () => {
      service.findMarketById.mockResolvedValue({});
      void controller.findMarket('mk1');
      expect(service.findMarketById).toHaveBeenCalledWith('mk1');
    });

    it('findMyStakes → service.findMyStakes(req.user.userId)', () => {
      service.findMyStakes.mockResolvedValue([]);
      void controller.findMyStakes(reqAs('user-9'));
      expect(service.findMyStakes).toHaveBeenCalledWith('user-9');
    });

    it('findStakesByMarket → service.findStakesByMarket(id)', () => {
      service.findStakesByMarket.mockResolvedValue([]);
      void controller.findStakesByMarket('mk1');
      expect(service.findStakesByMarket).toHaveBeenCalledWith('mk1');
    });
  });
});
