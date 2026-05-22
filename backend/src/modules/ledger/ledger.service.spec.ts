import { BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { SINK_ACCOUNT_ID } from './ledger.constants';
import { PointTx } from './entities/point-tx.entity';
import { User } from '../users/entities/user.entity';

/**
 * LedgerService unit tests (mock DataSource).
 *
 * 검증:
 *  - transfer: amount > 0 강제
 *  - transfer: 사용자→사용자 잔액 이동
 *  - transfer: 잔액 부족 시 BadRequestException
 *  - mint: SINK → user (잔액 가산)
 *  - burn: user → SINK (잔액 차감)
 *  - transfer: from = to 동일 사용자면 거부
 *  - SELECT FOR UPDATE: 정렬된 id 순서로 잠금 (데드락 회피)
 */
describe('LedgerService (unit)', () => {
  function makeService(users: Map<string, User>) {
    const txInsertions: Partial<PointTx>[] = [];
    const lockedOrders: string[][] = [];

    const userRepoBuilder = {
      setLock: () => userRepoBuilder,
      where: (_: string, params: { ids: string[] }) => {
        lockedOrders.push([...params.ids]);
        return userRepoBuilder;
      },
      getMany: async () =>
        Array.from(users.values()).filter((u) =>
          lockedOrders[lockedOrders.length - 1]?.includes(u.id),
        ),
    };

    const pointTxRepo = {
      create: (dto: Partial<PointTx>) => dto as PointTx,
      save: async (entity: Partial<PointTx>) => {
        txInsertions.push(entity);
        return entity as PointTx;
      },
    };

    const userRepo = {
      createQueryBuilder: () => userRepoBuilder,
      update: async (where: { id: string }, set: { pointsBalance: string }) => {
        const u = users.get(where.id);
        if (u) u.pointsBalance = set.pointsBalance;
        return { affected: 1 };
      },
      findOne: async (opts: { where: { id: string } }) =>
        users.get(opts.where.id) ?? null,
    };

    const manager = {
      getRepository: (entity: unknown) =>
        entity === User ? userRepo : pointTxRepo,
    };

    const dataSource = {
      transaction: async <T>(cb: (m: unknown) => Promise<T>) => cb(manager),
      manager: { getRepository: () => userRepo },
    };

    const service = new LedgerService(
      pointTxRepo as never,
      dataSource as never,
    );
    return { service, txInsertions, lockedOrders, users };
  }

  function makeUser(id: string, balance: bigint): User {
    return {
      id,
      pointsBalance: balance.toString(),
    } as User;
  }

  it('transfer: amount must be positive', async () => {
    const { service } = makeService(new Map());
    await expect(
      service.transfer({
        fromAccount: 'user-A',
        toAccount: 'user-B',
        amount: 0n,
        reason: 'TEST',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('transfer: 사용자→사용자 잔액 이동', async () => {
    const users = new Map<string, User>([
      ['a', makeUser('a', 1000n)],
      ['b', makeUser('b', 500n)],
    ]);
    const { service } = makeService(users);

    await service.transfer({
      fromAccount: 'a',
      toAccount: 'b',
      amount: 300n,
      reason: 'TEST',
    });

    expect(users.get('a')?.pointsBalance).toBe('700');
    expect(users.get('b')?.pointsBalance).toBe('800');
  });

  it('transfer: 잔액 부족 시 BadRequestException', async () => {
    const users = new Map<string, User>([
      ['a', makeUser('a', 100n)],
      ['b', makeUser('b', 0n)],
    ]);
    const { service } = makeService(users);

    await expect(
      service.transfer({
        fromAccount: 'a',
        toAccount: 'b',
        amount: 500n,
        reason: 'TEST',
      }),
    ).rejects.toThrow(BadRequestException);
    // 잔액 변화 없어야 함.
    expect(users.get('a')?.pointsBalance).toBe('100');
  });

  it('transfer: 동일 사용자에 보내면 거부', async () => {
    const { service } = makeService(new Map());
    await expect(
      service.transfer({
        fromAccount: 'a',
        toAccount: 'a',
        amount: 100n,
        reason: 'TEST',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('mint: SINK → user (잔액 가산)', async () => {
    const users = new Map<string, User>([['u', makeUser('u', 0n)]]);
    const { service, txInsertions } = makeService(users);

    await service.mint('u', 1000n, 'SEED');

    expect(users.get('u')?.pointsBalance).toBe('1000');
    expect(txInsertions[0].fromAccount).toBe(SINK_ACCOUNT_ID);
    expect(txInsertions[0].toAccount).toBe('u');
    expect(txInsertions[0].amount).toBe('1000');
  });

  it('burn: user → SINK (잔액 차감)', async () => {
    const users = new Map<string, User>([['u', makeUser('u', 1000n)]]);
    const { service, txInsertions } = makeService(users);

    await service.burn('u', 200n, 'MARKET_BUY');

    expect(users.get('u')?.pointsBalance).toBe('800');
    expect(txInsertions[0].fromAccount).toBe('u');
    expect(txInsertions[0].toAccount).toBe(SINK_ACCOUNT_ID);
  });

  it('데드락 회피: 작은 id부터 잠금', async () => {
    const users = new Map<string, User>([
      ['b-id', makeUser('b-id', 500n)],
      ['a-id', makeUser('a-id', 500n)],
    ]);
    const { service, lockedOrders } = makeService(users);

    await service.transfer({
      fromAccount: 'b-id',
      toAccount: 'a-id',
      amount: 100n,
      reason: 'TEST',
    });

    // 정렬된 id 배열로 잠금.
    const lastLock = lockedOrders[lockedOrders.length - 1];
    expect(lastLock).toEqual(['a-id', 'b-id']);
  });
});
