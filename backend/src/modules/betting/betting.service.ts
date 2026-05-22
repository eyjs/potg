import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { LedgerService } from '../ledger/ledger.service';
import { POINT_TX_REASON } from '../ledger/ledger.constants';
import { Match } from '../matches/entities/match.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';
import {
  BettingMarket,
  BettingMarketStatus,
  BettingMarketType,
} from './entities/betting-market.entity';
import { BettingStake, BettingStakeStatus } from './entities/betting-stake.entity';
import { CreateMarketDto, PlaceStakeDto } from './dto/betting.dto';

export interface SettleSummary {
  marketId: string;
  totalPool: bigint;
  rakeAmount: bigint;
  winningPool: bigint;
  winnersCount: number;
  losersCount: number;
  payoutDistributed: bigint;
}

/**
 * 패리뮤추얼 베팅 서비스.
 *
 *   payout(user) = floor(stake_user * (total_pool - rake) / sum_of_winning_stakes)
 *   rake_amount  = floor(total_pool * rakeBps / 10000)  → LedgerService.burn(SINK)
 *   분배 잔여(round-off)는 SINK로 추가 소각.
 *
 * 가드:
 *   - placeStake : 마켓 status === OPEN AND match status === BETTING_OPEN
 *   - settle     : 마켓 status === LOCKED AND match status === LOCKED (또는 SETTLED)
 */
@Injectable()
export class BettingService {
  private readonly logger = new Logger(BettingService.name);

  constructor(
    @InjectRepository(BettingMarket)
    private readonly marketRepository: Repository<BettingMarket>,
    @InjectRepository(BettingStake)
    private readonly stakeRepository: Repository<BettingStake>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly dataSource: DataSource,
    private readonly ledger: LedgerService,
  ) {}

  // ==================== 마켓 ====================

  async createMarket(dto: CreateMarketDto): Promise<BettingMarket> {
    const match = await this.matchRepository.findOne({ where: { id: dto.matchId } });
    if (!match) throw new NotFoundException(`Match not found: ${dto.matchId}`);

    const existing = await this.marketRepository.findOne({
      where: { matchId: dto.matchId, type: dto.type },
    });
    if (existing) {
      throw new BadRequestException(
        `Market already exists for match ${dto.matchId} type ${dto.type}`,
      );
    }

    const market = this.marketRepository.create({
      matchId: dto.matchId,
      type: dto.type,
      status: BettingMarketStatus.OPEN,
      totalPool: '0',
      rakeBps: dto.rakeBps ?? 500,
    });
    return this.marketRepository.save(market);
  }

  async findMarketsByMatch(matchId: string): Promise<BettingMarket[]> {
    return this.marketRepository.find({ where: { matchId } });
  }

  async findMarketById(marketId: string): Promise<BettingMarket> {
    const market = await this.marketRepository.findOne({ where: { id: marketId } });
    if (!market) throw new NotFoundException(`Market not found: ${marketId}`);
    return market;
  }

  // ==================== 베팅 ====================

