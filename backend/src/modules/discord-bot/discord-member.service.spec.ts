import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DiscordMemberService } from './discord-member.service';
import { User } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import { SystemConfigService } from '../system-config/system-config.service';

describe('DiscordMemberService', () => {
  let service: DiscordMemberService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'findOneOrFail' | 'save' | 'create'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'mint'>>;
  let systemConfig: jest.Mocked<Pick<SystemConfigService, 'getNumber'>>;
  let dataSource: { transaction: jest.Mock };

  const fakeManager = {
    getRepository: jest.fn(),
  } as unknown as EntityManager;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as typeof userRepo;
    ledger = { mint: jest.fn() } as unknown as typeof ledger;
    systemConfig = { getNumber: jest.fn() } as unknown as typeof systemConfig;
    dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
        cb(fakeManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordMemberService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: LedgerService, useValue: ledger },
        { provide: SystemConfigService, useValue: systemConfig },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(DiscordMemberService);
  });

  it('기존 사용자를 그대로 반환하며 mint 호출 없음', async () => {
    const existing = {
      id: 'u-1',
      username: 'foo',
      nickname: 'foo',
      discordId: 'discord-1',
      avatarUrl: 'cached',
      pointsBalance: '500',
    } as User;
    userRepo.findOne.mockResolvedValueOnce(existing);

    const result = await service.findOrCreate({
      discordId: 'discord-1',
      username: 'foo',
      avatarUrl: 'cached',
    });

    expect(result.isNew).toBe(false);
    expect(result.user).toBe(existing);
    expect(ledger.mint).not.toHaveBeenCalled();
  });

  it('신규 사용자 생성 시 SEED mint 1회 호출', async () => {
    userRepo.findOne.mockResolvedValueOnce(null); // findByDiscordId
    userRepo.findOne.mockResolvedValueOnce(null); // ensureUniqueUsername 조회

    const txUserRepo = {
      create: jest.fn((data: Partial<User>) => ({ ...data })),
      save: jest.fn((data: Partial<User>) =>
        Promise.resolve({ ...data, id: 'new-1' } as User),
      ),
      findOne: jest.fn().mockResolvedValue(null),
    };
    (fakeManager.getRepository as jest.Mock).mockReturnValue(txUserRepo);

    systemConfig.getNumber.mockResolvedValueOnce(1000);
    userRepo.findOneOrFail.mockResolvedValueOnce({
      id: 'new-1',
      pointsBalance: '1000',
    } as User);

    const result = await service.findOrCreate({
      discordId: 'discord-new',
      username: 'newbie',
      avatarUrl: null,
    });

    expect(result.isNew).toBe(true);
    expect(result.user.id).toBe('new-1');
    expect(ledger.mint).toHaveBeenCalledTimes(1);
    expect(ledger.mint).toHaveBeenCalledWith(
      'new-1',
      1000n,
      'SEED',
      expect.objectContaining({ refType: 'User', refId: 'new-1' }),
    );
  });

  it('seed amount 0이면 mint 호출 안 함', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    userRepo.findOne.mockResolvedValueOnce(null);

    const txUserRepo = {
      create: jest.fn((d: Partial<User>) => d),
      save: jest.fn((d: Partial<User>) =>
        Promise.resolve({ ...d, id: 'new-2' } as User),
      ),
      findOne: jest.fn().mockResolvedValue(null),
    };
    (fakeManager.getRepository as jest.Mock).mockReturnValue(txUserRepo);

    systemConfig.getNumber.mockResolvedValueOnce(0);
    userRepo.findOneOrFail.mockResolvedValueOnce({ id: 'new-2' } as User);

    await service.findOrCreate({
      discordId: 'discord-zero',
      username: 'zero',
    });

    expect(ledger.mint).not.toHaveBeenCalled();
  });
});
