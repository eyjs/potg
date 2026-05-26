import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { PointTx } from './entities/point-tx.entity';
import { SINK_ACCOUNT_ID } from './ledger.constants';

@ApiTags('admin-ledger')
@ApiCookieAuth('access_token')
@Controller('admin/ledger')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class LedgerController {
  constructor(
    @InjectRepository(PointTx)
    private readonly txRepo: Repository<PointTx>,
  ) {}

  /**
   * PointTx 페이징 조회.
   * filter: userId(from|to 어느쪽이든), reason, from/to 일자.
   */
  @Get()
  @ApiOperation({ summary: 'PointTx 페이징 조회 (userId/reason/from/to 필터)' })
  async list(
    @Query('userId') userId?: string,
    @Query('reason') reason?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skipRaw?: string,
    @Query('take') takeRaw?: string,
  ) {
    const skip = Math.max(0, parseInt(skipRaw ?? '0', 10) || 0);
    const take = Math.min(
      200,
      Math.max(1, parseInt(takeRaw ?? '50', 10) || 50),
    );

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .orderBy('tx.created_at', 'DESC')
      .skip(skip)
      .take(take);

    if (userId) {
      qb.andWhere('(tx.from_account = :uid OR tx.to_account = :uid)', {
        uid: userId,
      });
    }
    if (reason) {
      qb.andWhere('tx.reason = :reason', { reason });
    }
    if (from) {
      qb.andWhere('tx.created_at >= :from', { from: new Date(from) });
    }
    if (to) {
      qb.andWhere('tx.created_at < :to', { to: new Date(to) });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { total, skip, take, rows };
  }

  /**
   * 발행/소각 일별 시계열.
   * - bucket=day 만 지원 (확장 여지)
   * - days 1~90 clamp, 기본 30
   * - 0건 일자도 0으로 채워서 반환 (date는 YYYY-MM-DD, UTC 기준)
   */
  @Get('timeseries')
  @ApiOperation({ summary: '발행/소각 일별 시계열 (대시보드 차트용)' })
  async timeseries(
    @Query('bucket') bucket?: string,
    @Query('days') daysRaw?: string,
  ): Promise<Array<{ date: string; minted: string; burned: string }>> {
    if (bucket && bucket !== 'day') {
      return [];
    }
    const parsed = parseInt(daysRaw ?? '', 10);
    const days = Math.min(
      90,
      Math.max(1, Number.isFinite(parsed) ? parsed : 30),
    );
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await this.txRepo
      .createQueryBuilder('tx')
      .select(
        `to_char(date_trunc('day', tx.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN tx.from_account = :sink THEN tx.amount ELSE 0 END), 0)`,
        'minted',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN tx.to_account = :sink THEN tx.amount ELSE 0 END), 0)`,
        'burned',
      )
      .where('tx.created_at >= :since', { since })
      .setParameter('sink', SINK_ACCOUNT_ID)
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; minted: string; burned: string }>();

    const byDate = new Map(rows.map((r) => [r.date, r]));
    const result: Array<{ date: string; minted: string; burned: string }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push(byDate.get(key) ?? { date: key, minted: '0', burned: '0' });
    }
    return result;
  }

  /**
   * 경제 요약: 총발행 / 총소각 / 유통량.
   * 발행 = from = SINK_ACCOUNT_ID
   * 소각 = to   = SINK_ACCOUNT_ID
   * 유통량 = 발행 - 소각
   */
  @Get('summary')
  @ApiOperation({ summary: '경제 요약 (총발행/총소각/유통량)' })
  async summary() {
    const mintedRow = await this.txRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'sum')
      .where('tx.from_account = :sink', { sink: SINK_ACCOUNT_ID })
      .getRawOne<{ sum: string }>();
    const burnedRow = await this.txRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'sum')
      .where('tx.to_account = :sink', { sink: SINK_ACCOUNT_ID })
      .getRawOne<{ sum: string }>();
    const minted = BigInt(mintedRow?.sum ?? '0');
    const burned = BigInt(burnedRow?.sum ?? '0');
    const circulating = minted - burned;
    return {
      minted: minted.toString(),
      burned: burned.toString(),
      circulating: circulating.toString(),
    };
  }
}
