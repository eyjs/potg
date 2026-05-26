import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { LedgerService } from './ledger.service';

@ApiTags('admin-ledger')
@ApiCookieAuth('access_token')
@Controller('admin/ledger')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

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
    const { rows, total } = await this.ledger.adminListTx({
      userId,
      reason,
      from,
      to,
      skip,
      take,
    });
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
    return this.ledger.adminDailyTimeseries(days);
  }

  /**
   * 경제 요약: 총발행 / 총소각 / 유통량.
   */
  @Get('summary')
  @ApiOperation({ summary: '경제 요약 (총발행/총소각/유통량)' })
  summary() {
    return this.ledger.adminSummary();
  }
}
