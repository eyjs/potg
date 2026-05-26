import { Test, TestingModule } from '@nestjs/testing';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';

describe('MatchController', () => {
  let controller: MatchController;
  let service: {
    findAll: jest.Mock;
    findOneWithTeams: jest.Mock;
    create: jest.Mock;
    createTeam: jest.Mock;
    openBetting: jest.Mock;
    lockMatch: jest.Mock;
    settleMatch: jest.Mock;
    cancelMatch: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOneWithTeams: jest.fn(),
      create: jest.fn(),
      createTeam: jest.fn(),
      openBetting: jest.fn(),
      lockMatch: jest.fn(),
      settleMatch: jest.fn(),
      cancelMatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchController],
      providers: [{ provide: MatchService, useValue: service }],
    }).compile();

    controller = module.get(MatchController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('service.findAll() 결과 그대로 반환', () => {
      const matches = [{ id: 'm1' }];
      service.findAll.mockResolvedValue(matches);

      const result = controller.list();

      expect(service.findAll).toHaveBeenCalled();
      return expect(result).resolves.toBe(matches);
    });
  });

  describe('detail', () => {
    it('service.findOneWithTeams(id) 위임', () => {
      const detail = { id: 'm1', teams: [] };
      service.findOneWithTeams.mockResolvedValue(detail);

      const result = controller.detail('m1');

      expect(service.findOneWithTeams).toHaveBeenCalledWith('m1');
      return expect(result).resolves.toBe(detail);
    });
  });

  describe('create', () => {
    it('scheduledAt이 ISO 문자열이면 Date로 변환해 위임', () => {
      const created = { id: 'm1' };
      service.create.mockResolvedValue(created);
      const iso = '2026-06-01T10:00:00Z';

      const result = controller.create({
        title: '테스트 내전',
        scheduledAt: iso,
        description: '설명',
      });

      expect(service.create).toHaveBeenCalledWith({
        title: '테스트 내전',
        scheduledAt: new Date(iso),
        description: '설명',
      });
      return expect(result).resolves.toBe(created);
    });

    it('scheduledAt/description이 없으면 null로 위임', () => {
      service.create.mockResolvedValue({});

      controller.create({ title: '제목만' });

      expect(service.create).toHaveBeenCalledWith({
        title: '제목만',
        scheduledAt: null,
        description: null,
      });
    });
  });

  describe('createTeam', () => {
    it('id + name + captainId를 service에 위임', () => {
      service.createTeam.mockResolvedValue({ id: 't1' });

      controller.createTeam('m1', { name: '팀A', captainId: 'cap-1' });

      expect(service.createTeam).toHaveBeenCalledWith('m1', '팀A', 'cap-1');
    });

    it('captainId optional', () => {
      service.createTeam.mockResolvedValue({});

      controller.createTeam('m1', { name: '팀B' });

      expect(service.createTeam).toHaveBeenCalledWith('m1', '팀B', undefined);
    });
  });

  describe('상태 전이 endpoint', () => {
    it('openBetting → service.openBetting(id)', () => {
      service.openBetting.mockResolvedValue({});
      controller.openBetting('m1');
      expect(service.openBetting).toHaveBeenCalledWith('m1');
    });

    it('lock → service.lockMatch(id)', () => {
      service.lockMatch.mockResolvedValue({});
      controller.lock('m1');
      expect(service.lockMatch).toHaveBeenCalledWith('m1');
    });

    it('cancel → service.cancelMatch(id)', () => {
      service.cancelMatch.mockResolvedValue({});
      controller.cancel('m1');
      expect(service.cancelMatch).toHaveBeenCalledWith('m1');
    });
  });

  describe('settle', () => {
    it('winnerTeamId + placements를 service에 위임', () => {
      service.settleMatch.mockResolvedValue({});
      const placements = { 'team-1': 1, 'team-2': 2 };

      controller.settle('m1', {
        winnerTeamId: 'team-1',
        placements,
      });

      expect(service.settleMatch).toHaveBeenCalledWith(
        'm1',
        'team-1',
        placements,
      );
    });

    it('placements 생략 가능', () => {
      service.settleMatch.mockResolvedValue({});

      controller.settle('m1', { winnerTeamId: 'team-1' });

      expect(service.settleMatch).toHaveBeenCalledWith(
        'm1',
        'team-1',
        undefined,
      );
    });
  });
});