  /**
   * 베팅 참여. 동일 (market, user, side) 조합이 있으면 stake 합산.
   * 다른 side로 베팅하려면 별도 row 생성.
   */
  async placeStake(
    marketId: string,
    userId: string,
    dto: PlaceStakeDto,
  ): Promise<BettingStake> {
    if (!Number.isInteger(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('amount must be a positive integer');
    }
    const amount = BigInt(dto.amount);

    return this.dataSource.transaction(async (manager) => {
      const market = await this.lockMarketRow(manager, marketId);
      const match = await manager.findOne(Match, { where: { id: market.matchId } });
      if (!match) throw new NotFoundException(`Match not found: ${market.matchId}`);

      // 마켓 + 매치 둘 다 OPEN/BETTING_OPEN 이어야 함.
      this.assertOpenForStaking(market, match);

      // 옵션 유효성: WIN은 teamId(uuid 형태), RANK는 1~4 (사용 단계에서 단순 검증)
      this.validateSide(market.type, dto.side);

      // 사용자 → SINK (스테이크 잠금). 추적용으로는 BettingStake row 보유.
      // 잔액에서 즉시 차감 (LedgerService.burn은 사용자→SINK 이체).
      await this.ledger.burn(userId, amount, POINT_TX_REASON.BET_STAKE, {
        refType: 'BettingMarket',
        refId: market.id,
        memo: `side=${dto.side}`,
        manager,
      });

      // 기존 row 합산 또는 신규 생성.
      const existing = await manager.findOne(BettingStake, {
        where: { marketId: market.id, userId, side: dto.side },
      });

      let stakeRow: BettingStake;
      if (existing) {
        const current = BigInt(existing.stake);
        existing.stake = (current + amount).toString();
        stakeRow = await manager.save(existing);
      } else {
        const created = manager.create(BettingStake, {
          marketId: market.id,
          userId,
          side: dto.side,
          stake: amount.toString(),
          status: BettingStakeStatus.PLACED,
        });
        stakeRow = await manager.save(created);
      }

      // 마켓 totalPool 갱신.
      const newTotal = BigInt(market.totalPool) + amount;
      market.totalPool = newTotal.toString();
      await manager.save(market);

      return stakeRow;
    });
  }

  /**
   * 마켓 LOCK (베팅 마감). MatchService.lockMatch가 호출.
   */
  async lockMarket(
    marketId: string,
    manager?: EntityManager,
  ): Promise<BettingMarket> {
    const run = async (m: EntityManager): Promise<BettingMarket> => {
      const market = await this.lockMarketRow(m, marketId);
      if (market.status === BettingMarketStatus.LOCKED) return market;
      if (market.status !== BettingMarketStatus.OPEN) {
        throw new BadRequestException(
          `Cannot lock market in status ${market.status}`,
        );
      }
      market.status = BettingMarketStatus.LOCKED;
      market.lockedAt = new Date();
      return m.save(market);
    };
    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /**
   * 패리뮤추얼 정산.
   *
   *   payout_i = floor(stake_i * pool_after_rake / sum_winning_stakes)
   *   rake     = floor(total_pool * rakeBps / 10000) → SINK 소각
   *   잔여(분배 후 남은 1P 단위)는 SINK 추가 소각.
   *
   * 당첨자가 0명이면: pool 전체를 SINK로 burn (Rake와 동일 처리, 합쳐서 처리).
   */
  async settleMarket(
    marketId: string,
    winningOption: string,
    manager?: EntityManager,
  ): Promise<SettleSummary> {
    const run = async (m: EntityManager): Promise<SettleSummary> => {
      const market = await this.lockMarketRow(m, marketId);
      if (market.status === BettingMarketStatus.SETTLED) {
        throw new BadRequestException('Market already settled');
      }
      if (market.status !== BettingMarketStatus.LOCKED) {
        throw new BadRequestException(
          `Cannot settle market in status ${market.status} (must be LOCKED)`,
        );
      }

      const totalPool = BigInt(market.totalPool);
      const rakeBps = BigInt(market.rakeBps);
      const rakeAmount = (totalPool * rakeBps) / 10000n;
      const poolAfterRake = totalPool - rakeAmount;

      const stakes = await m.find(BettingStake, { where: { marketId: market.id } });

      const winners = stakes.filter((s) => s.side === winningOption);
      const winningPool = winners.reduce(
        (acc, s) => acc + BigInt(s.stake),
        0n,
      );

      let payoutDistributed = 0n;

      if (winners.length === 0 || winningPool === 0n) {
        // 전원 패. 풀 전체(rake 포함)는 이미 burn 상태(스테이크 시 burn함).
        // 추가 처리 없음. 모든 스테이크를 LOST로 마킹.
        for (const stake of stakes) {
          stake.status = BettingStakeStatus.LOST;
          stake.payout = '0';
          await m.save(stake);
        }
      } else {
        // 당첨자 payout 분배.
        for (const stake of stakes) {
          if (stake.side === winningOption) {
            const stakeAmt = BigInt(stake.stake);
            const payout = (stakeAmt * poolAfterRake) / winningPool;
            stake.status = BettingStakeStatus.WON;
            stake.payout = payout.toString();
            await m.save(stake);

            if (payout > 0n) {
              await this.ledger.mint(
                stake.userId,
                payout,
                POINT_TX_REASON.BET_PAYOUT,
                {
                  refType: 'BettingMarket',
                  refId: market.id,
                  memo: `side=${stake.side}`,
                  manager: m,
                },
              );
              payoutDistributed += payout;
            }
          } else {
            stake.status = BettingStakeStatus.LOST;
            stake.payout = '0';
            await m.save(stake);
          }
        }

        // 분배 잔여 = poolAfterRake - payoutDistributed → SINK로 소각 처리는 불필요
        // (스테이크 시점에 이미 SINK로 burn 되어 있으므로, mint 안 한 차액은 자연 소각).
      }

      // Rake 자체도 동일하게 자연 소각 (이미 burn 상태에서 mint 안 함).
      // 별도 PointTx 기록을 원하면 여기서 SINK→SINK 가짜 tx도 가능하지만 무의미.

      market.status = BettingMarketStatus.SETTLED;
      market.winningOption = winningOption;
      market.settledAt = new Date();
      await m.save(market);

      return {
        marketId: market.id,
        totalPool,
        rakeAmount,
        winningPool,
        winnersCount: winners.length,
        losersCount: stakes.length - winners.length,
        payoutDistributed,
      };
    };
    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /**
   * 마켓 취소 (전액 환불). MATCH가 CANCELLED 될 때 호출.
   */
  async cancelMarket(
    marketId: string,
    manager?: EntityManager,
  ): Promise<{ marketId: string; refunded: bigint; stakesCount: number }> {
    const run = async (
      m: EntityManager,
    ): Promise<{ marketId: string; refunded: bigint; stakesCount: number }> => {
      const market = await this.lockMarketRow(m, marketId);
      if (market.status === BettingMarketStatus.CANCELLED) {
        return { marketId: market.id, refunded: 0n, stakesCount: 0 };
      }
      if (market.status === BettingMarketStatus.SETTLED) {
        throw new BadRequestException('Cannot cancel a settled market');
      }

      const stakes = await m.find(BettingStake, { where: { marketId: market.id } });
      let refunded = 0n;
      for (const stake of stakes) {
        if (stake.status !== BettingStakeStatus.PLACED) continue;
        const amount = BigInt(stake.stake);
        if (amount > 0n) {
          await this.ledger.mint(stake.userId, amount, POINT_TX_REASON.BET_PAYOUT, {
            refType: 'BettingMarket',
            refId: market.id,
            memo: 'refund:cancel',
            manager: m,
          });
          refunded += amount;
        }
        stake.status = BettingStakeStatus.REFUNDED;
        stake.payout = amount.toString();
        await m.save(stake);
      }

      market.status = BettingMarketStatus.CANCELLED;
      market.settledAt = new Date();
      await m.save(market);
      return { marketId: market.id, refunded, stakesCount: stakes.length };
    };
    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  // ==================== 조회 ====================

  async findMyStakes(userId: string): Promise<BettingStake[]> {
    return this.stakeRepository.find({
      where: { userId },
      relations: ['market'],
      order: { createdAt: 'DESC' },
    });
  }

  async findStakesByMarket(marketId: string): Promise<BettingStake[]> {
    return this.stakeRepository.find({
      where: { marketId },
      order: { createdAt: 'ASC' },
    });
  }

  // ==================== 내부 유틸 ====================

  private async lockMarketRow(
    manager: EntityManager,
    marketId: string,
  ): Promise<BettingMarket> {
    const market = await manager
      .getRepository(BettingMarket)
      .createQueryBuilder('m')
      .setLock('pessimistic_write')
      .where('m.id = :id', { id: marketId })
      .getOne();
    if (!market) {
      throw new NotFoundException(`Market not found: ${marketId}`);
    }
    return market;
  }

  private assertOpenForStaking(market: BettingMarket, match: Match): void {
    if (market.status !== BettingMarketStatus.OPEN) {
      throw new ForbiddenException(
        `Betting closed: market.status=${market.status}`,
      );
    }
    if (match.status !== MatchStatus.BETTING_OPEN) {
      throw new ForbiddenException(
        `Betting closed: match.status=${match.status}`,
      );
    }
  }

  private validateSide(type: BettingMarketType, side: string): void {
    if (type === BettingMarketType.WIN) {
      // teamId는 uuid v4 형태. 간단 검증.
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(side)) {
        throw new BadRequestException(`WIN market side must be a team UUID`);
      }
    } else if (type === BettingMarketType.RANK) {
      if (!['1', '2', '3', '4'].includes(side)) {
        throw new BadRequestException(`RANK market side must be one of 1,2,3,4`);
      }
    }
  }
}
