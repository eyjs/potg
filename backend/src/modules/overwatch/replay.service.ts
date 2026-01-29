import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, DataSource } from 'typeorm';
import { Replay, ReplayResult } from './entities/replay.entity';
import { CreateReplayDto, UpdateReplayDto, GetReplaysQueryDto } from './dto/overwatch.dto';

@Injectable()
export class ReplayService {
  constructor(
    @InjectRepository(Replay)
    private readonly replayRepo: Repository<Replay>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 리플레이 생성
   */
  async create(userId: string, clanId: string, dto: CreateReplayDto): Promise<Replay> {
    const replay = this.replayRepo.create({
      ...dto,
      userId,
      clanId,
      code: dto.code.toUpperCase(),
    });
    return this.replayRepo.save(replay);
  }

  /**
   * 클랜 리플레이 목록 조회
   */
  async findByClan(clanId: string, query: GetReplaysQueryDto): Promise<{ data: Replay[]; total: number }> {
    const where: FindOptionsWhere<Replay> = { clanId };

    if (query.mapName) {
      where.mapName = query.mapName;
    }
    if (query.result) {
      where.result = query.result;
    }
    if (query.search) {
      // Escape SQL wildcards to prevent injection
      const escapedSearch = query.search.toUpperCase().replace(/[%_]/g, '\\$&');
      where.code = Like(`%${escapedSearch}%`);
    }

    const [data, total] = await this.replayRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: query.limit ?? 20,
      skip: query.offset ?? 0,
    });

    // Filter by tag if specified (simple-array doesn't support direct query)
    let filteredData = data;
    if (query.tag) {
      filteredData = data.filter((r) => r.tags?.includes(query.tag!));
    }

    return { data: filteredData, total };
  }

  /**
   * 리플레이 상세 조회
   */
  async findOne(id: string): Promise<Replay> {
    const replay = await this.replayRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!replay) {
      throw new NotFoundException('리플레이를 찾을 수 없습니다.');
    }

    // Increment view count
    await this.replayRepo.increment({ id }, 'views', 1);

    return replay;
  }

  /**
   * 리플레이 수정
   */
  async update(id: string, userId: string, dto: UpdateReplayDto): Promise<Replay> {
    const replay = await this.replayRepo.findOne({ where: { id } });

    if (!replay) {
      throw new NotFoundException('리플레이를 찾을 수 없습니다.');
    }

    if (replay.userId !== userId) {
      throw new ForbiddenException('본인의 리플레이만 수정할 수 있습니다.');
    }

    Object.assign(replay, dto);
    return this.replayRepo.save(replay);
  }

  /**
   * 리플레이 삭제
   */
  async remove(id: string, userId: string): Promise<void> {
    const replay = await this.replayRepo.findOne({ where: { id } });

    if (!replay) {
      throw new NotFoundException('리플레이를 찾을 수 없습니다.');
    }

    if (replay.userId !== userId) {
      throw new ForbiddenException('본인의 리플레이만 삭제할 수 있습니다.');
    }

    await this.replayRepo.remove(replay);
  }

  /**
   * 좋아요 토글
   */
  async toggleLike(id: string): Promise<{ likes: number }> {
    return this.dataSource.transaction(async (manager) => {
      const replayRepo = manager.getRepository(Replay);
      const replay = await replayRepo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });

      if (!replay) {
        throw new NotFoundException('리플레이를 찾을 수 없습니다.');
      }

      // Simple increment for now (proper like system would use a separate table)
      replay.likes += 1;
      await replayRepo.save(replay);

      return { likes: replay.likes };
    });
  }

  /**
   * 내 리플레이 목록 조회
   */
  async findByUser(userId: string): Promise<Replay[]> {
    return this.replayRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 클랜 통계
   */
  async getClanStats(clanId: string): Promise<{
    total: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    topMaps: { mapName: string; count: number }[];
    topHeroes: { hero: string; count: number }[];
  }> {
    const replays = await this.replayRepo.find({ where: { clanId } });

    const total = replays.length;
    const wins = replays.filter((r) => r.result === ReplayResult.WIN).length;
    const losses = replays.filter((r) => r.result === ReplayResult.LOSS).length;
    const draws = replays.filter((r) => r.result === ReplayResult.DRAW).length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    // Count maps
    const mapCounts = new Map<string, number>();
    replays.forEach((r) => {
      mapCounts.set(r.mapName, (mapCounts.get(r.mapName) || 0) + 1);
    });
    const topMaps = Array.from(mapCounts.entries())
      .map(([mapName, count]) => ({ mapName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count heroes
    const heroCounts = new Map<string, number>();
    replays.forEach((r) => {
      r.heroes?.forEach((hero) => {
        heroCounts.set(hero, (heroCounts.get(hero) || 0) + 1);
      });
    });
    const topHeroes = Array.from(heroCounts.entries())
      .map(([hero, count]) => ({ hero, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { total, wins, losses, draws, winRate, topMaps, topHeroes };
  }
}
