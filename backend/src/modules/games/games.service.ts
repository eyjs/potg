import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Game, GameType } from './entities/game.entity';
import { GameScore } from './entities/game-score.entity';
import { GameRoom, GameRoomStatus } from './entities/game-room.entity';
import { GameRoomPlayer, PlayerStatus } from './entities/game-room-player.entity';
import { SubmitScoreDto, CreateRoomDto, UpdateRoomSettingsDto } from './dto/games.dto';
import { ClanMember } from '../clans/entities/clan-member.entity';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
    @InjectRepository(GameScore)
    private scoreRepo: Repository<GameScore>,
    @InjectRepository(GameRoom)
    private roomRepo: Repository<GameRoom>,
    @InjectRepository(GameRoomPlayer)
    private playerRepo: Repository<GameRoomPlayer>,
    private dataSource: DataSource,
  ) {}

  // ==================== 게임 목록 ====================

  async getGames(type?: GameType): Promise<Game[]> {
    const query = this.gameRepo.createQueryBuilder('game')
      .where('game.isActive = true')
      .orderBy('game.playCount', 'DESC');

    if (type) {
      query.andWhere('game.type = :type', { type });
    }

    return query.getMany();
  }

  async getGame(code: string): Promise<Game> {
    const game = await this.gameRepo.findOne({ where: { code, isActive: true } });
    if (!game) throw new NotFoundException('게임을 찾을 수 없습니다.');
    return game;
  }

  // ==================== 점수 & 리더보드 ====================

  async submitScore(memberId: string, clanId: string, dto: SubmitScoreDto): Promise<GameScore> {
    return this.dataSource.transaction(async (manager) => {
      const game = await manager.findOne(Game, { where: { code: dto.gameCode, isActive: true } });
      if (!game) throw new NotFoundException('게임을 찾을 수 없습니다.');

      const pointsEarned = this.calculatePoints(game, dto.score);

      // 점수 저장
      const score = manager.create(GameScore, {
        gameId: game.id,
        memberId,
        clanId,
        score: dto.score,
        time: dto.time,
        metadata: dto.metadata,
        pointsEarned,
      });
      await manager.save(score);

      // 플레이 횟수 증가
      await manager.increment(Game, { id: game.id }, 'playCount', 1);

      // 포인트 지급
      if (pointsEarned > 0) {
        await manager.increment(ClanMember, { id: memberId }, 'totalPoints', pointsEarned);
        
        // PointLog 기록 (테이블이 있다면)
        // await manager.save(PointLog, {
        //   userId: ???,
        //   clanId,
        //   amount: pointsEarned,
        //   reason: `게임 ${game.name} 플레이 보상`,
        // });
      }

      return score;
    });
  }

  async getLeaderboard(
    gameCode: string,
    clanId: string,
    options: { period?: 'all' | 'daily' | 'weekly' | 'monthly'; limit?: number; offset?: number } = {},
  ): Promise<{ rank: number; score: GameScore; member: { battleTag: string; avatarUrl: string | null } }[]> {
    const { period = 'all', limit = 100, offset = 0 } = options;
    const game = await this.getGame(gameCode);

    // 유저별 최고 점수만 조회 (서브쿼리 사용)
    const subQuery = this.scoreRepo.createQueryBuilder('s')
      .select('s.memberId', 'memberId')
      .addSelect('MAX(s.score)', 'maxScore')
      .where('s.gameId = :gameId', { gameId: game.id })
      .andWhere('s.clanId = :clanId', { clanId })
      .groupBy('s.memberId');

    // 기간 필터
    if (period !== 'all') {
      const startDate = this.getStartDate(period);
      subQuery.andWhere('s.createdAt >= :startDate', { startDate });
    }

    const query = this.scoreRepo.createQueryBuilder('score')
      .innerJoin(
        `(${subQuery.getQuery()})`,
        'best',
        'score.memberId = best.memberId AND score.score = best."maxScore"',
      )
      .setParameters(subQuery.getParameters())
      .leftJoinAndSelect('score.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('score.gameId = :gameId', { gameId: game.id })
      .andWhere('score.clanId = :clanId', { clanId })
      .orderBy('score.score', 'DESC')
      .addOrderBy('score.time', 'ASC')
      .skip(offset)
      .take(limit);

    if (period !== 'all') {
      const startDate = this.getStartDate(period);
      query.andWhere('score.createdAt >= :startDate', { startDate });
    }

    const scores = await query.getMany();

    return scores.map((score, idx) => ({
      rank: offset + idx + 1,
      score,
      member: {
        battleTag: score.member?.user?.battleTag || 'Unknown',
        avatarUrl: score.member?.user?.avatarUrl || null,
      },
    }));
  }

  async getMyBestScore(memberId: string, gameCode: string): Promise<GameScore | null> {
    const game = await this.getGame(gameCode);
    
    return this.scoreRepo.findOne({
      where: { gameId: game.id, memberId },
      order: { score: 'DESC' },
    });
  }

  // ==================== 방 관리 ====================

  async createRoom(memberId: string, clanId: string, dto: CreateRoomDto): Promise<GameRoom> {
    const game = await this.getGame(dto.gameCode);

    if (game.type === GameType.SOLO) {
      throw new BadRequestException('솔로 게임은 방을 만들 수 없습니다.');
    }

    return this.dataSource.transaction(async (manager) => {
      // 고유 코드 생성 (충돌 시 재시도)
      let code: string;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        code = this.generateRoomCode();
        const existing = await manager.findOne(GameRoom, { where: { code } });
        if (!existing) break;
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new BadRequestException('방 코드 생성에 실패했습니다. 다시 시도해주세요.');
      }

      const room = manager.create(GameRoom, {
        gameId: game.id,
        clanId,
        hostId: memberId,
        code: code!,
        maxPlayers: dto.maxPlayers || game.maxPlayers,
        isPrivate: dto.isPrivate || false,
        settings: dto.settings,
      });
      await manager.save(room);

      // 방장을 플레이어로 추가
      const player = manager.create(GameRoomPlayer, {
        roomId: room.id,
        memberId,
        isHost: true,
        order: 0,
        status: PlayerStatus.WAITING,
      });
      await manager.save(player);

      return room;
    });
  }

  async joinRoom(memberId: string, roomCode: string): Promise<GameRoom> {
    return this.dataSource.transaction(async (manager) => {
      const room = await manager.findOne(GameRoom, {
        where: { code: roomCode, status: GameRoomStatus.WAITING },
        relations: ['players'],
        lock: { mode: 'pessimistic_write' }, // 동시 참가 방지
      });

      if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

      // 이미 참가 중인지 확인
      const existing = room.players.find((p) => p.memberId === memberId);
      if (existing) {
        return this.getRoomWithPlayers(room.id);
      }

      // 인원 확인
      if (room.players.length >= room.maxPlayers) {
        throw new BadRequestException('방이 가득 찼습니다.');
      }

      // 참가
      const player = manager.create(GameRoomPlayer, {
        roomId: room.id,
        memberId,
        order: room.players.length,
        status: PlayerStatus.WAITING,
      });
      await manager.save(player);

      return this.getRoomWithPlayers(room.id);
    });
  }

  async leaveRoom(memberId: string, roomId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const room = await manager.findOne(GameRoom, {
        where: { id: roomId },
        relations: ['players'],
      });

      if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

      const leavingPlayer = room.players.find((p) => p.memberId === memberId);
      if (!leavingPlayer) return;

      // 방장이 나가면 다음 사람에게 위임 또는 방 삭제
      if (room.hostId === memberId) {
        const others = room.players
          .filter((p) => p.memberId !== memberId)
          .sort((a, b) => a.order - b.order);

        if (others.length > 0) {
          const newHost = others[0];
          room.hostId = newHost.memberId;
          newHost.isHost = true;
          await manager.save(room);
          await manager.save(newHost);
        } else {
          await manager.delete(GameRoom, roomId);
          return;
        }
      }

      // 플레이어 삭제
      await manager.delete(GameRoomPlayer, { roomId, memberId });

      // 남은 플레이어 순서 재정렬
      const remainingPlayers = room.players
        .filter((p) => p.memberId !== memberId)
        .sort((a, b) => a.order - b.order);

      for (let i = 0; i < remainingPlayers.length; i++) {
        if (remainingPlayers[i].order !== i) {
          remainingPlayers[i].order = i;
          await manager.save(remainingPlayers[i]);
        }
      }
    });
  }

  async updateRoomSettings(roomId: string, hostId: string, dto: UpdateRoomSettingsDto): Promise<GameRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, hostId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없거나 권한이 없습니다.');

    if (dto.maxPlayers !== undefined) room.maxPlayers = dto.maxPlayers;
    if (dto.settings) room.settings = { ...room.settings, ...dto.settings };
    if (dto.totalRounds !== undefined) room.totalRounds = dto.totalRounds;

    return this.roomRepo.save(room);
  }

  async setPlayerReady(memberId: string, roomId: string, ready: boolean): Promise<{ allReady: boolean }> {
    await this.playerRepo.update(
      { roomId, memberId },
      { status: ready ? PlayerStatus.READY : PlayerStatus.WAITING },
    );

    // 모든 플레이어가 준비되었는지 확인
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['players', 'game'],
    });

    if (!room) return { allReady: false };

    const allReady = room.players.length >= room.game.minPlayers &&
      room.players.every((p) => p.status === PlayerStatus.READY);

    return { allReady };
  }

  async startGame(roomId: string, hostId: string): Promise<GameRoom> {
    return this.dataSource.transaction(async (manager) => {
      const room = await manager.findOne(GameRoom, {
        where: { id: roomId, hostId, status: GameRoomStatus.WAITING },
        relations: ['players', 'game'],
      });

      if (!room) throw new NotFoundException('방을 찾을 수 없거나 권한이 없습니다.');

      // 최소 인원 확인
      if (room.players.length < room.game.minPlayers) {
        throw new BadRequestException(`최소 ${room.game.minPlayers}명이 필요합니다.`);
      }

      // 모든 플레이어 준비 확인
      const notReady = room.players.filter((p) => p.status !== PlayerStatus.READY);
      if (notReady.length > 0) {
        throw new BadRequestException('모든 플레이어가 준비되지 않았습니다.');
      }

      // 게임 시작
      room.status = GameRoomStatus.PLAYING;
      room.currentRound = 1;
      await manager.save(room);

      // 모든 플레이어 상태 변경
      await manager.update(
        GameRoomPlayer,
        { roomId },
        { status: PlayerStatus.PLAYING },
      );

      return room;
    });
  }

  async getRoom(roomId: string): Promise<GameRoom> {
    return this.getRoomWithPlayers(roomId);
  }

  async getPublicRooms(clanId: string, gameCode?: string): Promise<GameRoom[]> {
    const query = this.roomRepo.createQueryBuilder('room')
      .leftJoinAndSelect('room.players', 'players')
      .leftJoinAndSelect('room.game', 'game')
      .where('room.clanId = :clanId', { clanId })
      .andWhere('room.isPrivate = false')
      .andWhere('room.status = :status', { status: GameRoomStatus.WAITING })
      .orderBy('room.createdAt', 'DESC');

    if (gameCode) {
      query.andWhere('game.code = :gameCode', { gameCode });
    }

    return query.getMany();
  }

  // ==================== 헬퍼 ====================

  private async getRoomWithPlayers(roomId: string): Promise<GameRoom> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['game', 'players', 'players.member', 'players.member.user'],
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');
    return room;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private getStartDate(period: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case 'monthly':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
    }
  }

  private calculatePoints(game: Game, score: number): number {
    const basePoints = game.pointReward || 10;
    return Math.floor(basePoints * (score / 100));
  }
}
