import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LedgerController } from './ledger.controller';
import { PointTx } from './entities/point-tx.entity';

describe('LedgerController', () => {
  let controller: LedgerController;
  let qb: {
    createQueryBuilder: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    groupBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    setParameter: jest.Mock;
    getRawMany: jest.Mock;
    getRawOne: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let repoMock: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    qb = {
      createQueryBuilder: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      getManyAndCount: jest.fn(),
    };
    repoMock = { createQueryBuilder: jest.fn(() => qb) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerController],
      providers: [{ provide: getRepositoryToken(PointTx), useValue: repoMock }],
    }).compile();

    controller = module.get(LedgerController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('timeseries', () => {
    it('day 버킷이 아니면 빈 배열 반환', async () => {
      const result = await controller.timeseries('week', '30');
      expect(result).toEqual([]);
      expect(repoMock.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('days 기본값 30으로 30개 row 반환 (빈 일자는 0으로 채움)', async () => {
      qb.getRawMany.mockResolvedValue([]);
      const result = await controller.timeseries('day', undefined);
      expect(result).toHaveLength(30);
      expect(result.every((r) => r.minted === '0' && r.burned === '0')).toBe(
        true,
      );
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('days 범위 clamp: 0 → 1, 999 → 90', async () => {
      qb.getRawMany.mockResolvedValue([]);
      const a = await controller.timeseries('day', '0');
      const b = await controller.timeseries('day', '999');
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(90);
    });

    it('DB 반환값을 해당 일자 버킷에 매칭', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const key = today.toISOString().slice(0, 10);
      qb.getRawMany.mockResolvedValue([
        { date: key, minted: '12000', burned: '3000' },
      ]);
      const result = await controller.timeseries('day', '7');
      const last = result[result.length - 1];
      expect(last.date).toBe(key);
      expect(last.minted).toBe('12000');
      expect(last.burned).toBe('3000');
    });
  });

  describe('summary', () => {
    it('mint - burn = circulating 계산', async () => {
      qb.getRawOne
        .mockResolvedValueOnce({ sum: '10000' })
        .mockResolvedValueOnce({ sum: '3000' });
      const result = await controller.summary();
      expect(result).toEqual({
        minted: '10000',
        burned: '3000',
        circulating: '7000',
      });
    });
  });
});
