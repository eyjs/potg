import { Test, TestingModule } from '@nestjs/testing';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

describe('LedgerController', () => {
  let controller: LedgerController;
  let ledger: jest.Mocked<
    Pick<LedgerService, 'adminListTx' | 'adminDailyTimeseries' | 'adminSummary'>
  >;

  beforeEach(async () => {
    const mockLedger = {
      adminListTx: jest.fn(),
      adminDailyTimeseries: jest.fn(),
      adminSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerController],
      providers: [{ provide: LedgerService, useValue: mockLedger }],
    }).compile();

    controller = module.get(LedgerController);
    ledger = module.get(LedgerService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('timeseries', () => {
    it('day 버킷이 아니면 빈 배열 반환', async () => {
      const result = await controller.timeseries('week', '30');
      expect(result).toEqual([]);
      expect(ledger.adminDailyTimeseries).not.toHaveBeenCalled();
    });

    it('days 기본값 30으로 service 호출', async () => {
      (ledger.adminDailyTimeseries as jest.Mock).mockResolvedValue([]);
      await controller.timeseries('day', undefined);
      expect(ledger.adminDailyTimeseries).toHaveBeenCalledWith(30);
    });

    it('days 범위 clamp: 0 → 1, 999 → 90', async () => {
      (ledger.adminDailyTimeseries as jest.Mock).mockResolvedValue([]);
      await controller.timeseries('day', '0');
      await controller.timeseries('day', '999');
      expect(ledger.adminDailyTimeseries).toHaveBeenNthCalledWith(1, 1);
      expect(ledger.adminDailyTimeseries).toHaveBeenNthCalledWith(2, 90);
    });

    it('service 반환값을 그대로 전달', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const key = today.toISOString().slice(0, 10);
      const data = [{ date: key, minted: '12000', burned: '3000' }];
      (ledger.adminDailyTimeseries as jest.Mock).mockResolvedValue(data);
      const result = await controller.timeseries('day', '7');
      expect(result).toEqual(data);
    });
  });

  describe('summary', () => {
    it('service 결과를 그대로 반환', async () => {
      const expected = { minted: '10000', burned: '3000', circulating: '7000' };
      (ledger.adminSummary as jest.Mock).mockResolvedValue(expected);
      const result = await controller.summary();
      expect(result).toEqual(expected);
    });
  });

  describe('list', () => {
    it('skip/take clamping + service 호출', async () => {
      (ledger.adminListTx as jest.Mock).mockResolvedValue({
        rows: [],
        total: 0,
      });
      const result = await controller.list(
        'user-1',
        'BET_WIN',
        undefined,
        undefined,
        '-5',
        '999',
      );
      expect(ledger.adminListTx).toHaveBeenCalledWith({
        userId: 'user-1',
        reason: 'BET_WIN',
        from: undefined,
        to: undefined,
        skip: 0,
        take: 200,
      });
      expect(result.skip).toBe(0);
      expect(result.take).toBe(200);
    });
  });
});
