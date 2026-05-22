import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BettingService } from './betting.service';
import {
  BettingMarket,
  BettingMarketStatus,
  BettingMarketType,
} from './entities/betting-market.entity';
import { BettingStake, BettingStakeStatus } from './entities/betting-stake.entity';
import { Match } from '../matches/entities/match.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';

/**
 * BettingService unit tests.
 *
 * 검증:
 *  - 마켓 LOCKED 후 placeStake → ForbiddenException
 *  - 패리뮤추얼 정산: payout = stake * (pool - rake) / winningPool
 *  - 정산 제로섬 + Rake = 자연 소각 (당첨자 mint 합 + Rake = totalPool)
 */
describe('BettingService (unit)', () => {
  /**
   * EntityManager mock generator. 호출별 동작은 인자 패턴에 따라 분기.
   */
  function makeManager(state: {
    market: BettingMarket;
    match: Match;
    stakes: BettingStake[];
  }) {
    const mintCalls: { userId: string; amount: bigint }[] = [];
    const manager = {
      getRepository: (entity: unknown) => ({
        createQueryBuilder: () => ({
          setLock: () => ({
            where: () => ({
              getOne: async () => {
                if (entity === BettingMarket) return state.market;
                return null;
              },
            }),
          }),
        }),
      }),
      findOne: async (entity: unknown, opts: { where: Record<string, unknown> }) => {
        if (entity === Match) return state.match;
        if (entity === BettingStake) {
          return state.stakes.find(
            (s) =>
              s.marketId === opts.where.marketId &&
              s.userId === opts.where.userId &&
              s.side === opts.where.side,
          );
        }
        return null;
      },
      find: async (entity: unknown, opts: { where: Record<string, unknown> }) => {
        if (entity === BettingStake) {
          return state.stakes.filter((s) => s.marketId === opts.where.marketId);
        }
        return [];
      },
      create: (_entity: unknown, dto: Record<string, unknown>) => ({ ...dto }),
      save: async <T>(arg: T): Promise<T> => arg,
    };
    return { manager, mintCalls };
  }

  function makeLedgerMock(mintCalls: { userId: string; amount: bigint }[]) {
    return {
      mint: jest
        .fn()
        .mockImplementation(
          async (userId: string, amount: bigint) => {
            mintCalls.push({ userId, amount });
            return {};
          },
        ),
      burn: jest.fn().mockResolvedValue({}),
    };
  }

  function makeService(
    state: ReturnType<typeof makeManager>,
    ledger: ReturnType<typeof makeLedgerMock>,
  ) {
    const dataSource = {
      transaction: async <T>(cb: (m: unknown) => Promise<T>) => cb(state.manager),
    };
    return new BettingService(
      // marketRepository
      {} as never,
      // stakeRepository
      {} as never,
      // matchRepository
      {} as never,
      dataSource as never,
      ledger as never,
    );
  }

  function makeMarket(overrides: Partial<BettingMarket> = {}): BettingMarket {
    return {
      id: 'market-1',
      matchId: 'match-1',
      type: BettingMarketType.WIN,
      status: BettingMarketStatus.OPEN,
      totalPool: '0',
      rakeBps: 500,
      winningOption: null,
      lockedAt: null,
      settledAt: null,
      ...overrides,
    } as BettingMarket;
  }

  function makeMatch(status: MatchStatus = MatchStatus.BETTING_OPEN): Match {
    return {
      id: 'match-1',
      title: 't',
      status,
      scheduledAt: null,
      winnerTeamId: null,
      settledAt: null,
      description: null,
    } as Match;
  }

  it('placeStake: LOCKED 마켓이면 ForbiddenException', async () => {
    const market = makeMarket({ status: BettingMarketStatus.LOCKED });
    const state = makeManager({
      market,
      match: makeMatch(MatchStatus.LOCKED),
      stakes: [],
    });
    const ledger = makeLedgerMock(state.mintCalls);
    const service = makeService(state, ledger);

    await expect(
      service.placeStake('market-1', 'user-1', {
        side: '11111111-1111-1111-1111-111111111111',
        amount: 100,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('placeStake: BETTING_OPEN이 아니면 ForbiddenException', async () => {
    const market = makeMarket({ status: BettingMarketStatus.OPEN });
    const state = makeManager({
      market,
      match: makeMatch(MatchStatus.DRAFT),
      stakes: [],
    });
    const ledger = makeLedgerMock(state.mintCalls);
    const service = makeService(state, ledger);

    await expect(
      service.placeStake('market-1', 'user-1', {
        side: '11111111-1111-1111-1111-111111111111',
        amount: 100,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('placeStake: amount <= 0 이면 BadRequestException', async () => {
    const state = makeManager({
      market: makeMarket(),
      match: makeMatch(),
      stakes: [],
    });
    const ledger = makeLedgerMock(state.mintCalls);
    const service = makeService(state, ledger);

    await expect(
      service.placeStake('market-1', 'user-1', { side: 'x', amount: 0 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('settleMarket: 패리뮤추얼 분배 + Rake = 제로섬 (당첨자 mint합 + Rake = totalPool)', async () => {
    // 상황: 풀 1000, 당첨측 stake 400 (A:300 + B:100), 패측 stake 600 (C:600).
    // rakeBps 500(5%) → rake 50, poolAfterRake 950.
    // A payout = floor(300 * 950 / 400) = 712
    // B payout = floor(100 * 950 / 400) = 237
    // 분배합 = 949. 1P 잔여는 자연 소각 (mint 안함).
    const SIDE_WIN = 'team-W';
    const SIDE_LOSE = 'team-L';
    const market = makeMarket({
      status: BettingMarketStatus.LOCKED,
      totalPool: '1000',
      rakeBps: 500,
    });
    const stakes: BettingStake[] = [
      {
        id: 's-A',
        marketId: 'market-1',
        userId: 'user-A',
        side: SIDE_WIN,
        stake: '300',
        payout: null,
        status: BettingStakeStatus.PLACED,
      } as BettingStake,
      {
        id: 's-B',
        marketId: 'market-1',
        userId: 'user-B',
        side: SIDE_WIN,
        stake: '100',
        payout: null,
        status: BettingStakeStatus.PLACED,
      } as BettingStake,
      {
        id: 's-C',
        marketId: 'market-1',
        userId: 'user-C',
        side: SIDE_LOSE,
        stake: '600',
        payout: null,
        status: BettingStakeStatus.PLACED,
      } as BettingStake,
    ];

    const state = makeManager({
      market,
      match: makeMatch(MatchStatus.LOCKED),
      stakes,
    });
    const ledger = makeLedgerMock(state.mintCalls);
    const service = makeService(state, ledger);

    const summary = await service.settleMarket('market-1', SIDE_WIN);

    expect(summary.totalPool).toBe(1000n);
    expect(summary.rakeAmount).toBe(50n);
    expect(summary.winningPool).toBe(400n);
    expect(summary.winnersCount).toBe(2);
    expect(summary.losersCount).toBe(1);

    // mint 호출 검증.
    expect(state.mintCalls).toHaveLength(2);
    const a = state.mintCalls.find((c) => c.userId === 'user-A');
    const b = state.mintCalls.find((c) => c.userId === 'user-B');
    expect(a?.amount).toBe(712n);
    expect(b?.amount).toBe(237n);

    // 제로섬 확인: 분배합 + (totalPool - 분배합) = totalPool
    const distributed = (a?.amount ?? 0n) + (b?.amount ?? 0n);
    expect(distributed + (summary.totalPool - distributed)).toBe(1000n);
  });

  it('settleMarket: 당첨자 0명이면 mint 없음 (전액 자연소각)', async () => {
    const market = makeMarket({
      status: BettingMarketStatus.LOCKED,
      totalPool: '500',
      rakeBps: 500,
    });
    const stakes: BettingStake[] = [
      {
        id: 's-X',
        marketId: 'market-1',
        userId: 'user-X',
        side: 'team-LOSE',
        stake: '500',
        payout: null,
        status: BettingStakeStatus.PLACED,
      } as BettingStake,
    ];

    const state = makeManager({
      market,
      match: makeMatch(MatchStatus.LOCKED),
      stakes,
    });
    const ledger = makeLedgerMock(state.mintCalls);
    const service = makeService(state, ledger);

    const summary = await service.settleMarket('market-1', 'team-WIN');

    expect(summary.winnersCount).toBe(0);
    expect(state.mintCalls).toHaveLength(0);
  });
});
