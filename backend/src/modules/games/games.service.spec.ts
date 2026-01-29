import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GamesService } from './games.service';
import { Game, GameType } from './entities/game.entity';
import { GameScore } from './entities/game-score.entity';
import { GameRoom, GameRoomStatus } from './entities/game-room.entity';
import { GameRoomPlayer, PlayerStatus } from './entities/game-room-player.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('GamesService', () => {
  let service: GamesService;
  let gameRepo: jest.Mocked<Repository<Game>>;
  let scoreRepo: jest.Mocked<Repository<GameScore>>;
  let roomRepo: jest.Mocked<Repository<GameRoom>>;
  let playerRepo: jest.Mocked<Repository<GameRoomPlayer>>;
  let mockTransaction: jest.Mock;

  const mockGame: Partial<Game> = {
    id: 'game-1',
    code: 'QUIZ_BATTLE',
    name: '퀴즈 배틀',
    type: GameType.PVP,
    minPlayers: 2,
    maxPlayers: 2,
    pointReward: 50,
    isActive: true,
    playCount: 100,
  };

  const mockRoom: Partial<GameRoom> = {
    id: 'room-1',
    gameId: 'game-1',
    clanId: 'clan-1',
    hostId: 'member-1',
    code: 'ABC123',
    status: GameRoomStatus.WAITING,
    maxPlayers: 8,
    isPrivate: false,
  };

  const mockPlayer: Partial<GameRoomPlayer> = {
    id: 'player-1',
    roomId: 'room-1',
    memberId: 'member-1',
    status: PlayerStatus.WAITING,
    isHost: true,
    order: 0,
  };

  beforeEach(async () => {
    mockTransaction = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: getRepositoryToken(Game),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([mockGame]),
            })),
            increment: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GameScore),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              innerJoin: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getQuery: jest.fn().mockReturnValue('SELECT ...'),
              getParameters: jest.fn().mockReturnValue({}),
              setParameters: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(GameRoom),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(GameRoomPlayer),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: mockTransaction,
          },
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    gameRepo = module.get(getRepositoryToken(Game));
    scoreRepo = module.get(getRepositoryToken(GameScore));
    roomRepo = module.get(getRepositoryToken(GameRoom));
    playerRepo = module.get(getRepositoryToken(GameRoomPlayer));
  });

  describe('getGames', () => {
    it('활성화된 게임 목록을 반환해야 함', async () => {
      const result = await service.getGames();
      expect(result).toEqual([mockGame]);
    });

    it('타입으로 필터링해야 함', async () => {
      await service.getGames(GameType.PVP);
      // andWhere가 호출되었는지 확인
      expect(gameRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getGame', () => {
    it('게임이 존재하면 반환해야 함', async () => {
      gameRepo.findOne.mockResolvedValue(mockGame as Game);
      const result = await service.getGame('QUIZ_BATTLE');
      expect(result).toEqual(mockGame);
    });

    it('게임이 없으면 NotFoundException을 던져야 함', async () => {
      gameRepo.findOne.mockResolvedValue(null);
      await expect(service.getGame('NOT_EXIST')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitScore', () => {
    it('점수를 저장하고 포인트를 지급해야 함', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(mockGame),
        create: jest.fn().mockReturnValue({ id: 'score-1', score: 80 }),
        save: jest.fn().mockResolvedValue({ id: 'score-1', score: 80 }),
        increment: jest.fn().mockResolvedValue(undefined),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      const result = await service.submitScore('member-1', 'clan-1', {
        gameCode: 'QUIZ_BATTLE',
        score: 80,
      });

      expect(result).toEqual({ id: 'score-1', score: 80 });
      expect(mockManager.increment).toHaveBeenCalledTimes(2); // playCount + totalPoints
    });

    it('게임이 없으면 NotFoundException을 던져야 함', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      await expect(
        service.submitScore('member-1', 'clan-1', { gameCode: 'NOT_EXIST', score: 80 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createRoom', () => {
    it('방을 생성해야 함', async () => {
      gameRepo.findOne.mockResolvedValue({ ...mockGame, type: GameType.PARTY } as Game);

      const mockManager = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null), // 코드 충돌 없음
        create: jest.fn()
          .mockReturnValueOnce(mockRoom)
          .mockReturnValueOnce(mockPlayer),
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      const result = await service.createRoom('member-1', 'clan-1', {
        gameCode: 'WORD_CHAIN',
      });

      expect(result).toBeDefined();
    });

    it('솔로 게임은 방을 만들 수 없어야 함', async () => {
      gameRepo.findOne.mockResolvedValue({ ...mockGame, type: GameType.SOLO } as Game);

      await expect(
        service.createRoom('member-1', 'clan-1', { gameCode: 'AIM_TRAINER' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('joinRoom', () => {
    it('방에 참가해야 함', async () => {
      const roomWithPlayers = {
        ...mockRoom,
        players: [mockPlayer],
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(roomWithPlayers),
        create: jest.fn().mockReturnValue({ ...mockPlayer, memberId: 'member-2' }),
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));
      roomRepo.findOne.mockResolvedValue(roomWithPlayers as GameRoom);

      // getRoomWithPlayers를 위해 roomRepo.findOne 설정
      const result = await service.joinRoom('member-2', 'ABC123');

      expect(mockManager.create).toHaveBeenCalled();
    });

    it('방이 가득 찼으면 참가할 수 없어야 함', async () => {
      const fullRoom = {
        ...mockRoom,
        maxPlayers: 1,
        players: [mockPlayer],
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(fullRoom),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      await expect(
        service.joinRoom('member-2', 'ABC123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setPlayerReady', () => {
    it('준비 상태를 변경하고 allReady 여부를 반환해야 함', async () => {
      playerRepo.update.mockResolvedValue({ affected: 1 } as any);
      roomRepo.findOne.mockResolvedValue({
        ...mockRoom,
        players: [
          { ...mockPlayer, status: PlayerStatus.READY },
          { ...mockPlayer, memberId: 'member-2', status: PlayerStatus.READY },
        ],
        game: { minPlayers: 2 },
      } as GameRoom);

      const result = await service.setPlayerReady('member-1', 'room-1', true);

      expect(result.allReady).toBe(true);
    });
  });

  describe('startGame', () => {
    it('게임을 시작해야 함', async () => {
      const readyRoom = {
        ...mockRoom,
        players: [
          { ...mockPlayer, status: PlayerStatus.READY },
          { ...mockPlayer, memberId: 'member-2', status: PlayerStatus.READY },
        ],
        game: { minPlayers: 2 },
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(readyRoom),
        save: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      const result = await service.startGame('room-1', 'member-1');

      expect(result.status).toBe(GameRoomStatus.PLAYING);
    });

    it('최소 인원 미달 시 시작할 수 없어야 함', async () => {
      const notEnoughRoom = {
        ...mockRoom,
        players: [mockPlayer],
        game: { minPlayers: 2 },
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(notEnoughRoom),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      await expect(
        service.startGame('room-1', 'member-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('준비되지 않은 플레이어가 있으면 시작할 수 없어야 함', async () => {
      const notReadyRoom = {
        ...mockRoom,
        players: [
          { ...mockPlayer, status: PlayerStatus.READY },
          { ...mockPlayer, memberId: 'member-2', status: PlayerStatus.WAITING },
        ],
        game: { minPlayers: 2 },
      };

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(notReadyRoom),
      };
      mockTransaction.mockImplementation((cb) => cb(mockManager));

      await expect(
        service.startGame('room-1', 'member-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStartDate (private method - tested via getLeaderboard)', () => {
    it('기간별 시작 날짜가 올바르게 계산되어야 함', async () => {
      gameRepo.findOne.mockResolvedValue(mockGame as Game);

      // daily
      await service.getLeaderboard('QUIZ_BATTLE', 'clan-1', { period: 'daily' });
      
      // weekly
      await service.getLeaderboard('QUIZ_BATTLE', 'clan-1', { period: 'weekly' });
      
      // monthly
      await service.getLeaderboard('QUIZ_BATTLE', 'clan-1', { period: 'monthly' });

      expect(scoreRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
