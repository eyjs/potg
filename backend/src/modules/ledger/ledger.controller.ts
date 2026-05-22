import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { PointTx } from './entities/point-tx.entity';
import { SINK_ACCOUNT_ID } from './ledger.constants';

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
  async list(
    @Query('userId') userId?: string,
    @Query('reason') reason?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skipRaw?: string,
    @Query('take') takeRaw?: string,
  ) {
    const skip = Math.max(0, parseInt(skipRaw ?? '0', 10) || 0);
    const take = Math.min(200, Math.max(1, parseInt(takeRaw ?? '50', 10) || 50));

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
   * 경제 요약: 총발행 / 총소각 / 유통량.
   * 발행 = from = SINK_ACCOUNT_ID
   * 소각 = to   = SINK_ACCOUNT_ID
   * 유통량 = 발행 - 소각
   */
  @Get('summary')
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
