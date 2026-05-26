import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfig } from './entities/system-config.entity';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: getRepositoryToken(SystemConfig), useValue: repo },
      ],
    }).compile();

    service = module.get(SystemConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('get', () => {
    it('row가 존재하면 value를 반환한다', async () => {
      repo.findOne.mockResolvedValue({ key: 'SEED_AMOUNT', value: '1000' });

      const result = await service.get('SEED_AMOUNT');

      expect(result).toBe('1000');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { key: 'SEED_AMOUNT' },
      });
    });

    it('row가 없고 defaultValue가 있으면 defaultValue 반환', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.get('UNKNOWN_KEY', 'fallback');

      expect(result).toBe('fallback');
    });

    it('row가 없고 defaultValue도 없으면 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.get('UNKNOWN_KEY')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('value가 빈 문자열이어도 그대로 반환 (defaultValue로 폴백하지 않음)', async () => {
      repo.findOne.mockResolvedValue({ key: 'EMPTY', value: '' });

      const result = await service.get('EMPTY', 'fallback');

      expect(result).toBe('');
    });
  });

  describe('getNumber', () => {
    it('숫자 문자열을 Number로 파싱한다', async () => {
      repo.findOne.mockResolvedValue({ key: 'RAKE_BPS', value: '500' });

      const result = await service.getNumber('RAKE_BPS');

      expect(result).toBe(500);
    });

    it('row가 없으면 defaultValue를 사용한다', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getNumber('UNKNOWN', 42);

      expect(result).toBe(42);
    });

    it('값이 숫자로 파싱 불가하면 throw', async () => {
      repo.findOne.mockResolvedValue({ key: 'BROKEN', value: 'not-a-number' });

      await expect(service.getNumber('BROKEN')).rejects.toThrow(
        /not numeric/i,
      );
    });

    it('row도 없고 defaultValue도 없으면 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getNumber('UNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('set', () => {
    it('기존 row가 있으면 value/description을 업데이트한다', async () => {
      const existing = {
        key: 'SEED_AMOUNT',
        value: '1000',
        description: 'old',
      };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity: SystemConfig) =>
        Promise.resolve(entity),
      );

      const result = await service.set('SEED_AMOUNT', '2000', 'new desc');

      expect(result.value).toBe('2000');
      expect(result.description).toBe('new desc');
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(existing);
    });

    it('description이 undefined면 기존 description 유지', async () => {
      const existing = {
        key: 'SEED_AMOUNT',
        value: '1000',
        description: 'keep me',
      };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity: SystemConfig) =>
        Promise.resolve(entity),
      );

      const result = await service.set('SEED_AMOUNT', '2000');

      expect(result.description).toBe('keep me');
    });

    it('row가 없으면 새로 create + save', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = {
        key: 'NEW_KEY',
        value: 'v',
        description: 'd',
      };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.set('NEW_KEY', 'v', 'd');

      expect(repo.create).toHaveBeenCalledWith({
        key: 'NEW_KEY',
        value: 'v',
        description: 'd',
      });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('description이 없으면 null로 create', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((entity: SystemConfig) => entity);
      repo.save.mockImplementation((entity: SystemConfig) =>
        Promise.resolve(entity),
      );

      await service.set('NEW_KEY', 'v');

      expect(repo.create).toHaveBeenCalledWith({
        key: 'NEW_KEY',
        value: 'v',
        description: null,
      });
    });
  });
});
