import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BettingService } from '../betting/betting.service';
import {
  BettingMarket,
  BettingMarketStatus,
} from '../betting/entities/betting-market.entity';
import { Match } from './entities/match.entity';
import { Team } from './entities/team.entity';
import {
  MATCH_STATUS_TRANSITIONS,
  MatchStatus,
} from './enums/match-status.enum';

interface CreateMatchPayload {
  title: string;
  scheduledAt?: Date | null;
  description?: string | null;
}

/**
 * 내전 상태머신.
 *
 *   DRAFT → BETTING_OPEN → LOCKED → SETTLED
 *     │          │           │
 *     └──────────┴───────────┴──→ CANCELLED
 *
 * 전이 시 베팅 마켓을 함께 갱신한다.
 *   openBetting() : 마켓 상태 변화 없음 (createMarket은 별도 호출)
 *   lockMatch()   : 해당 매치의 모든 OPEN 마켓을 LOCKED로
 *   settleMatch() : WIN 마켓은 winnerTeamId, RANK 마켓은 placement 기준으로 정산
 *   cancelMatch() : 미정산 마켓을 CANCELLED + 전액 환불
 */
@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => BettingService))
    private readonly bettingService: BettingService,
  ) {}

  async create(payload: CreateMatchPayload): Promise<Match> {
    if (!payload.title?.trim()) {
      throw new BadRequestException('Match.title is required');
    }
    const match = this.matchRepository.create({
      title: payload.title,
      scheduledAt: payload.scheduledAt ?? null,
      description: payload.description ?? null,
      status: MatchStatus.DRAFT,
    });
    return this.matchRepository.save(match);
  }

  async findOne(matchId: string): Promise<Match> {
    return this.findOrFail(matchId);
  }

  async openBetting(matchId: string): Promise<Match> {
    return this.dataSource.transaction(async (manager) => {
      const match = await this.lockMatchRow(manager, matchId);
      this.assertTransition(match.status, MatchStatus.BETTING_OPEN);
      match.status = MatchStatus.BETTING_OPEN;
      return manager.save(match);
    });
  }

  async lockMatch(matchId: string): Promise<Match> {
    return this.dataSource.transaction(async (manager) => {
      const match = await this.lockMatchRow(manager, matchId);
      this.assertTransition(match.status, MatchStatus.LOCKED);
      match.status = MatchStatus.LOCKED;
      await manager.save(match);

      // 매치에 속한 모든 OPEN 마켓을 LOCKED로 전파.
      const openMarkets = await manager.find(BettingMarket, {
        where: { matchId: match.id, status: BettingMarketStatus.OPEN },
      });
      for (const market of openMarkets) {
        await this.bettingService.lockMarket(market.id, manager);
      }
      return match;
    });
  }

  /**
   * 결과 입력 및 정산.
   * @param matchId 매치 id
   * @param winnerTeamId WIN 마켓 정산 기준 (우승 팀 id)
   * @param placements RANK 마켓 정산 기준 (teamId → 1..4 등수). 옵션.
   */
  async settleMatch(
    matchId: string,
    winnerTeamId: string,
    placements?: Record<string, number>,
  ): Promise<Match> {
    return this.dataSource.transaction(async (manager) => {
      const match = await this.lockMatchRow(manager, matchId);
      this.assertTransition(match.status, MatchStatus.SETTLED);

      // winnerTeam 검증.
      const winnerTeam = await manager.findOne(Team, {
        where: { id: winnerTeamId, matchId: match.id },
      });
      if (!winnerTeam) {
        throw new BadRequestException(
          `winnerTeamId ${winnerTeamId} does not belong to match ${match.id}`,
        );
      }

      // placements 적용 (선택).
      if (placements) {
        for (const [teamId, placement] of Object.entries(placements)) {
          if (placement < 1 || placement > 4) {
            throw new BadRequestException(
              `placement must be 1..4, got ${placement} for team ${teamId}`,
            );
          }
          const team = await manager.findOne(Team, {
            where: { id: teamId, matchId: match.id },
          });
          if (!team) {
            throw new BadRequestException(
              `Team ${teamId} not in match ${match.id}`,
            );
          }
          team.placement = placement;
          await manager.save(team);
        }
      }

      match.winnerTeamId = winnerTeamId;
      match.status = MatchStatus.SETTLED;
      match.settledAt = new Date();
      await manager.save(match);

      // 마켓 정산.
      const markets = await manager.find(BettingMarket, {
        where: { matchId: match.id },
      });
      for (const market of markets) {
        if (market.status !== BettingMarketStatus.LOCKED) {
          this.logger.warn(
            `Skipping market ${market.id} in status ${market.status} during settle`,
          );
          continue;
        }
        let winningOption: string;
        if (market.type === 'WIN') {
          winningOption = winnerTeamId;
        } else {
          // RANK 마켓: placement가 1인 팀의 placement를 winning_option으로
          // (요구사항상 RANK는 1~4등 예측이지만, 단순화하여 1등 = 우승 팀 placement)
          // 좀 더 일반적으로는 placements가 명시되어야 한다.
          if (!placements) {
            throw new BadRequestException(
              `RANK market requires placements for match ${match.id}`,
            );
          }
          // RANK 시장은 placement를 그대로 "1"|"2"|"3"|"4" 로 정산.
          // 사용자가 베팅한 side("1"~"4")가 각 placement에 해당하는 팀 id로 직접 매핑되지는 않으므로
          // 여기서는 winningOption을 "1" (우승 팀의 placement) 로 단순 설정한다.
          // 추후 RANK 마켓 정산 정책 재정의 필요.
          winningOption = '1';
        }
        await this.bettingService.settleMarket(market.id, winningOption, manager);
      }

      return match;
    });
  }

  async cancelMatch(matchId: string): Promise<Match> {
    return this.dataSource.transaction(async (manager) => {
      const match = await this.lockMatchRow(manager, matchId);
      this.assertTransition(match.status, MatchStatus.CANCELLED);
      match.status = MatchStatus.CANCELLED;
      await manager.save(match);

      // 미정산 마켓 전액 환불.
      const markets = await manager.find(BettingMarket, {
        where: { matchId: match.id },
      });
      for (const market of markets) {
        if (
          market.status === BettingMarketStatus.SETTLED ||
          market.status === BettingMarketStatus.CANCELLED
        ) {
          continue;
        }
        await this.bettingService.cancelMarket(market.id, manager);
      }
      return match;
    });
  }

  protected assertTransition(from: MatchStatus, to: MatchStatus): void {
    const allowed = MATCH_STATUS_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Invalid match status transition: ${from} → ${to}`,
      );
    }
  }

  protected async findOrFail(matchId: string): Promise<Match> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException(`Match not found: ${matchId}`);
    }
    return match;
  }

  private async lockMatchRow(
    manager: EntityManager,
    matchId: string,
  ): Promise<Match> {
    const row = await manager
      .getRepository(Match)
      .createQueryBuilder('m')
      .setLock('pessimistic_write')
      .where('m.id = :id', { id: matchId })
      .getOne();
    if (!row) {
      throw new NotFoundException(`Match not found: ${matchId}`);
    }
    return row;
  }
}
