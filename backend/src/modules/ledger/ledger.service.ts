import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PointTx } from './entities/point-tx.entity';
import { SINK_ACCOUNT_ID } from './ledger.constants';

export interface TransferParams {
  /** null = mint (시스템 발행). 사용자 UUID 또는 SINK_ACCOUNT_ID. */
  fromAccount: string | null;
  /** null = burn (시스템 소각). 사용자 UUID 또는 SINK_ACCOUNT_ID. */
  toAccount: string | null;
  amount: bigint;
  /** POINT_TX_REASON 상수 키 권장. ad-hoc 사유 문자열도 허용. */
  reason: string;
  refType?: string;
  refId?: string;
  memo?: string;
  /** 트랜잭션 내 호출 시 외부 EntityManager 주입 (없으면 self-managed transaction). */
  manager?: EntityManager;
}

/**
 * 복식부기 원장 서비스.
 *
 * 모든 포인트 이동은 PointTx insert + 사용자 잔액 캐시(user.points_balance) 갱신을
 * 하나의 트랜잭션 + SELECT FOR UPDATE로 처리한다.
 *
 *   transfer : 사용자 → 사용자, 또는 사용자 ↔ SINK
 *   mint     : SINK → 사용자 (발행 — 시드, 출석 보상 등)
 *   burn     : 사용자 → SINK (소각 — 마켓 구매, Rake)
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(PointTx)
    private readonly pointTxRepository: Repository<PointTx>,
    private readonly dataSource: DataSource,
  ) {}

  /** SINK 계정 ID (편의 접근자). */
  get sinkAccountId(): string {
    return SINK_ACCOUNT_ID;
  }

  /**
   * 원장 이체. 잔액 캐시(user.points_balance) 갱신과 PointTx insert를 원자적으로 수행.
   *
   * - SELECT FOR UPDATE로 from/to 행 잠금 (데드락 방지 위해 작은 id부터 잠금)
   * - amount > 0 강제, 부동소수 미지원 (bigint만)
   * - from = SINK_ACCOUNT_ID 또는 null → 발행 (잔액 차감 없음, to 가산)
   * - to   = SINK_ACCOUNT_ID 또는 null → 소각 (잔액 가산 없음, from 차감)
   */
  async transfer(params: TransferParams): Promise<PointTx> {
    const amount = params.amount;

    if (amount <= 0n) {
      throw new BadRequestException(
        `LedgerService.transfer: amount must be positive, got ${amount.toString()}`,
      );
    }

    const fromIsUser = this.isRealUserAccount(params.fromAccount);
    const toIsUser = this.isRealUserAccount(params.toAccount);

    if (!fromIsUser && !toIsUser) {
      throw new BadRequestException(
        'LedgerService.transfer: at least one side must be a real user account',
      );
    }

    if (fromIsUser && toIsUser && params.fromAccount === params.toAccount) {
      throw new BadRequestException(
        'LedgerService.transfer: from/to cannot be the same user',
      );
    }

    const run = async (manager: EntityManager): Promise<PointTx> => {
      // 데드락 방지를 위해 두 행을 정렬된 순서로 잠근다.
      const ids: string[] = [];
      if (fromIsUser) ids.push(params.fromAccount as string);
      if (toIsUser) ids.push(params.toAccount as string);
      ids.sort();

      const lockedUsers = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id IN (:...ids)', { ids })
        .getMany();

      const userById = new Map<string, User>();
      for (const u of lockedUsers) {
        userById.set(u.id, u);
      }

      if (fromIsUser) {
        const fromUser = userById.get(params.fromAccount as string);
        if (!fromUser) {
          throw new BadRequestException(
            `LedgerService.transfer: from user not found: ${params.fromAccount}`,
          );
        }
        const currentFrom = BigInt(fromUser.pointsBalance ?? '0');
        if (currentFrom < amount) {
          throw new BadRequestException(
            `LedgerService.transfer: insufficient balance for ${fromUser.id} ` +
              `(have ${currentFrom.toString()}, need ${amount.toString()})`,
          );
        }
        const newFrom = currentFrom - amount;
        await manager
          .getRepository(User)
          .update({ id: fromUser.id }, { pointsBalance: newFrom.toString() });
      }

      if (toIsUser) {
        const toUser = userById.get(params.toAccount as string);
        if (!toUser) {
          throw new BadRequestException(
            `LedgerService.transfer: to user not found: ${params.toAccount}`,
          );
        }
        const currentTo = BigInt(toUser.pointsBalance ?? '0');
        const newTo = currentTo + amount;
        await manager
          .getRepository(User)
          .update({ id: toUser.id }, { pointsBalance: newTo.toString() });
      }

      const tx = manager.getRepository(PointTx).create({
        fromAccount: this.normalizeAccount(params.fromAccount),
        toAccount: this.normalizeAccount(params.toAccount),
        amount: amount.toString(),
        reason: params.reason,
        refType: params.refType ?? null,
        refId: params.refId ?? null,
        memo: params.memo ?? null,
      });

      return manager.getRepository(PointTx).save(tx);
    };

    if (params.manager) {
      return run(params.manager);
    }
    return this.dataSource.transaction(run);
  }

  /** SINK → user (발행). */
  async mint(
    toAccount: string,
    amount: bigint,
    reason: string,
    opts: Pick<TransferParams, 'refType' | 'refId' | 'memo' | 'manager'> = {},
  ): Promise<PointTx> {
    return this.transfer({
      fromAccount: SINK_ACCOUNT_ID,
      toAccount,
      amount,
      reason,
      ...opts,
    });
  }

  /** user → SINK (소각). */
  async burn(
    fromAccount: string,
    amount: bigint,
    reason: string,
    opts: Pick<TransferParams, 'refType' | 'refId' | 'memo' | 'manager'> = {},
  ): Promise<PointTx> {
    return this.transfer({
      fromAccount,
      toAccount: SINK_ACCOUNT_ID,
      amount,
      reason,
      ...opts,
    });
  }

  /** 현재 캐시된 사용자 잔액 (DB의 user.points_balance). */
  async getBalance(userId: string, manager?: EntityManager): Promise<bigint> {
    const repo = (manager ?? this.dataSource.manager).getRepository(User);
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(
        `LedgerService.getBalance: user not found: ${userId}`,
      );
    }
    return BigInt(user.pointsBalance ?? '0');
  }

  /**
   * 잔액 무결성 검증: PointTx 합 vs 캐시된 points_balance.
   * 운영 모니터링/관리자 페이지에서 사용.
   */
  async computeBalanceFromLedger(
    userId: string,
    manager?: EntityManager,
  ): Promise<bigint> {
    const repo = (manager ?? this.dataSource.manager).getRepository(PointTx);

    const inflowRow = await repo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'sum')
      .where('tx.to_account = :id', { id: userId })
      .getRawOne<{ sum: string }>();

    const outflowRow = await repo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'sum')
      .where('tx.from_account = :id', { id: userId })
      .getRawOne<{ sum: string }>();

    const inflow = BigInt(inflowRow?.sum ?? '0');
    const outflow = BigInt(outflowRow?.sum ?? '0');
    return inflow - outflow;
  }

  /** 사용자 UUID인지 (= SINK도 null도 아님) 판단. */
  private isRealUserAccount(account: string | null): boolean {
    return account !== null && account !== SINK_ACCOUNT_ID;
  }

  /** null과 SINK_ACCOUNT_ID는 모두 SINK_ACCOUNT_ID로 정규화하여 저장. */
  private normalizeAccount(account: string | null): string | null {
    if (account === null) return SINK_ACCOUNT_ID;
    return account;
  }

  // ==================== Admin Queries ====================

  async adminListTx(opts: {
    userId?: string;
    reason?: string;
    from?: string;
    to?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: PointTx[]; total: number }> {
    const qb = this.pointTxRepository
      .createQueryBuilder('tx')
      .orderBy('tx.created_at', 'DESC')
      .skip(opts.skip)
      .take(opts.take);

    if (opts.userId) {
      qb.andWhere('(tx.from_account = :uid OR tx.to_account = :uid)', {
        uid: opts.userId,
      });
    }
    if (opts.reason) {
      qb.andWhere('tx.reason = :reason', { reason: opts.reason });
    }
    if (opts.from) {
      qb.andWhere('tx.created_at >= :from', { from: new Date(opts.from) });
    }
    if (opts.to) {
      qb.andWhere('tx.created_at < :to', { to: new Date(opts.to) });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async adminDailyTimeseries(
    days: number,
  ): Promise<Array<{ date: string; minted: string; burned: string }>> {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await this.pointTxRepository
      .createQueryBuilder('tx')
      .select(
        `to_char(date_trunc('day', tx.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN tx.from_account = :sink THEN tx.amount ELSE 0 END), 0)`,
        'minted',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN tx.to_account = :sink THEN tx.amount ELSE 0 END), 0)`,
        'burned',
      )
      .where('tx.created_at >= :since', { since })
      .setParameter('sink', SINK_ACCOUNT_ID)
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; minted: string; burned: string }>();

    const byDate = new Map(rows.map((r) => [r.date, r]));
    const result: Array<{ date: string; minted: string; burned: string }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push(byDate.get(key) ?? { date: key, minted: '0', burned: '0' });
    }
    return result;
  }

  async adminSummary(): Promise<{
    minted: string;
    burned: string;
    circulating: string;
  }> {
    const mintedRow = await this.pointTxRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'sum')
      .where('tx.from_account = :sink', { sink: SINK_ACCOUNT_ID })
      .getRawOne<{ sum: string }>();
    const burnedRow = await this.pointTxRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'sum')
      .where('tx.to_account = :sink', { sink: SINK_ACCOUNT_ID })
      .getRawOne<{ sum: string }>();
    const minted = BigInt(mintedRow?.sum ?? '0');
    const burned = BigInt(burnedRow?.sum ?? '0');
    return {
      minted: minted.toString(),
      burned: burned.toString(),
      circulating: (minted - burned).toString(),
    };
  }
}
