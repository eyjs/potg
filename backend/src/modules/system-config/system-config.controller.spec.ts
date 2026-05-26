import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';

describe('SystemConfigController', () => {
  let controller: SystemConfigController;
  let service: {
    listAll: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      listAll: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigController],
      providers: [{ provide: SystemConfigService, useValue: service }],
    }).compile();

    controller = module.get(SystemConfigController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('service.listAll() 결과 그대로 반환', async () => {
      const rows = [
        { key: 'A', value: '1' },
        { key: 'B', value: '2' },
      ];
      service.listAll.mockResolvedValue(rows);

      const result = await controller.list();

      expect(service.listAll).toHaveBeenCalled();
      expect(result).toEqual(rows);
    });
  });

  describe('get', () => {
    it('service.get(key) 결과를 { key, value } 형태로 반환', async () => {
      service.get.mockResolvedValue('1000');

      const result = await controller.get('SEED_AMOUNT');

      expect(service.get).toHaveBeenCalledWith('SEED_AMOUNT');
      expect(result).toEqual({ key: 'SEED_AMOUNT', value: '1000' });
    });

    it('service에서 throw하면 그대로 전파', async () => {
      service.get.mockRejectedValue(new Error('not found'));

      await expect(controller.get('UNKNOWN')).rejects.toThrow('not found');
    });
  });

  describe('update', () => {
    it('service.set(key, value, description)로 위임', async () => {
      const updated = { key: 'RAKE_BPS', value: '600', description: 'd' };
      service.set.mockResolvedValue(updated);

      const result = await controller.update('RAKE_BPS', {
        value: '600',
        description: 'd',
      });

      expect(service.set).toHaveBeenCalledWith('RAKE_BPS', '600', 'd');
      expect(result).toBe(updated);
    });

    it('description 없이도 위임 가능', async () => {
      service.set.mockResolvedValue({});

      await controller.update('K', { value: 'v' });

      expect(service.set).toHaveBeenCalledWith('K', 'v', undefined);
    });
  });
});
