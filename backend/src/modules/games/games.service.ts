import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameType } from './entities/game.entity';
import { GameScore } from './entities/game-score.entity';
import { GameRoom, GameRoomStatus } from './entities/game-room.entity';
import { GameRoomPlayer, PlayerStatus } from './entities/game-room-player.entity';
import { SubmitScoreDto, CreateRoomDto, UpdateRoomSettingsDto } from './dto/games.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gameRepo: Repository<Game>,
    @InjectRepository(GameScore)
    private scoreRepo: Repository<GameScore>,
    @InjectRepository(GameRoom)
    private roomRepo: Repository<GameRoom>,
    @InjectRepository(GameRoomPlayer)
    private playerRepo: Repository<GameRoomPlayer>,
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
    const game = await this.getGame(dto.gameCode);

    // 점수 저장
    const score = this.scoreRepo.create({
      gameId: game.id,
      memberId,
      clanId,
      score: dto.score,
      time: dto.time,
      metadata: dto.metadata,
      pointsEarned: this.calculatePoints(game, dto.score),
    });
    await this.scoreRepo.save(score);

    // 플레이 횟수 증가
    await this.gameRepo.increment({ id: game.id }, 'playCount', 1);

    // TODO: 포인트 지급 (PointLog)

    return score;
  }

  async getLeaderboard(
    gameCode: string,
    clanId: string,
    options: { period?: 'all' | 'daily' | 'weekly' | 'monthly'; limit?: number } = {},
  ): Promise<{ rank: number; score: GameScore; member: { battleTag: string; avatarUrl: string | null } }[]> {
    const { period = 'all', limit = 100 } = options;
    const game = await this.getGame(gameCode);

    const query = this.scoreRepo.createQueryBuilder('score')
      .leftJoinAndSelect('score.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('score.gameId = :gameId', { gameId: game.id })
      .andWhere('score.clanId = :clanId', { clanId })
      .orderBy('score.score', 'DESC')
      .addOrderBy('score.time', 'ASC') // 동점 시 시간 빠른 순
      .take(limit);

    // 기간 필터
    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'weekly':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'monthly':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      query.andWhere('score.createdAt >= :startDate', { startDate });
    }

    const scores = await query.getMany();

    return scores.map((score, idx) => ({
      rank: idx + 1,
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

    // 고유 코드 생성
    const code = this.generateRoomCode();

    const room = this.roomRepo.create({
      gameId: game.id,
      clanId,
      hostId: memberId,
      code,
      maxPlayers: dto.maxPlayers || game.maxPlayers,
      isPrivate: dto.isPrivate || false,
      settings: dto.settings,
    });
    await this.roomRepo.save(room);

    // 방장을 플레이어로 추가
    await this.playerRepo.save({
      roomId: room.id,
      memberId,
      isHost: true,
      order: 0,
    });

    return room;
  }

  async joinRoom(memberId: string, roomCode: string): Promise<GameRoom> {
    const room = await this.roomRepo.findOne({
      where: { code: roomCode, status: GameRoomStatus.WAITING },
      relations: ['players'],
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    // 이미 참가 중인지 확인
    const existing = room.players.find((p) => p.memberId === memberId);
    if (existing) return room;

    // 인원 확인
    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException('방이 가득 찼습니다.');
    }

    // 참가
    await this.playerRepo.save({
      roomId: room.id,
      memberId,
      order: room.players.length,
    });

    return this.getRoomWithPlayers(room.id);
  }

  async leaveRoom(memberId: string, roomId: string): Promise<void> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['players'],
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    // 방장이 나가면 다음 사람에게 위임 또는 방 삭제
    if (room.hostId === memberId) {
      const others = room.players.filter((p) => p.memberId !== memberId);
      if (others.length > 0) {
        room.hostId = others[0].memberId;
        await this.playerRepo.update(
          { roomId, memberId: others[0].memberId },
          { isHost: true },
        );
        await this.roomRepo.save(room);
      } else {
        await this.roomRepo.delete(roomId);
        return;
      }
    }

    await this.playerRepo.delete({ roomId, memberId });
  }

  async updateRoomSettings(roomId: string, hostId: string, dto: UpdateRoomSettingsDto): Promise<GameRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId, hostId } });
    if (!room) throw new NotFoundException('방을 찾을 수 없거나 권한이 없습니다.');

    if (dto.maxPlayers) room.maxPlayers = dto.maxPlayers;
    if (dto.settings) room.settings = { ...room.settings, ...dto.settings };
    if (dto.totalRounds) room.totalRounds = dto.totalRounds;

    return this.roomRepo.save(room);
  }

  async setPlayerReady(memberId: string, roomId: string, ready: boolean): Promise<void> {
    await this.playerRepo.update(
      { roomId, memberId },
      { status: ready ? PlayerStatus.READY : PlayerStatus.WAITING },
    );
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

  private calculatePoints(game: Game, score: number): number {
    // 점수 기반 포인트 계산 (게임별 로직)
    const basePoints = game.pointReward || 10;
    return Math.floor(basePoints * (score / 100));
  }
}
